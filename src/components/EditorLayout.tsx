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
        <div className="no-print flex border-b border-gray-200 bg-white">
          <button
            className={
              'flex-1 py-2 text-sm font-semibold ' +
              (tab === 'edit' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500')
            }
            onClick={() => setTab('edit')}
          >
            Edit
          </button>
          <button
            className={
              'flex-1 py-2 text-sm font-semibold ' +
              (tab === 'preview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500')
            }
            onClick={() => setTab('preview')}
          >
            Preview
          </button>
        </div>
        <div className="flex-1 overflow-auto p-3">
          {tab === 'edit' ? form : <div className="flex justify-center">{preview}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4 h-full overflow-hidden">
      <div className="no-print overflow-auto pr-2">{form}</div>
      <div className="overflow-auto">
        <div className="flex justify-center">{preview}</div>
      </div>
    </div>
  );
}
