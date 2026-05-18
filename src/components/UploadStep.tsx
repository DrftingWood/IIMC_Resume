import React, { useState } from 'react';
import { extractLines } from '@/lib/pdfExtract';
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
  const [dragging, setDragging] = useState(false);

  async function consumeFile(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const lines = await extractLines(file);
      const parsed = parseResume(lines);
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

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) consumeFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') consumeFile(file);
    else if (file) setErr('Please drop a PDF file.');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gradient-to-b from-white to-slate-100">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="brand-mark text-3xl sm:text-4xl flex items-baseline justify-center gap-2">
            <span>IIM</span>
            <span className="brand-mark__accent">C</span>
            <span className="text-slate-700 font-medium">Resume Editor</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Edit your placement resume and export a pixel-faithful PDF.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Works best with the IIM Calcutta resume template.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.06)] border border-slate-200/70 p-6 sm:p-8">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={
              'ui-transition relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer text-center ' +
              (dragging
                ? 'border-slate-900 bg-slate-50'
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50')
            }
          >
            <UploadIcon className="w-7 h-7 text-slate-400" />
            <div className="text-sm font-semibold text-slate-800">
              {busy ? 'Parsing your PDF…' : 'Drop your resume here'}
            </div>
            {!busy && (
              <div className="text-xs text-slate-500">
                or <span className="text-slate-900 underline underline-offset-2">browse to upload</span>
              </div>
            )}
            <input
              type="file"
              accept="application/pdf"
              hidden
              disabled={busy}
              onChange={handleFile}
            />
          </label>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] uppercase tracking-wider text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onReady(emptyResume())}
              className="ui-transition px-4 py-2.5 rounded-lg border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-sm font-medium text-slate-700"
            >
              Start blank
            </button>
            <button
              onClick={() => onReady(SAMPLE)}
              className="ui-transition px-4 py-2.5 rounded-lg border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-sm font-medium text-slate-700"
            >
              Use sample data
            </button>
          </div>

          {err && (
            <p className="text-sm text-red-600 mt-4 text-center bg-red-50 border border-red-100 rounded-md py-2">
              {err}
            </p>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-6 text-center px-4 leading-relaxed">
          Inline <strong className="text-slate-700">bold</strong> formatting is not recovered from
          upload — re-apply it using the <strong className="text-slate-700">B</strong> button in the
          editor.
        </p>
      </div>
    </div>
  );
}

function UploadIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 16V4" />
      <path d="m6 10 6-6 6 6" />
      <path d="M4 20h16" />
    </svg>
  );
}
