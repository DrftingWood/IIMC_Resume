/**
 * Dump a resume PDF to anonymised PdfLine[] JSON for use as a test fixture.
 * Usage: node scripts/make-fixture.mjs <input.pdf> <out.json> <FakeName> <MBA/9999/63>
 *
 * Safety: before writing anything, this script self-checks the scrub and
 * exits non-zero (without writing the output file) if it finds evidence a
 * real identifier survived. Do not rely on a human remembering to grep the
 * output afterward — that is exactly how a real name leaked once already.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const [input, out, fakeName, fakeId] = process.argv.slice(2);
if (!input || !out || !fakeName || !fakeId) {
  console.error('usage: node scripts/make-fixture.mjs <in.pdf> <out.json> <FakeName> <MBA/9999/63>');
  process.exit(1);
}

function fail(reason) {
  console.error(`LEAK DETECTED — refusing to write ${out}\n  ${reason}`);
  process.exit(1);
}

const pdf = await pdfjs.getDocument({
  data: new Uint8Array(await readFile(input)),
  useSystemFonts: true,
}).promise;

const items = [];
for (let p = 1; p <= pdf.numPages; p++) {
  const content = await (await pdf.getPage(p)).getTextContent();
  for (const it of content.items) {
    if (typeof it.str !== 'string' || it.str === '') continue;
    items.push({
      str: it.str,
      x: it.transform?.[4] ?? 0,
      y: it.transform?.[5] ?? 0,
      height: Math.abs(it.transform?.[3] ?? it.height ?? 10),
      width: it.width ?? 0,
      fontName: it.fontName ?? '',
    });
  }
}

// Scrub identity. Coordinates are untouched so layout parsing is unaffected.
// NOTE: matched per-item (not on the joined text) — joining items can merge
// adjacent unrelated digit runs (e.g. a following phone/year) onto the ID
// with no separator, causing the regex to overmatch and never find the real
// ID in any single item to replace.
const realId = items.find((i) => /MBA\/\d+\/\d+/.test(i.str))?.str.match(/MBA\/\d+\/\d+/)?.[0];
const first = fakeName.split(' ')[0];
const fakeEmail = `${first.toLowerCase()}2028@email.iimcal.ac.in`;
for (const it of items) {
  if (realId && it.str.includes(realId)) it.str = it.str.replace(realId, fakeId);
  it.str = it.str.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, fakeEmail);
}

// The candidate name is the largest bold run on the header line. (Not
// restricted to x > 400 "top-right corner": a name can be split into
// multiple runs and one run may fall left of that threshold, e.g. a first
// name at x=367 with the surname continuing past x=400 — restricting by x
// left that first-name run unscrubbed. height === maxSize alone already
// isolates the header row precisely in every fixture checked.)
const maxSize = Math.max(...items.map((i) => i.height));
let nameReplacements = 0;
for (const it of items) {
  if (it.height === maxSize && !/MBA\//.test(it.str) && /[A-Za-z]/.test(it.str)) {
    it.str = fakeName;
    nameReplacements++;
  }
}

// --- Leak detection: fail loudly rather than trust a human to grep after. ---
// Do this before writing anything, so a failed run never leaves output on disk.
const joined = items.map((i) => i.str).join('');

// 1. The original MBA id must be gone (every occurrence was replaced above;
//    if the literal substring still appears, some occurrence was missed).
if (realId && realId !== fakeId && joined.includes(realId)) {
  fail(`original MBA id "${realId}" still present in output after scrubbing`);
}

// 2. No email other than the fake one may remain. Checked per-item, not on
//    the naively joined text: joining concatenates adjacent PDF text runs
//    with no separator, and the email regex's greedy TLD group would then
//    bleed into whatever unrelated word follows (e.g. "...ac.in" + "Indian"
//    reads as one bogus "email") — the same class of bug that caused the
//    original MBA-id leak. Matching within each item's own string avoids it.
const strayEmails = [...new Set(
  items.flatMap((i) => i.str.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [])
    .filter((e) => e !== fakeEmail)
)];
if (strayEmails.length) {
  fail(`unexpected email address(es) survived scrubbing: ${strayEmails.join(', ')}`);
}

// 3. The name heuristic must have actually fired at least once. A silent
//    no-op (heuristic matched nothing) is exactly how a real first name
//    survived scrubbing previously.
if (nameReplacements === 0) {
  fail('name replacement matched zero text runs — the max-height heuristic found nothing to scrub');
}

// 4. Cross-check against the input filename itself: the filename encodes the
//    real name independently of any geometry heuristic, so use it as an
//    oracle. Any alpha token (length >= 3) from the filename, other than the
//    literal "MBA", must not appear anywhere in the output, case-insensitive.
const stem = basename(input, extname(input));
const filenameTokens = [...new Set(
  stem.split(/[^A-Za-z]+/).filter((t) => t.length >= 3 && t.toLowerCase() !== 'mba')
)];
const joinedLower = joined.toLowerCase();
const leakedTokens = filenameTokens.filter((t) => joinedLower.includes(t.toLowerCase()));
if (leakedTokens.length) {
  fail(`filename-derived identity token(s) still present in output: ${leakedTokens.join(', ')}`);
}

await writeFile(out, JSON.stringify(items, null, 1));
console.log(`wrote ${out} (${items.length} items, ${nameReplacements} name run(s) scrubbed, leak checks passed)`);
