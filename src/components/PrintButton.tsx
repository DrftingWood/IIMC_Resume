import React from 'react';

export default function PrintButton({
  previewRef: _previewRef,
}: {
  previewRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <button
      onClick={() => window.print()}
      className="ui-transition px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-semibold shadow-sm"
      title="Tip: in the print dialog, set Margins to None and uncheck Headers and footers."
    >
      Export PDF
    </button>
  );
}
