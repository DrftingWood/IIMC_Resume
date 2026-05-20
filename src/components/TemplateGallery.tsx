import React, { useState } from 'react';
import { extractLines } from '@/lib/pdfExtract';
import { TEMPLATES } from '@/templates/registry';
import type { AnyTemplateConfig, TemplateKey } from '@/templates/types';

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export default function TemplateGallery({
  onReady,
}: {
  onReady: (
    templateId: TemplateKey,
    data: unknown,
    opts?: { warnBoldLost?: boolean; failedSections?: string[] }
  ) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function detectAndConsume(file: File) {
    if (file.size > MAX_PDF_BYTES) {
      setErr(`PDF is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Limit is 15 MB.`);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const lines = await extractLines(file);
      // Find a template that claims to detect this PDF.
      const detected = TEMPLATES.find((t) => t.detect && t.parse && t.detect(lines));
      if (detected) {
        const { data: parsed, failedSections } = detected.parse!(lines);
        const merged = { ...detected.emptyData(), ...parsed };
        onReady(detected.id, merged, { warnBoldLost: true, failedSections });
      } else {
        // Stash file, open chooser so user picks a target template manually.
        setPendingFile(file);
        setChooserOpen(true);
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? 'Failed to parse PDF');
    } finally {
      setBusy(false);
    }
  }

  async function parseWithTemplate(t: AnyTemplateConfig) {
    if (!pendingFile) return;
    if (!t.parse) {
      // No parser → just open with that template's sample as a starting point.
      onReady(t.id, t.sampleData);
      setChooserOpen(false);
      setPendingFile(null);
      return;
    }
    setBusy(true);
    try {
      const lines = await extractLines(pendingFile);
      const { data: parsed, failedSections } = t.parse(lines);
      const merged = { ...t.emptyData(), ...parsed };
      onReady(t.id, merged, { warnBoldLost: true, failedSections });
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? 'Failed to parse PDF');
    } finally {
      setBusy(false);
      setChooserOpen(false);
      setPendingFile(null);
    }
  }

  function startBlank(t: AnyTemplateConfig) {
    onReady(t.id, t.emptyData());
  }
  function useSample(t: AnyTemplateConfig) {
    onReady(t.id, t.sampleData);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) detectAndConsume(file);
  }
  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') detectAndConsume(file);
    else if (file) setErr('Please drop a PDF file.');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-100 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="brand-mark text-3xl sm:text-4xl flex items-baseline justify-center gap-2">
            <span>IIM</span>
            <span className="brand-mark__accent">C</span>
            <span className="text-slate-700 font-medium">Resume Editor</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Pick a template, or upload a PDF and we'll detect it for you.
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Made by Abhishek Acharya, Case Collective, IIM C
          </p>
        </div>

        {/* Drop zone */}
        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.06)] border border-slate-200/70 p-5 sm:p-6 mb-8">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={
              'ui-transition relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer text-center ' +
              (dragging
                ? 'border-slate-900 bg-slate-50'
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50')
            }
          >
            <UploadIcon className="w-7 h-7 text-slate-400" />
            <div className="text-sm font-semibold text-slate-800">
              {busy ? 'Working…' : 'Drop a PDF here — we\'ll detect the template'}
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
          {err && (
            <p className="text-sm text-red-600 mt-4 text-center bg-red-50 border border-red-100 rounded-md py-2">
              {err}
            </p>
          )}
        </div>

        {/* Template gallery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {TEMPLATES.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onStartBlank={() => startBlank(t)}
              onUseSample={() => useSample(t)}
            />
          ))}
        </div>
      </div>

      {chooserOpen && pendingFile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="font-semibold text-slate-900 mb-1">
              Couldn't auto-detect the template
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Pick a template to parse this PDF with. Templates without a parser will open with sample data.
            </p>
            <div className="grid gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => parseWithTemplate(t)}
                  disabled={busy}
                  className="ui-transition text-left px-3 py-2 border border-slate-300 rounded-md hover:border-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                  <div className="font-semibold text-sm text-slate-800">{t.label}</div>
                  <div className="text-[11px] text-slate-500">
                    {t.parse ? 'Has a parser' : 'No parser — opens with sample data'}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setChooserOpen(false);
                  setPendingFile(null);
                }}
                className="ui-transition text-sm text-slate-500 hover:text-slate-800 px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onStartBlank,
  onUseSample,
}: {
  template: AnyTemplateConfig;
  onStartBlank: () => void;
  onUseSample: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="aspect-[210/297] bg-slate-50 border-b border-slate-200 flex items-center justify-center overflow-hidden">
        <img src={template.thumbnail} alt={`${template.label} preview`} className="w-full h-full object-contain" />
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="font-semibold text-slate-900 text-sm">{template.label}</div>
          <div className="text-[12px] text-slate-500 mt-1 leading-snug">{template.description}</div>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2">
          <button
            onClick={onStartBlank}
            className="ui-transition text-xs px-3 py-2 rounded-md border border-slate-300 hover:border-slate-500 hover:bg-slate-50 text-slate-700 font-medium"
          >
            Start blank
          </button>
          <button
            onClick={onUseSample}
            className="ui-transition text-xs px-3 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 font-medium"
          >
            Use sample
          </button>
        </div>
        {!template.supportsPdfUpload && (
          <div className="text-[10px] text-slate-400 italic">
            PDF upload parser not available yet — drop a PDF above and choose this template manually.
          </div>
        )}
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
