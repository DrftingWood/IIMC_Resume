import React, { useEffect, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import {
  loadDraft,
  saveDraft,
  clearDraft,
  getLastTemplateId,
  setLastTemplateId,
} from '@/lib/storage';
import TemplateGallery from '@/components/TemplateGallery';
import Landing from '@/components/Landing';
import EditorLayout from '@/components/EditorLayout';
import AppHeader from '@/components/AppHeader';
import ErrorBoundary from '@/components/ErrorBoundary';
import SectionOrderPanel from '@/components/SectionOrderPanel';
import { getTemplate } from '@/templates/registry';
import type { TemplateKey } from '@/templates/types';
import { ReviewProvider } from '@/review/ReviewContext';
import ReviewPanel from '@/review/components/ReviewPanel';
import AskForReviewModal from '@/review/components/AskForReviewModal';
import { replaceEntityText } from '@/review/projection';
import { reviewApi, useReviewStore } from '@/review/useReview';

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

type PreEditorView = 'landing' | 'gallery';

function AdvisoryBanner({
  tone,
  label,
  onDismiss,
  children,
}: {
  tone: 'info' | 'warn';
  label: string;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  const accent =
    tone === 'warn'
      ? 'text-amber-900 bg-amber-50/70 border-amber-200'
      : 'text-slate-700 bg-slate-50/70 border-slate-200';
  return (
    <div
      className={`no-print border-b ${accent} px-5 py-2 text-[12px] flex items-center gap-3`}
      role={tone === 'warn' ? 'alert' : 'status'}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="7" cy="7" r="5.5" />
        <path d="M7 4.5v3" />
        <path d="M7 9.5h.01" />
      </svg>
      <span className="text-[10px] uppercase tracking-[0.08em] font-semibold opacity-70">
        {label}
      </span>
      <span className="flex-1">{children}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="ui-transition inline-flex items-center justify-center w-5 h-5 rounded hover:bg-black/5 opacity-60 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

export default function App() {
  const [templateId, setTemplateId] = useState<TemplateKey | null>(null);
  const [data, setData] = useState<unknown | null>(null);
  const [preEditorView, setPreEditorView] = useState<PreEditorView>('landing');
  const [showWarning, setShowWarning] = useState(false);
  const [failedSections, setFailedSections] = useState<string[]>([]);
  const [panels, setPanels] = useState(loadPanelPrefs);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [askIds, setAskIds] = useState<string[] | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  useReviewStore();

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
    setPreEditorView('landing');
  }

  function onChangeTemplate() {
    // Return to the gallery without clearing the current draft.
    setTemplateId(null);
    setData(null);
    setPreEditorView('gallery');
  }

  // Until resumes live server-side there is one resume per template, so a
  // stable synthetic id is enough to key review requests against.
  const resumeId = templateId ? `local:${templateId}` : '';

  function applySuggestion(entityId: string, text: string) {
    setData((prev: unknown) => (prev ? replaceEntityText(prev, entityId, text) : prev));
  }

  const template = templateId ? getTemplate(templateId) : null;

  if (!templateId || !template || !data) {
    if (preEditorView === 'gallery') {
      return (
        <>
          <TemplateGallery
            onReady={(id, d) => startWith(id, d)}
            onBack={() => setPreEditorView('landing')}
          />
          <Analytics />
        </>
      );
    }
    return (
      <>
        <Landing
          onReady={(id, d, opts) => {
            startWith(id, d);
            if (opts?.warnBoldLost) setShowWarning(true);
            if (opts?.failedSections?.length) setFailedSections(opts.failedSections);
          }}
          onBrowseTemplates={() => setPreEditorView('gallery')}
        />
        <Analytics />
      </>
    );
  }

  const Form = template.Form;
  const Preview = template.Preview;

  // Review is anchored to bullet ids, which only the IIMC data model carries.
  const supportsReview = templateId === 'iimc';
  const reviewCount = supportsReview
    ? reviewApi.listRequestsByMe(resumeId).length + reviewApi.listRequestsForMe().length
    : 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader
        previewRef={previewRef}
        onReset={onReset}
        onChangeTemplate={onChangeTemplate}
        templateLabel={template.label}
        showSections={panels.showSections}
        showForm={panels.showForm}
        onToggleSections={() =>
          setPanels((p) => ({ ...p, showSections: !p.showSections }))
        }
        onToggleForm={() => setPanels((p) => ({ ...p, showForm: !p.showForm }))}
        onOpenReview={supportsReview ? () => setReviewOpen(true) : undefined}
        reviewCount={reviewCount}
      />
      {showWarning && (
        <AdvisoryBanner
          tone="info"
          onDismiss={() => setShowWarning(false)}
          label="Tip"
        >
          Inline <strong>bold</strong> formatting wasn't recovered from your upload — use the{' '}
          <strong>B</strong> button on each field to re-apply.
        </AdvisoryBanner>
      )}
      {failedSections.length > 0 && (
        <AdvisoryBanner
          tone="warn"
          onDismiss={() => setFailedSections([])}
          label="Parse"
        >
          Some sections couldn't be parsed: <strong>{failedSections.join(', ')}</strong>. Review
          and fill them in manually.
        </AdvisoryBanner>
      )}
      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>
         <ReviewProvider value={{ askForReview: (ids) => setAskIds(ids) }}>
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
         </ReviewProvider>
        </ErrorBoundary>
      </main>
      {supportsReview && (
        <>
          <ReviewPanel
            open={reviewOpen}
            resumeId={resumeId}
            data={data}
            onClose={() => setReviewOpen(false)}
            onApplySuggestion={applySuggestion}
          />
          <AskForReviewModal
            open={askIds !== null}
            resumeId={resumeId}
            templateId={templateId}
            data={data}
            entityIds={askIds ?? []}
            onClose={() => setAskIds(null)}
            onCreated={() => setReviewOpen(true)}
          />
        </>
      )}
      <Analytics />
    </div>
  );
}
