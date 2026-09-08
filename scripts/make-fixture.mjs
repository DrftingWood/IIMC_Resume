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
import { basename, extname, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Reuse the app's own line-reconstruction (x-gap-aware word spacing, y-tolerance
// line grouping) for the id leak scan below — see the comment at check 1.
const __dirname = dirname(fileURLToPath(import.meta.url));
const { groupIntoLines } = await import(pathToFileURL(resolve(__dirname, '../src/lib/pdfExtract.ts')));

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

// 1. Scan the OUTPUT itself for every MBA id pattern, rather than asking
//    whether the pre-extracted `realId` variable still appears. `realId` can
//    be `undefined` when the real id is split across multiple text runs (no
//    single item matches the per-item regex above that *found* it) — the
//    exact bug class that let the real name leak the first time. A
//    `realId &&`-guarded check would vacuously pass in that case even though
//    the real id is sitting right there in the text. Two earlier attempts at
//    this scan failed for different reasons, both worth recording:
//      - Bounding the digit-group widths to the fake id's own shape (e.g.
//        \d{4}\/\d{2}) made a differently-shaped real id (e.g. MBA/123/63)
//        invisible to the scan instead of flagged, and — worse — a partial
//        scrub where SOME occurrences correctly became the fake id could
//        satisfy "at least one match, all matches equal fakeId" while a
//        differently-shaped real id survived elsewhere undetected.
//      - Switching to an open-ended `/(?!\d)MBA\/\d+\/\d+(?<!\d)/g` on the
//        naively `.join('')`-ed items does NOT fix bleed-over: a greedy \d+
//        always maximal-munches every contiguous digit before the lookahead
//        is even checked, so the lookahead is trivially satisfied and never
//        forces backtracking. Confirmed empirically on the real skynet-a
//        fixture: `items.map(i=>i.str).join('')` puts "MBA/9001/63" (a page
//        header item at y=810) directly next to "34 Months (FULL-TIME)" (an
//        unrelated item at y=472 — a totally different line) purely because
//        of PDF content-stream *array order*, which is not reading order.
//        Both the plain and lookaround regexes matched "MBA/9001/6334" on
//        that text — a false leak on a correctly-scrubbed fixture.
//    The actual fix: don't scan the naive array-order join at all. Scan the
//    same line-reconstructed text the app itself produces (groupIntoLines:
//    y-tolerance line grouping + x-gap-aware word spacing from
//    src/lib/pdfExtract.ts), which puts a real separator between genuinely
//    unrelated content and only concatenates text that is actually touching
//    on the actual page — including an id split across two text runs on the
//    same line, which is exactly the case this check must still catch.
//    The digit widths stay open-ended (no fake-id-shape assumption), and the
//    lookahead/lookbehind stay on as a harmless extra guard against a
//    same-run digit collision that line-reconstruction wouldn't itself space
//    out.
const reconstructedText = groupIntoLines(items).map((l) => l.text).join('\n');
const idMatches = reconstructedText.match(/(?<!\d)MBA\/\d+\/\d+(?!\d)/g) ?? [];
if (idMatches.length === 0) {
  fail('no MBA id pattern found anywhere in the output — extraction likely broke silently');
}
const leakedIds = [...new Set(idMatches.filter((m) => m !== fakeId))];
if (leakedIds.length) {
  fail(`MBA id pattern(s) in output do not match the fake id: ${leakedIds.join(', ')}`);
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
