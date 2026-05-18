import { useEffect, useRef, useState } from 'react';
import { emptyResume, type ResumeData } from '@/types/resume';
import { loadDraft, saveDraft, clearDraft } from '@/lib/storage';
import UploadStep from '@/components/UploadStep';
import ResumeForm from '@/components/ResumeForm';
import ResumePreview from '@/components/ResumePreview';
import EditorLayout from '@/components/EditorLayout';
import AppHeader from '@/components/AppHeader';

export default function App() {
  const [data, setData] = useState<ResumeData | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) setData(draft);
  }, []);

  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => saveDraft(data), 500);
    return () => clearTimeout(t);
  }, [data]);

  function update(patch: Partial<ResumeData>) {
    setData((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function onReset() {
    if (!confirm('Reset all data? This clears your draft.')) return;
    clearDraft();
    setData(null);
  }

  if (!data) {
    return (
      <UploadStep
        onReady={(d, opts) => {
          setData(d);
          if (opts?.warnBoldLost) setShowWarning(true);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader previewRef={previewRef} onReset={onReset} />
      {showWarning && (
        <div className="no-print bg-yellow-50 border-b border-yellow-200 text-yellow-900 px-4 py-2 text-xs flex justify-between items-center">
          <span>
            Heads up: inline <strong>bold</strong> formatting wasn't recovered from your upload.
            Use the <strong>B</strong> button on each field to re-apply.
          </span>
          <button onClick={() => setShowWarning(false)} className="font-bold px-2">
            ✕
          </button>
        </div>
      )}
      <main className="flex-1 overflow-hidden">
        <EditorLayout
          form={<ResumeForm data={data} onChange={update} />}
          preview={
            <div className="f1-screen-wrap">
              <ResumePreview ref={previewRef} data={data} />
            </div>
          }
        />
      </main>
    </div>
  );
}
