import type { SkynetResumeData } from '@/templates/skynet/types';
import { showLogo } from '@/lib/logoSetting';

/** "Jane Doe" -> "Jane_Doe_Resume.pdf"; falls back to "Resume.pdf". */
export function pdfFileName(name: string): string {
  const base = name.trim().replace(/[^\p{L}\p{M}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
  // Capped: some portals and file systems reject very long names.
  const short = Array.from(base).slice(0, 60).join('').replace(/_+$/, '');
  return short ? `${short}_Resume.pdf` : 'Resume.pdf';
}

/** Build the Skynet PDF and hand it to the browser as a download. The writer
    and its fonts load only now, so the editor itself stays light. */
export async function exportSkynetPdf(data: SkynetResumeData): Promise<{ replaced: string[] }> {
  const { buildSkynetPdf, loadPdfAssets } = await import('./skynetPdf');
  const { bytes, replaced } = await buildSkynetPdf(data, await loadPdfAssets(), { logo: showLogo() });
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = pdfFileName(data.name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { replaced };
}
