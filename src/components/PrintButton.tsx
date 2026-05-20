import React from 'react';

export default function PrintButton({
  previewRef: _previewRef,
}: {
  previewRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <button
      onClick={() => window.print()}
      className="ui-transition inline-flex items-center justify-center h-7 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold"
      title="Tip: in the print dialog, set Margins to None and uncheck Headers and footers."
    >
      Export PDF
    </button>
  );
}
