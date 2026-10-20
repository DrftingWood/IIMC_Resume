/**
 * Writes the Skynet resume straight to PDF, instead of printing the on-screen
 * preview through the browser.
 *
 * Browsers round table rows to whole pixels (0.75pt steps at print
 * resolution), so a printed page can only approximate the official 14.625pt
 * row, and Safari, Firefox and Chrome each round differently. Drawing the
 * page ourselves puts every rule and glyph where the official export does,
 * identically on every browser and phone.
 *
 * Type is Carlito (SIL Open Font License, public/pdf/OFL.txt): Calibri's
 * metric twin, so every word is exactly as wide as in the official file.
 * Calibri itself cannot be shipped.
 */
import {
  PDFDocument,
  PDFName,
  PDFString,
  rgb,
  degrees,
  setCharacterSpacing,
  pushGraphicsState,
  popGraphicsState,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { SkynetResumeData } from '@/templates/skynet/types';
import { layoutSkynet, PAGE_H, PAGE_W, type FontKind, type Op } from './skynetLayout';
import { FEATURES, makeSanitizer } from './text';

/** The resume does not fit on one A4 page. */
export class PageOverflowError extends Error {
  constructor(public readonly overflowPt: number) {
    super(`Resume runs ${Math.ceil(overflowPt)}pt past one page`);
    this.name = 'PageOverflowError';
  }
}

export interface PdfAssets {
  regular: Uint8Array | ArrayBuffer;
  bold: Uint8Array | ArrayBuffer;
  logo: Uint8Array | ArrayBuffer;
}

export async function buildSkynetPdf(
  data: SkynetResumeData,
  assets: PdfAssets,
  opts: { allowOverflow?: boolean; logo?: boolean } = {}
): Promise<{ bytes: Uint8Array; replaced: string[] }> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // Full embeds: @pdf-lib/fontkit 1.1.1 writes Carlito subsets with a corrupt
  // glyf table, which Chrome, Firefox and MuPDF draw blank (the text layer
  // still extracts, so only rendering shows it).
  const fonts: Record<FontKind, PDFFont> = {
    regular: await doc.embedFont(assets.regular, { subset: false, features: FEATURES }),
    bold: await doc.embedFont(assets.bold, { subset: false, features: FEATURES }),
  };
  const logo = opts.logo ? await doc.embedPng(assets.logo) : null;

  const replaced = new Set<string>();
  const sanitize = makeSanitizer(new Set(fonts.regular.getCharacterSet()), replaced);

  const measure = (text: string, font: FontKind, size: number) =>
    text ? fonts[font].widthOfTextAtSize(text, size) : 0;

  const { ops, bottom } = layoutSkynet(data, measure, sanitize, { logo: opts.logo });
  // The official format is one page. Rather than cut content off, say so and
  // let the caller fall back to printing, which paginates.
  if (bottom > PAGE_H && !opts.allowOverflow) throw new PageOverflowError(bottom - PAGE_H);

  const page = doc.addPage([PAGE_W, PAGE_H]);
  for (const op of ops) draw(page, op, fonts, logo, doc);

  const name = (data.name || 'Resume').trim();
  doc.setTitle(name);
  doc.setAuthor(name);
  doc.setCreator('IIMC Resume Builder');
  doc.setProducer('IIMC Resume Builder');
  return { bytes: await doc.save(), replaced: [...replaced] };
}

const colour = (c: [number, number, number]) => rgb(c[0], c[1], c[2]);

function draw(
  page: PDFPage,
  op: Op,
  fonts: Record<FontKind, PDFFont>,
  logo: Awaited<ReturnType<PDFDocument['embedPng']>> | null,
  doc: PDFDocument
) {
  switch (op.kind) {
    case 'rect':
      page.drawRectangle({ x: op.x, y: PAGE_H - op.y - op.h, width: op.w, height: op.h, color: colour(op.color) });
      return;
    case 'line':
      page.drawLine({
        start: { x: op.x1, y: PAGE_H - op.y1 },
        end: { x: op.x2, y: PAGE_H - op.y2 },
        thickness: op.width,
        color: colour(op.color),
      });
      return;
    case 'image':
      if (!logo) return;
      page.drawImage(logo, { x: op.x, y: PAGE_H - op.y - op.h, width: op.w, height: op.h });
      return;
    case 'text':
      if (op.charSpacing) page.pushOperators(pushGraphicsState(), setCharacterSpacing(op.charSpacing));
      page.drawText(op.text, {
        x: op.x,
        y: PAGE_H - op.y,
        size: op.size,
        font: fonts[op.font],
        color: colour(op.color),
        ...(op.rotate ? { rotate: degrees(op.rotate) } : {}),
      });
      if (op.charSpacing) page.pushOperators(popGraphicsState());
      return;
    case 'link': {
      const annot = doc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [op.x, PAGE_H - op.y - op.h, op.x + op.w, PAGE_H - op.y],
        Border: [0, 0, 0],
        A: { Type: 'Action', S: 'URI', URI: PDFString.of(uriLiteral(op.uri)) },
      });
      const ref = doc.context.register(annot);
      const annots = page.node.lookup(PDFName.of('Annots'));
      if (annots && 'push' in annots) (annots as unknown as { push(r: unknown): void }).push(ref);
      else page.node.set(PDFName.of('Annots'), doc.context.obj([ref]));
      return;
    }
  }
}

/**
 * A URI as the body of a PDF literal string. pdf-lib writes PDFString text
 * verbatim, so an unbalanced ")" in an email ended the string early and
 * corrupted the whole file. URIs are ASCII: percent-encode the rest (encodeURI
 * also turns a backslash into %5C), then escape the parentheses.
 */
export function uriLiteral(uri: string): string {
  const backslash = String.fromCharCode(92);
  // A lone surrogate cannot be percent-encoded; keep well-formed characters.
  const wellFormed = Array.from(uri)
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      return ch.length === 2 || c < 0xd800 || c > 0xdfff;
    })
    .join('');
  return encodeURI(wellFormed).replace(/[()]/g, (c) => backslash + c);
}

/** The fonts and logo, fetched once and only when someone exports. */
let cached: Promise<PdfAssets> | null = null;
export function loadPdfAssets(): Promise<PdfAssets> {
  if (!cached) {
    const get = (p: string) =>
      fetch(p).then((r) => {
        if (!r.ok) throw new Error(`Could not load ${p}`);
        return r.arrayBuffer();
      });
    cached = Promise.all([
      get('/pdf/Carlito-Regular.ttf'),
      get('/pdf/Carlito-Bold.ttf'),
      get('/pdf/iimc-logo.png'),
    ]).then(([regular, bold, logo]) => ({ regular, bold, logo }));
    cached.catch(() => {
      cached = null;
    });
  }
  return cached;
}
