import React from 'react';
import PrintButton from './PrintButton';

export default function AppHeader({
  previewRef,
  onReset,
}: {
  previewRef: React.RefObject<HTMLDivElement>;
  onReset: () => void;
}) {
  return (
    <header className="no-print bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="brand-mark text-base sm:text-lg flex items-baseline gap-1.5">
          <span>IIM</span>
          <span className="brand-mark__accent">C</span>
          <span className="text-slate-700 font-medium">Resume Editor</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
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
