/**
 * Which browser is exporting, and what to tell the student about it.
 *
 * The export is a `window.print()` of the live preview, so print fidelity is
 * the browser's, not ours. Measured against a real 63rd-batch resume, Chrome
 * reproduces the source template most closely; the others are usable but each
 * rasterises table rows slightly differently.
 */
export type BrowserId = 'chrome' | 'edge' | 'safari' | 'firefox' | 'other';

interface UaDataBrand { brand: string; version: string }
interface NavigatorUaData { brands?: UaDataBrand[] }

export function detectBrowser(
  ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  uaData?: NavigatorUaData
): BrowserId {
  // Prefer User-Agent Client Hints where the browser provides them: the UA
  // string lies about almost everything for compatibility reasons.
  const brands = uaData?.brands?.map((b) => b.brand.toLowerCase()) ?? [];
  if (brands.some((b) => b.includes('edge'))) return 'edge';
  if (brands.some((b) => b.includes('opera') || b.includes('opr'))) return 'other';
  if (brands.some((b) => b.includes('google chrome'))) return 'chrome';

  if (/\bEdgA?\//.test(ua)) return 'edge';
  if (/\bOPR\/|\bOpera/.test(ua)) return 'other';
  if (/\bFirefox\/|\bFxiOS\//.test(ua)) return 'firefox';
  // Chrome on iOS reports CriOS; everything on iOS is WebKit underneath, but
  // Chrome's print path there is still Safari's, so treat it as Safari.
  if (/\bCriOS\//.test(ua)) return 'safari';
  if (/\bChrome\/|\bChromium\//.test(ua)) return 'chrome';
  if (/\bSafari\//.test(ua) && !/\bChrome\//.test(ua)) return 'safari';
  return 'other';
}

export interface PrintGuidance {
  browser: BrowserId;
  label: string;
  /** True when this browser reproduces the template most faithfully. */
  isBest: boolean;
  /** Shown next to the export control. */
  advice: string;
}

export function printGuidance(browser: BrowserId): PrintGuidance {
  const common = 'In the print dialog set Margins to None and uncheck Headers and footers.';
  switch (browser) {
    case 'chrome':
      return { browser, label: 'Chrome', isBest: true, advice: common };
    case 'edge':
      return {
        browser, label: 'Edge', isBest: false,
        advice: `${common} Edge prints slightly tighter than Chrome, so a resume that only just fits may shift — check the preview before submitting.`,
      };
    case 'safari':
      return {
        browser, label: 'Safari', isBest: false,
        advice: `${common} Safari also needs "Print backgrounds" enabled, or the dark section bars will come out white. Chrome matches the official template most closely.`,
      };
    case 'firefox':
      return {
        browser, label: 'Firefox', isBest: false,
        advice: `${common} Firefox also needs "Print backgrounds" enabled under More settings. Chrome matches the official template most closely.`,
      };
    default:
      return {
        browser, label: 'this browser', isBest: false,
        advice: `${common} For the closest match to the official template, export from Chrome.`,
      };
  }
}
