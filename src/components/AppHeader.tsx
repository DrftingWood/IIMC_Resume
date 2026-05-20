import React, { useState } from 'react';
import PrintButton from './PrintButton';

export default function AppHeader({
  previewRef,
  onReset,
  onChangeTemplate,
  templateLabel,
  showSections,
  showForm,
  onToggleSections,
  onToggleForm,
}: {
  previewRef: React.RefObject<HTMLDivElement>;
  onReset: () => void;
  onChangeTemplate: () => void;
  templateLabel: string;
  showSections: boolean;
  showForm: boolean;
  onToggleSections: () => void;
  onToggleForm: () => void;
}) {
  const [tipOpen, setTipOpen] = useState(false);
  const btn =
    'ui-transition inline-flex items-center justify-center h-7 px-2.5 rounded-md text-xs font-medium border';
  const ghostBtn =
    `${btn} bg-white border-slate-300 text-slate-700 hover:border-slate-500 hover:bg-slate-50`;
  const toggleClass = (active: boolean) =>
    `${btn} ` +
    (active
      ? 'bg-slate-900 text-white border-slate-900'
      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500 hover:bg-slate-50');

  return (
    <header className="no-print bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-b border-slate-200 px-5 py-2.5 flex items-center justify-between">
      <div className="flex flex-col leading-tight">
        <div className="brand-mark text-sm sm:text-base flex items-baseline gap-1.5">
          <span>IIM</span>
          <span className="brand-mark__accent">C</span>
          <span className="text-slate-700 font-medium">Resume Editor</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          Made by Abhishek Acharya, Case Collective, IIM C
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onChangeTemplate}
          className={`hidden md:inline-flex ${ghostBtn} gap-1.5`}
          title="Switch templates (your current draft is preserved)"
        >
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Template</span>
          <span className="text-slate-300">·</span>
          <span className="font-semibold">{templateLabel}</span>
        </button>
        <div className="hidden md:flex items-center gap-1.5 pl-2 ml-1 border-l border-slate-200">
          <button
            type="button"
            onClick={onToggleSections}
            className={toggleClass(showSections)}
            aria-pressed={showSections}
            title="Toggle section order panel"
          >
            Sections
          </button>
          <button
            type="button"
            onClick={onToggleForm}
            className={toggleClass(showForm)}
            aria-pressed={showForm}
            title="Toggle editor panel"
          >
            Editor
          </button>
        </div>
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setTipOpen((v) => !v)}
            onBlur={() => setTimeout(() => setTipOpen(false), 150)}
            className="ui-transition w-7 h-7 rounded-full border border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-500 text-xs font-semibold flex items-center justify-center"
            aria-label="Page length tip"
            title="Page length tip"
          >
            ?
          </button>
          {tipOpen && (
            <div className="absolute right-0 mt-2 w-72 z-20 bg-white border border-slate-200 rounded-lg shadow-[var(--shadow-card)] p-3 text-xs text-slate-700 leading-relaxed">
              <div className="font-semibold text-slate-900 mb-1">Page length rule of thumb</div>
              <p>
                Roughly <strong>35 bullet points</strong> across all sections fit on a single A4
                page. Beyond that the export will spill onto a second page — trim text, merge
                sub-sections, or accept the overflow.
              </p>
            </div>
          )}
        </div>
        <button onClick={onReset} className={ghostBtn}>
          Reset
        </button>
        <PrintButton previewRef={previewRef} />
      </div>
    </header>
  );
}
