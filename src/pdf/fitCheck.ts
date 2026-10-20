/**
 * The one-page check, run with the writer's own layout and font metrics so
 * the editor's "longer than one page" warning and the export always agree.
 * (Measuring the HTML preview disagreed with the PDF by up to ~50pt.)
 */
import fontkit from '@pdf-lib/fontkit';
import type { SkynetResumeData } from '@/templates/skynet/types';
import { layoutSkynet, PAGE_H, type FontKind, type Measure } from './skynetLayout';
import { loadPdfAssets } from './skynetPdf';
import { FEATURES, makeSanitizer } from './text';

interface KitFont {
  unitsPerEm: number;
  characterSet: number[];
  layout(text: string, features?: Record<string, boolean>): { glyphs: { advanceWidth: number }[] };
}

export interface FitResult {
  /** How far the content runs past one A4 page, in points. 0 when it fits. */
  overflowPt: number;
  fits: boolean;
}

/** Load the fonts once and return a checker for any number of drafts. */
export async function loadSkynetFitCheck(): Promise<(data: SkynetResumeData) => FitResult> {
  const assets = await loadPdfAssets();
  const kit = fontkit as unknown as { create(b: Uint8Array): KitFont };
  const fonts: Record<FontKind, KitFont> = {
    regular: kit.create(new Uint8Array(assets.regular)),
    bold: kit.create(new Uint8Array(assets.bold)),
  };
  const cache = new Map<string, number>();
  // Same arithmetic as pdf-lib's widthOfTextAtSize.
  const measure: Measure = (text, font, size) => {
    if (!text) return 0;
    const key = font + text;
    let units = cache.get(key);
    if (units === undefined) {
      units = fonts[font].layout(text, FEATURES).glyphs.reduce((a, g) => a + g.advanceWidth, 0) / fonts[font].unitsPerEm;
      if (cache.size > 20000) cache.clear();
      cache.set(key, units);
    }
    return units * size;
  };
  const sanitize = makeSanitizer(new Set(fonts.regular.characterSet));
  return (data) => {
    const over = Math.max(0, layoutSkynet(data, measure, sanitize).bottom - PAGE_H);
    // Never report a real overflow as "0pt over".
    return { overflowPt: over > 0 ? Math.max(1, Math.round(over)) : 0, fits: over <= 0 };
  };
}
