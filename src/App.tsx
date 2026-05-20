import { useEffect, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { emptyResume, type ResumeData } from '@/types/resume';
import { loadDraft, saveDraft, clearDraft } from '@/lib/storage';
import UploadStep from '@/components/UploadStep';
import ResumeForm from '@/components/ResumeForm';
import ResumePreview from '@/components/ResumePreview';
import EditorLayout from '@/components/EditorLayout';
import AppHeader from '@/components/AppHeader';
import ErrorBoundary from '@/components/ErrorBoundary';
import SectionOrderPanel from '@/components/SectionOrderPanel';

const PANEL_PREFS_KEY = 'iimc-resume-builder:panels:v1';

function loadPanelPrefs(): { showSections: boolean; showForm: boolean } {
  try {
    const raw = localStorage.getItem(PANEL_PREFS_KEY);
    if (raw) return { showSections: true, showForm: true, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { showSections: true, showForm: true };
}

export default function App() {
  const [data, setData] = useState<ResumeData | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [failedSections, setFailedSections] = useState<string[]>([]);
  const [panels, setPanels] = useState(loadPanelPrefs);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PANEL_PREFS_KEY, JSON.stringify(panels));
    } catch {
      /* ignore */
    }
  }, [panels]);

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
      <>
        <UploadStep
          onReady={(d, opts) => {
            setData(d);
            if (opts?.warnBoldLost) setShowWarning(true);
            if (opts?.failedSections?.length) setFailedSections(opts.failedSections);
          }}
        />
        <Analytics />
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader
        previewRef={previewRef}
        onReset={onReset}
        showSections={panels.showSections}
        showForm={panels.showForm}
        onToggleSections={() =>
          setPanels((p) => ({ ...p, showSections: !p.showSections }))
        }
        onToggleForm={() => setPanels((p) => ({ ...p, showForm: !p.showForm }))}
      />
      {showWarning && (
        <div className="no-print bg-yellow-50 border-b border-yellow-200 text-yellow-900 px-4 py-2 text-xs flex justify-between items-center">
          <span>
            Heads up: inline <strong>bold</strong> formatting wasn't recovered from your upload.
            Use the <strong>B</strong> button on each field to re-apply.
          </span>
          <button onClick={() => setShowWarning(false)} className="font-bold px-2" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}
      {failedSections.length > 0 && (
        <div className="no-print bg-orange-50 border-b border-orange-200 text-orange-900 px-4 py-2 text-xs flex justify-between items-center">
          <span>
            Some sections couldn't be parsed: <strong>{failedSections.join(', ')}</strong>. Review
            and fill them in manually.
          </span>
          <button onClick={() => setFailedSections([])} className="font-bold px-2" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}
      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>
          <EditorLayout
            showSections={panels.showSections}
            showForm={panels.showForm}
            sections={<SectionOrderPanel data={data} onChange={update} />}
            form={<ResumeForm data={data} onChange={update} />}
            preview={
              <div className="f1-screen-wrap">
                <ResumePreview ref={previewRef} data={data} />
              </div>
            }
          />
        </ErrorBoundary>
      </main>
      <Analytics />
    </div>
  );
}
