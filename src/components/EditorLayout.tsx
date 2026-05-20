import React, { useState, useEffect } from 'react';

export default function EditorLayout({
  sections,
  form,
  preview,
  showSections,
  showForm,
}: {
  sections: React.ReactNode;
  form: React.ReactNode;
  preview: React.ReactNode;
  showSections: boolean;
  showForm: boolean;
}) {
  const [tab, setTab] = useState<'sections' | 'edit' | 'preview'>('edit');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isMobile) {
    const tabClass = (active: boolean) =>
      'ui-transition flex-1 py-2.5 text-sm font-semibold ' +
      (active
        ? 'border-b-2 border-slate-900 text-slate-900'
        : 'text-slate-500 hover:text-slate-700');
    return (
      <div className="flex flex-col h-full">
        <div className="no-print flex border-b border-slate-200 bg-white">
          <button className={tabClass(tab === 'sections')} onClick={() => setTab('sections')}>
            Sections
          </button>
          <button className={tabClass(tab === 'edit')} onClick={() => setTab('edit')}>
            Edit
          </button>
          <button className={tabClass(tab === 'preview')} onClick={() => setTab('preview')}>
            Preview
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {tab === 'sections' && sections}
          {tab === 'edit' && form}
          {tab === 'preview' && <div className="flex justify-center">{preview}</div>}
        </div>
      </div>
    );
  }

  // Desktop: 3 columns. Widths adjust based on which panels are shown.
  const cols: string[] = [];
  if (showSections) cols.push('minmax(220px, 0.45fr)');
  if (showForm) cols.push('minmax(0, 1fr)');
  cols.push('minmax(0, 1.15fr)');

  return (
    <div
      className="print-grid grid gap-6 px-6 py-5 h-full overflow-hidden"
      style={{ gridTemplateColumns: cols.join(' ') }}
    >
      {showSections && (
        <div className="no-print overflow-auto bg-slate-50/60 border border-slate-200/70 rounded-lg p-3">
          {sections}
        </div>
      )}
      {showForm && (
        <div className="no-print overflow-auto pr-1">{form}</div>
      )}
      <div className="print-preview-col overflow-auto">
        <div className="print-preview-inner flex justify-center">{preview}</div>
      </div>
    </div>
  );
}
