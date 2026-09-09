/**
 * Turns a pdfjs failure into something a student can act on.
 *
 * pdfjs throws messages written for developers — "The PDF file is empty, i.e.
 * its size is zero bytes." was reaching users verbatim on the upload screen.
 */
export function friendlyPdfError(e: unknown): string {
  const name = (e as { name?: string } | null)?.name ?? '';
  const raw = ((e as { message?: string } | null)?.message ?? '').toLowerCase();

  if (name === 'PasswordException' || raw.includes('password')) {
    return 'That PDF is password-protected. Open it, save an unprotected copy, and upload that.';
  }
  if (raw.includes('empty') || raw.includes('zero bytes')) {
    return "That file is empty — it may not have finished downloading. Try downloading your resume again.";
  }
  if (
    name === 'InvalidPDFException' ||
    raw.includes('invalid pdf') ||
    raw.includes('not a pdf') ||
    raw.includes('startxref') ||
    raw.includes('structure')
  ) {
    return "That doesn't look like a PDF we can read. If you exported it from Word, try File → Save as PDF rather than renaming the file.";
  }
  if (name === 'MissingPDFException' || raw.includes('missing pdf')) {
    return 'That file could not be opened. Check it still exists and try again.';
  }
  if (raw.includes('worker')) {
    return 'The PDF reader failed to start. Refresh the page and try again.';
  }
  return "That PDF could not be read. Try re-downloading it from the placement portal, or start from a blank resume below.";
}
