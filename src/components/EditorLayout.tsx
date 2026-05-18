import React, { useState, useEffect } from 'react';

export default function EditorLayout({
  form,
  preview,
}: {
  form: React.ReactNode;
  preview: React.ReactNode;
}) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="no-print flex border-b border-slate-200 bg-white">
          <button
            className={
              'ui-transition flex-1 py-2.5 text-sm font-semibold ' +
              (tab === 'edit'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-500 hover:text-slate-700')
            }
            onClick={() => setTab('edit')}
          >
            Edit
          </button>
          <button
            className={
              'ui-transition flex-1 py-2.5 text-sm font-semibold ' +
              (tab === 'preview'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-500 hover:text-slate-700')
            }
            onClick={() => setTab('preview')}
          >
            Preview
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {tab === 'edit' ? form : <div className="flex justify-center">{preview}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="print-grid grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 px-6 py-5 h-full overflow-hidden">
      <div className="no-print overflow-auto pr-1">{form}</div>
      <div className="print-preview-col overflow-auto">
        <div className="print-preview-inner flex justify-center">{preview}</div>
      </div>
    </div>
  );
}
