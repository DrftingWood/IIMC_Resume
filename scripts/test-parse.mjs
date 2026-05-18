/**
 * Standalone test harness for src/lib/parser.ts + src/lib/pdfExtract.ts.
 * Loads a PDF, extracts items via pdfjs-dist's legacy build, mimics the
 * line grouping from pdfExtract.ts, then runs parseResume on the result.
 *
 * Usage: node scripts/test-parse.mjs <path-to-pdf>
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { register } from 'node:module';

// ---------- pdfjs legacy import ----------
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

// ---------- helpers mirroring pdfExtract.ts ----------
async function extractTextItems(buf) {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
  const items = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    for (const it of content.items) {
      if (typeof it.str !== 'string') continue;
      const x = it.transform?.[4] ?? 0;
      const y = it.transform?.[5] ?? 0;
      const height = Math.abs(it.transform?.[3] ?? it.height ?? 10);
      const width = it.width ?? 0;
      items.push({ str: it.str, x, y, width, height, fontName: it.fontName ?? '' });
    }
  }
  return items;
}

async function extractLines(buf) {
  const items = await extractTextItems(buf);
  if (!items.length) return [];
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const lines = [];
  const TOL = 4.5;
  for (const it of sorted) {
    if (it.str === '') continue;
    const existing = lines.find((l) => Math.abs(l.y - it.y) <= TOL);
    if (existing) {
      existing.items.push(it);
      existing.startX = Math.min(existing.startX, it.x);
      existing.endX = Math.max(existing.endX, it.x + it.width);
      existing.height = Math.max(existing.height, it.height);
    } else {
      lines.push({ y: it.y, startX: it.x, endX: it.x + it.width, height: it.height, items: [it], text: '' });
    }
  }
  for (const ln of lines) {
    ln.items.sort((a, b) => a.x - b.x);
    let prevEnd = -Infinity;
    let buf2 = '';
    for (const it of ln.items) {
      if (buf2 && it.x - prevEnd > 1.5 && !/\s$/.test(buf2) && !/^\s/.test(it.str)) buf2 += ' ';
      buf2 += it.str;
      prevEnd = it.x + it.width;
    }
    ln.text = buf2.replace(/\s+/g, ' ').trim();
  }
  return lines.filter((l) => l.text.length > 0).sort((a, b) => b.y - a.y);
}

// ---------- run ----------
const path = process.argv[2];
if (!path) {
  console.error('usage: node scripts/test-parse.mjs <pdf>');
  process.exit(1);
}
const buf = await readFile(path);
const lines = await extractLines(buf);

console.log('==================== RAW LINES (top -> bottom) ====================');
for (const l of lines) {
  console.log(`y=${l.y.toFixed(1).padStart(6)}  x=[${l.startX.toFixed(0).padStart(3)},${l.endX.toFixed(0).padStart(3)}]  h=${l.height.toFixed(1)}  | ${l.text}`);
}

console.log('\n==================== PER-ITEM DUMP: bullet lines ====================');
const codePoints = (s) => [...s].map((c) => 'U+' + c.codePointAt(0).toString(16).padStart(4, '0')).join(' ');
const sampleLines = lines.filter((l) => /Secured|NASSCOM|QF Judge|Council Chair|Elected/.test(l.text)).slice(0, 5);
for (const l of sampleLines) {
  console.log(`\nLINE y=${l.y.toFixed(1)}  text="${l.text.slice(0, 60)}..."`);
  for (const it of l.items.slice(0, 6)) {
    console.log(`  x=${it.x.toFixed(1).padStart(6)} w=${it.width.toFixed(1).padStart(5)} h=${it.height.toFixed(1)} font="${it.fontName}" str="${it.str}" cp=${codePoints(it.str)}`);
  }
}

// Load the parser via dynamic import. We need to register a quick TS
// loader since parser.ts has @/ aliases. Easier: ship a JS shim copy.
const parserPath = resolve(dirname(fileURLToPath(import.meta.url)), '../src/lib/parser.ts');
console.log('\n==================== PARSER OUTPUT ====================');

// Inline the parser logic by importing via ts-node-like transpiler isn't
// available; we use a regex stripper instead. Read parser.ts, strip the
// "import type { ... } from '@/types/resume'" line, strip the PdfLine
// type import, and eval. Simpler: shell out to esbuild.
import { spawnSync } from 'node:child_process';
const bundled = spawnSync(
  'npx',
  ['esbuild', '--bundle', '--format=esm', '--platform=node', '--loader:.ts=ts', parserPath, '--external:@/*'],
  { encoding: 'utf8' }
);
if (bundled.status !== 0) {
  console.error('esbuild failed:', bundled.stderr);
  process.exit(1);
}
// Replace the @/types/resume import with a no-op (types only).
const cleaned = bundled.stdout.replace(/import\s+(?:type\s+)?\{[^}]*\}\s+from\s+["']@\/[^"']+["'];?/g, '');

const { writeFileSync } = await import('node:fs');
const tmp = '/tmp/parser.bundled.mjs';
writeFileSync(tmp, cleaned);
const mod = await import(tmp);
const parsed = mod.parseResume(lines);
console.log(JSON.stringify(parsed, null, 2));
