/**
 * Dump a resume PDF to anonymised PdfLine[] JSON for use as a test fixture.
 * Usage: node scripts/make-fixture.mjs <input.pdf> <out.json> <FakeName> <MBA/9999/63>
 */
import { readFile, writeFile } from 'node:fs/promises';

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const [input, out, fakeName, fakeId] = process.argv.slice(2);
if (!input || !out || !fakeName || !fakeId) {
  console.error('usage: node scripts/make-fixture.mjs <in.pdf> <out.json> <FakeName> <MBA/9999/63>');
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
for (const it of items) {
  if (realId && it.str.includes(realId)) it.str = it.str.replace(realId, fakeId);
  it.str = it.str.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    `${first.toLowerCase()}2028@email.iimcal.ac.in`);
}

// The candidate name is the largest bold run on the header line. (Not
// restricted to x > 400 "top-right corner": a name can be split into
// multiple runs and one run may fall left of that threshold, e.g. a first
// name at x=367 with the surname continuing past x=400 — restricting by x
// left that first-name run unscrubbed. height === maxSize alone already
// isolates the header row precisely in every fixture checked.)
const maxSize = Math.max(...items.map((i) => i.height));
for (const it of items) {
  if (it.height === maxSize && !/MBA\//.test(it.str) && /[A-Za-z]/.test(it.str)) {
    it.str = fakeName;
  }
}

await writeFile(out, JSON.stringify(items, null, 1));
console.log(`wrote ${out} (${items.length} items)`);
