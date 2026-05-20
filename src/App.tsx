import { useEffect, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import {
  loadDraft,
  saveDraft,
  clearDraft,
  getLastTemplateId,
  setLastTemplateId,
} from '@/lib/storage';
import TemplateGallery from '@/components/TemplateGallery';
import EditorLayout from '@/components/EditorLayout';
import AppHeader from '@/components/AppHeader';
import ErrorBoundary from '@/components/ErrorBoundary';
import SectionOrderPanel from '@/components/SectionOrderPanel';
import { getTemplate } from '@/templates/registry';
import type { TemplateKey } from '@/templates/types';

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
  const [templateId, setTemplateId] = useState<TemplateKey | null>(null);
  const [data, setData] = useState<unknown | null>(null);
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

  // Boot: restore last template + its draft.
  useEffect(() => {
    const last = getLastTemplateId();
    if (!last) return;
    const tpl = getTemplate(last);
    if (!tpl) return;
    const raw = loadDraft<any>(last);
    if (!raw) return;
    const hydrated = tpl.hydrate ? tpl.hydrate(raw) : raw;
    setTemplateId(last);
    setData(hydrated);
  }, []);

  // Persist draft (debounced).
  useEffect(() => {
    if (!templateId || !data) return;
    const t = setTimeout(() => saveDraft(templateId, data), 500);
    return () => clearTimeout(t);
  }, [templateId, data]);

  function update(patch: Record<string, unknown>) {
    setData((prev: unknown) => (prev ? { ...(prev as object), ...patch } : prev));
  }

  function startWith(id: TemplateKey, initial: unknown) {
    const tpl = getTemplate(id);
    if (!tpl) return;
    const hydrated = tpl.hydrate ? tpl.hydrate(initial as any) : initial;
    setTemplateId(id);
    setData(hydrated);
    setLastTemplateId(id);
  }

  function onReset() {
    if (!confirm('Reset all data? This clears your draft.')) return;
    if (templateId) clearDraft(templateId);
    setTemplateId(null);
    setData(null);
  }

  const template = templateId ? getTemplate(templateId) : null;

  if (!templateId || !template || !data) {
    return (
      <>
        <TemplateGallery
          onReady={(id, d, opts) => {
            startWith(id, d);
            if (opts?.warnBoldLost) setShowWarning(true);
            if (opts?.failedSections?.length) setFailedSections(opts.failedSections);
          }}
        />
        <Analytics />
      </>
    );
  }

  const Form = template.Form;
  const Preview = template.Preview;

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
            sections={<SectionOrderPanel template={template} data={data} onChange={update} />}
            form={<Form data={data} onChange={update} />}
            preview={
              <div className="preview-screen-wrap">
                <Preview ref={previewRef} data={data} />
              </div>
            }
          />
        </ErrorBoundary>
      </main>
      <Analytics />
    </div>
  );
}
