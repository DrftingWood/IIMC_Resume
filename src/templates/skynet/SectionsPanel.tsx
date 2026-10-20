import { useState } from 'react';
import type { SkynetResumeData, SectionKey, CustomSection } from './types';
import { DEFAULT_SECTION_ORDER, SECTION_LABELS, sectionLabel } from './types';
import { isCustomKey, newCustomKey } from '@/lib/customSections';
import { DensityControl } from '@/components/DensityControl';
import { countHiddenInResume } from '@/lib/visibility';

export default function SkynetSectionsPanel({
  data,
  onChange,
}: {
  data: SkynetResumeData;
  onChange: (patch: Partial<SkynetResumeData>) => void;
}) {
  const order: SectionKey[] =
    data.sectionOrder && data.sectionOrder.length
      ? data.sectionOrder
      : DEFAULT_SECTION_ORDER;
  const hidden = data.hiddenSections ?? [];
  const custom = data.customSections ?? [];
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const hiddenCount = countHiddenInResume(data);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ sectionOrder: next });
  }

  /** Reset restores the official order and titles. It deliberately keeps the
      student's own sections — those are content, not a customisation of the
      template, and losing them to a button labelled "Reset" would be a trap. */
  function reset() {
    onChange({
      sectionOrder: [...DEFAULT_SECTION_ORDER, ...custom.map((c) => c.key)],
      sectionTitles: {},
    });
  }

  /** What the rename box edits: the stored text, not the display fallback,
      so it can be cleared and retyped instead of snapping back. */
  function rawLabel(key: SectionKey): string {
    if (isCustomKey(key)) return custom.find((c) => c.key === key)?.label ?? '';
    return data.sectionTitles?.[key] ?? SECTION_LABELS[key];
  }

  /** On leaving the box, a built-in title left empty or set back to the
      official one is removed, so the section is not reported as renamed. */
  function finishRename(key: SectionKey) {
    setEditing(null);
    if (isCustomKey(key)) {
      // Take the student straight to the section's points: its editor panel
      // otherwise opens collapsed at the bottom of the form.
      requestAnimationFrame(() => {
        const panel = document.getElementById(`form-${key}`);
        if (!panel) return;
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        panel.querySelector<HTMLButtonElement>('button[aria-expanded="false"]')?.click();
      });
      return;
    }
    const value = data.sectionTitles?.[key]?.trim();
    if (value === undefined) return;
    if (!value || value === SECTION_LABELS[key]) {
      const next = { ...(data.sectionTitles ?? {}) };
      delete next[key];
      onChange({ sectionTitles: next });
    }
  }

  function rename(key: SectionKey, label: string) {
    if (isCustomKey(key)) {
      onChange({
        customSections: custom.map((c) => (c.key === key ? { ...c, label } : c)),
      });
    } else {
      onChange({ sectionTitles: { ...(data.sectionTitles ?? {}), [key]: label } });
    }
  }

  function addSection() {
    const key = newCustomKey([...order, ...custom.map((c) => c.key)]);
    const section: CustomSection = {
      key,
      // Starts empty so the name the student types is the whole name.
      label: '',
      // One empty category to type into, so the section is not a dead end in
      // the form; no blank point, which would print as an empty bullet row.
      groups: [{ category: '', bullets: [] }],
    };
    onChange({
      customSections: [...custom, section],
      sectionOrder: [...order, key],
    });
    setEditing(key);
  }

  function removeSection(key: SectionKey) {
    onChange({
      customSections: custom.filter((c) => c.key !== key),
      sectionOrder: order.filter((k) => k !== key),
      hiddenSections: hidden.filter((k) => k !== key),
    });
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
          Sections
        </h2>
        <button
          type="button"
          onClick={reset}
          className="ui-transition text-[11px] text-slate-500 hover:text-slate-800"
        >
          Restore defaults
        </button>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Reorder, rename, or switch off sections. Unticking keeps what you wrote —
        it only leaves the section out of the preview and the export.
      </p>
      <ul className="bg-white border border-slate-200/70 rounded-md overflow-hidden divide-y divide-slate-100">
        {order.map((key, i) => {
          const label = sectionLabel(data, key);
          const isHidden = hidden.includes(key);
          return (
            <li key={key} className="flex items-center gap-2 px-2.5 py-2 text-xs">
              <input
                type="checkbox"
                checked={!isHidden}
                onChange={() =>
                  onChange({
                    hiddenSections: isHidden
                      ? hidden.filter((k) => k !== key)
                      : [...hidden, key],
                  })
                }
                aria-label={`Show ${label} on resume`}
                className="w-3.5 h-3.5 accent-slate-900"
              />

              {editing === key ? (
                <input
                  autoFocus
                  value={rawLabel(key)}
                  maxLength={60}
                  placeholder={isCustomKey(key) ? 'Section name, e.g. Certifications' : SECTION_LABELS[key]}
                  aria-label={`Rename ${label}`}
                  onChange={(e) => rename(key, e.target.value)}
                  onBlur={() => finishRename(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') finishRename(key);
                  }}
                  className="flex-1 min-w-0 px-1 py-0.5 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(key)}
                  aria-label={`Rename ${label}`}
                  title="Click to rename"
                  className={
                    'flex-1 min-w-0 text-left truncate ui-transition hover:text-slate-900 ' +
                    (isHidden ? 'text-slate-500 line-through' : 'text-slate-800')
                  }
                >
                  {label}
                </button>
              )}

              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${label} up`}
                  className="ui-transition w-6 h-6 flex items-center justify-center rounded text-slate-500 disabled:opacity-30 hover:bg-slate-100"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  aria-label={`Move ${label} down`}
                  className="ui-transition w-6 h-6 flex items-center justify-center rounded text-slate-500 disabled:opacity-30 hover:bg-slate-100"
                >
                  ↓
                </button>
                {/* Delete is offered only for sections the student added. The
                    seven built-ins are switched off with the checkbox instead,
                    so their content is never destroyed by a single click. */}
                {isCustomKey(key) ? (
                  <button
                    type="button"
                    onClick={() => removeSection(key)}
                    aria-label={`Delete ${label}`}
                    className="ui-transition w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>
                ) : (
                  <span className="w-6 h-6" aria-hidden="true" />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={addSection}
        className="ui-transition w-full py-1.5 text-[11px] text-slate-500 border border-dashed border-slate-300 rounded-md hover:border-slate-400 hover:text-slate-800"
      >
        + Add section
      </button>
      {Object.entries(data.sectionTitles ?? {}).some(
        ([k, v]) => !!v?.trim() && v.trim() !== SECTION_LABELS[k as keyof typeof SECTION_LABELS]
      ) ? (
        <p className="text-[11px] text-slate-500 leading-relaxed">
          You have renamed a standard section. Placement resumes are usually
          expected to use the official headings — {SECTION_LABELS.positions} and
          the rest. Restore defaults brings them back.
        </p>
      ) : null}
      {hiddenCount > 0 && (
        <p className="text-[11px] text-slate-600">
          {hiddenCount} hidden {hiddenCount === 1 ? 'item' : 'items'} won&apos;t print. Look for
          the Hidden tag in the editor.
        </p>
      )}
      <DensityControl value={data.density} onChange={(density) => onChange({ density })} />
    </div>
  );
}
