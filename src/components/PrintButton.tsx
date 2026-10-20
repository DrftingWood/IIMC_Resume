import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { detectBrowser, printGuidance } from '@/lib/browser';

/** A character as a student can recognise it: itself when visible, its code
    point when it is a combining mark or otherwise draws nothing alone. */
function showChar(ch: string): string {
  const visible = /[\p{L}\p{N}\p{P}\p{S}]/u.test(ch) && !/\p{M}/u.test(ch);
  return visible ? ch : `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;
}

export default function PrintButton({
  previewRef: _previewRef,
  onExportPdf,
}: {
  previewRef: React.RefObject<HTMLDivElement>;
  /** Writes the PDF directly. Without it the preview is printed. */
  onExportPdf?: () => Promise<{ replaced: string[] }>;
}) {
  const guide = printGuidance(detectBrowser());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  // A ref, not state: two clicks in one tick must not both start an export
  // (state only disables the button after React re-renders).
  const running = useRef(false);

  const exportPdf = async (ev: React.MouseEvent<HTMLButtonElement>) => {
    if (!onExportPdf) {
      window.print();
      return;
    }
    if (running.current) return;
    running.current = true;
    // Disable in the DOM now: the export then holds the main thread for a
    // few hundred ms, and clicks queued meanwhile must hit a disabled button
    // (React's re-render comes too late on Firefox and Safari).
    const button = ev.currentTarget;
    button.disabled = true;
    setBusy(true);
    setNotice('');
    try {
      const { replaced } = await onExportPdf();
      if (replaced.length) {
        setNotice(
          `The official font has no ${replaced.slice(0, 6).map(showChar).join(' ')}, so the PDF shows "?" ` +
            `there. Replace ${replaced.length > 1 ? 'them' : 'it'} with plain text.`
        );
      }
    } catch (e) {
      // More than one page, or the writer could not run (offline fonts, a
      // very old browser): printing the preview still gets the student a PDF.
      console.error('PDF export fell back to print:', e);
      setNotice(
        e instanceof Error && e.name === 'PageOverflowError'
          ? 'Your resume is longer than one page, so the print dialog opened instead.'
          : 'The download failed, so the print dialog opened instead.'
      );
      window.print();
    } finally {
      setBusy(false);
      // Re-arm only after clicks queued during the export have been dropped.
      setTimeout(() => {
        running.current = false;
        button.disabled = false;
      }, 600);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* The direct writer is identical on every browser; only printing
          depends on which one the student uses. */}
      {!onExportPdf && !guide.isBest && (
        <span
          className="hidden lg:inline text-[10px] text-amber-700 max-w-[16rem] leading-tight"
          title={guide.advice}
        >
          You are on {guide.label} — Chrome gives the closest match to the
          official template.
        </span>
      )}
      {/* Always mounted so screen readers announce what is written into it;
          shown as a toast so it never squeezes the header on a phone. Portalled
          to <body>: inside the header, whose backdrop blur makes it the
          containing block for fixed elements, it was pinned above the screen. */}
      {createPortal(
        <div
          role="status"
          aria-live="polite"
          className={
            notice
              ? 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[min(28rem,calc(100vw-2rem))] flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-lg'
              : 'sr-only'
          }
        >
          {notice && (
            <>
              <span className="leading-snug">{notice}</span>
              <button
                onClick={() => setNotice('')}
                className="shrink-0 text-amber-900/70 hover:text-amber-900"
                aria-label="Dismiss"
              >
                ×
              </button>
            </>
          )}
        </div>,
        document.body
      )}
      <button
        onClick={exportPdf}
        disabled={busy}
        aria-busy={busy}
        className="ui-transition inline-flex items-center justify-center h-7 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-md text-xs font-semibold"
        title={onExportPdf ? 'Download the PDF, laid out exactly as the official template' : guide.advice}
      >
        {busy ? 'Preparing…' : 'Export PDF'}
      </button>
    </div>
  );
}
