import { useReactToPrint } from 'react-to-print';
import React from 'react';

export default function PrintButton({
  previewRef,
}: {
  previewRef: React.RefObject<HTMLDivElement>;
}) {
  const handlePrint = useReactToPrint({
    contentRef: previewRef,
    documentTitle: 'IIM-C-F1-Resume',
  });

  return (
    <button
      onClick={() => handlePrint()}
      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold"
      title="Tip: in the print dialog, set Margins to None and uncheck Headers and footers."
    >
      Print PDF
    </button>
  );
}
