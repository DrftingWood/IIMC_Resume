import { useReactToPrint } from 'react-to-print';
import React from 'react';

export default function PrintButton({
  previewRef,
}: {
  previewRef: React.RefObject<HTMLDivElement>;
}) {
  const handlePrint = useReactToPrint({
    contentRef: previewRef,
    documentTitle: 'IIM-C-Resume',
  });

  return (
    <button
      onClick={() => handlePrint()}
      className="ui-transition px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-semibold shadow-sm"
      title="Tip: in the print dialog, set Margins to None and uncheck Headers and footers."
    >
      Export PDF
    </button>
  );
}
