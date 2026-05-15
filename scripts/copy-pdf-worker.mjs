import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const candidates = [
  'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
  'node_modules/pdfjs-dist/build/pdf.worker.mjs',
];

let src = null;
for (const c of candidates) {
  const full = resolve(projectRoot, c);
  if (existsSync(full)) {
    src = full;
    break;
  }
}

if (!src) {
  console.warn('[copy-pdf-worker] pdfjs-dist worker not found. Skipping copy.');
  process.exit(0);
}

const destDir = resolve(projectRoot, 'public');
if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
const dest = resolve(destDir, 'pdf.worker.min.mjs');
copyFileSync(src, dest);
console.log(`[copy-pdf-worker] Copied ${src} -> ${dest}`);
