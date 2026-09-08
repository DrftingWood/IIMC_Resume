import React, { useEffect, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import {
  loadDraft,
  saveDraft,
  clearDraft,
  getLastTemplateId,
  setLastTemplateId,
} from '@/lib/storage';
import Landing from '@/components/Landing';
import EditorLayout from '@/components/EditorLayout';
import AppHeader from '@/components/AppHeader';
import ErrorBoundary from '@/components/ErrorBoundary';
import SectionOrderPanel from '@/components/SectionOrderPanel';
import { getTemplate } from '@/templates/registry';
import { usePageOverflow } from '@/lib/usePageOverflow';
import { emptyHistory, record, undo as undoHistory, canUndo } from '@/lib/history';
import type { TemplateKey } from '@/templates/types';
import { migrateBetweenBatches } from '@/lib/migrateBatch';

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
  const [showWarning, setShowWarning] = useState(false);
  const [failedSections, setFailedSections] = useState<string[]>([]);
  const [panels, setPanels] = useState(loadPanelPrefs);
  const previewRef = useRef<HTMLDivElement>(null);
  const overflow = usePageOverflow(previewRef, Boolean(templateId && data));
  const [overflowDismissed, setOverflowDismissed] = useState(false);
  const [history, setHistory] = useState(() => emptyHistory<unknown>());
  // Re-arm the warning once the resume fits again, so dismissing it once does
  // not hide a later overflow the student introduces by adding more content.
  useEffect(() => {
    if (overflow.fits) setOverflowDismissed(false);
  }, [overflow.fits]);

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
    setData((prev: unknown) => {
      if (!prev) return prev;
      // Snapshot the state BEFORE the change. Bursts of keystrokes coalesce so
      // one undo steps back over the burst rather than a single character.
      setHistory((h) => record(h, prev, Date.now()));
      return { ...(prev as object), ...patch };
    });
  }

  function onUndo() {
    setHistory((h) => {
      const { history: next, snapshot } = undoHistory(h);
      if (snapshot !== undefined) setData(snapshot);
      return next;
    });
  }

  // Ctrl/Cmd+Z, except while typing in a field where the browser's own
  // text undo is the more useful behaviour.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
      e.preventDefault();
      onUndo();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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

  function onChangeTemplate() {
    if (!templateId) return;
    const next: TemplateKey = templateId === 'skynet' ? 'superset' : 'skynet';
    const { data: migrated, dropped } = migrateBetweenBatches(templateId, next, data);
    if (dropped.length) {
      const list = dropped.map((d) => `the "${d}" section`).join(' and ');
      if (!confirm(`Switching to ${getTemplate(next)!.codename} will permanently delete ${list}. Continue?`)) {
        return;
      }
    }
    setTemplateId(next);
    setData(migrated);
    setLastTemplateId(next);
  }

  const template = templateId ? getTemplate(templateId) : null;

  if (!templateId || !template || !data) {
    return (
      <>
        <Landing
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
        onUndo={onUndo}
        canUndo={canUndo(history)}
        onReset={onReset}
        onChangeTemplate={onChangeTemplate}
        templateLabel={template.label}
        showSections={panels.showSections}
        showForm={panels.showForm}
        onToggleSections={() =>
          setPanels((p) => ({ ...p, showSections: !p.showSections }))
        }
        onToggleForm={() => setPanels((p) => ({ ...p, showForm: !p.showForm }))}
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
      {!overflow.fits && !overflowDismissed && (
        <AdvisoryBanner
          tone="warn"
          onDismiss={() => setOverflowDismissed(true)}
          label="Length"
        >
          This resume is <strong>{overflow.pages} pages</strong> long — about{' '}
          <strong>{overflow.overflowPt}pt</strong> over a single A4 sheet, so the export
          will spill onto a second page. Trim bullets, or hide a section you are not using.
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
