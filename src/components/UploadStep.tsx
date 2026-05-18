import React, { useState } from 'react';
import { extractPlainText } from '@/lib/pdfExtract';
import { parseResume } from '@/lib/parser';
import { emptyResume, type ResumeData } from '@/types/resume';
import { SAMPLE } from '@/lib/sample';

export default function UploadStep({
  onReady,
}: {
  onReady: (data: ResumeData, opts?: { warnBoldLost?: boolean }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const text = await extractPlainText(file);
      const parsed = parseResume(text);
      const merged: ResumeData = { ...emptyResume(), ...parsed } as ResumeData;
      if (!merged.taglines) merged.taglines = ['', '', ''];
      onReady(merged, { warnBoldLost: true });
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? 'Failed to parse PDF');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-2">IIM-C F1 Resume Builder</h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          Upload your F1 placement resume, edit it, and export a pixel-faithful PDF.
        </p>

        <div className="space-y-3">
          <label className="block">
            <span className="block w-full text-center px-4 py-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer">
              {busy ? 'Parsing…' : 'Upload your F1 PDF'}
              <input type="file" accept="application/pdf" hidden disabled={busy} onChange={handleFile} />
            </span>
          </label>
          <button
            onClick={() => onReady(emptyResume())}
            className="block w-full px-4 py-3 rounded-md border border-gray-300 hover:bg-gray-50 font-semibold"
          >
            Start from blank
          </button>
          <button
            onClick={() => onReady(SAMPLE)}
            className="block w-full px-4 py-3 rounded-md border border-gray-300 hover:bg-gray-50 font-semibold"
          >
            Use sample data
          </button>
        </div>

        {err && <p className="text-sm text-red-600 mt-4 text-center">{err}</p>}

        <p className="text-xs text-gray-500 mt-6 text-center">
          Note: Inline <strong>bold</strong> formatting is not recovered from upload — re-apply it
          using the <strong>B</strong> button in the editor.
        </p>
      </div>
    </div>
  );
}
