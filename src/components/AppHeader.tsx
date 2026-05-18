import React, { useState } from 'react';
import PrintButton from './PrintButton';

export default function AppHeader({
  previewRef,
  onReset,
}: {
  previewRef: React.RefObject<HTMLDivElement>;
  onReset: () => void;
}) {
  const [tipOpen, setTipOpen] = useState(false);
  return (
    <header className="no-print bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
      <div className="flex flex-col">
        <div className="brand-mark text-base sm:text-lg flex items-baseline gap-1.5">
          <span>IIM</span>
          <span className="brand-mark__accent">C</span>
          <span className="text-slate-700 font-medium">Resume Editor</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          Made by Abhishek Acharya, Case Collective, IIM C
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setTipOpen((v) => !v)}
            onBlur={() => setTimeout(() => setTipOpen(false), 150)}
            className="ui-transition w-7 h-7 rounded-full border border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-400 text-xs font-semibold flex items-center justify-center"
            aria-label="Page length tip"
            title="Page length tip"
          >
            ?
          </button>
          {tipOpen && (
            <div className="absolute right-0 mt-2 w-72 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs text-slate-700 leading-relaxed">
              <div className="font-semibold text-slate-900 mb-1">Page length rule of thumb</div>
              <p>
                Roughly <strong>35 bullet points</strong> across all sections fit on a single A4
                page. Beyond that the export will spill onto a second page — trim text, merge
                sub-sections, or accept the overflow.
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onReset}
          className="ui-transition px-3 py-1.5 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-md text-sm text-slate-700"
        >
          Reset
        </button>
        <PrintButton previewRef={previewRef} />
      </div>
    </header>
  );
}
