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
    <header className="no-print bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      <div className="font-semibold text-sm">IIM-C F1 Resume Builder</div>
      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-md text-sm"
        >
          Reset
        </button>
        <PrintButton previewRef={previewRef} />
      </div>
    </header>
  );
}
