import React from 'react';
import { detectBrowser, printGuidance } from '@/lib/browser';

export default function PrintButton({
  previewRef: _previewRef,
}: {
  previewRef: React.RefObject<HTMLDivElement>;
}) {
  const guide = printGuidance(detectBrowser());
  return (
    <div className="flex items-center gap-2">
      {!guide.isBest && (
        <span
          className="hidden lg:inline text-[10px] text-amber-700 max-w-[16rem] leading-tight"
          title={guide.advice}
        >
          You are on {guide.label} — Chrome gives the closest match to the
          official template.
        </span>
      )}
    <button
      onClick={() => window.print()}
      className="ui-transition inline-flex items-center justify-center h-7 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold"
      title={guide.advice}
    >
      Export PDF
    </button>
    </div>
  );
}
