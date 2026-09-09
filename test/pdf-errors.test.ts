import { describe, it, expect } from 'vitest';
import { friendlyPdfError } from '@/lib/pdfErrors';

describe('pdf error messages are written for students, not developers', () => {
  it('explains an empty file', () => {
    const msg = friendlyPdfError(new Error('The PDF file is empty, i.e. its size is zero bytes.'));
    expect(msg).toMatch(/empty/i);
    expect(msg).not.toMatch(/zero bytes|i\.e\./);
  });

  it('explains a password-protected file and what to do', () => {
    const e = Object.assign(new Error('No password given'), { name: 'PasswordException' });
    expect(friendlyPdfError(e)).toMatch(/password-protected/i);
    expect(friendlyPdfError(e)).toMatch(/unprotected copy/i);
  });

  it('explains a file that is not really a PDF', () => {
    const e = Object.assign(new Error('Invalid PDF structure.'), { name: 'InvalidPDFException' });
    const msg = friendlyPdfError(e);
    expect(msg).toMatch(/doesn't look like a PDF/i);
    expect(msg).not.toMatch(/Invalid PDF structure/);
  });

  it('always offers a way forward for an unrecognised failure', () => {
    const msg = friendlyPdfError(new Error('kaboom 0x8007'));
    expect(msg).not.toMatch(/kaboom/);
    expect(msg).toMatch(/blank resume|re-downloading/i);
  });

  it('never leaks a raw stack or object', () => {
    for (const e of [null, undefined, {}, 'a string', new Error('')]) {
      const msg = friendlyPdfError(e);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(20);
    }
  });
});
