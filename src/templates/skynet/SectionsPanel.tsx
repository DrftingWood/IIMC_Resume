import { useState } from 'react';
import type { SkynetResumeData, SectionKey, CustomSection } from './types';
import { DEFAULT_SECTION_ORDER, SECTION_LABELS, sectionLabel } from './types';
import { isCustomKey, newCustomKey } from '@/lib/customSections';

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
      label: 'New Section',
      // One empty category to type into, so the section is not a dead end in
      // the form the moment it is added.
      groups: [{ category: '', bullets: [{ text: '', year: '' }] }],
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
          className="ui-transition text-[11px] text-slate-400 hover:text-slate-800"
        >
          Reset
        </button>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
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
                aria-label={label}
                className="w-3.5 h-3.5 accent-slate-900"
              />

              {editing === key ? (
                <input
                  autoFocus
                  value={label}
                  aria-label={`Rename ${label}`}
                  onChange={(e) => rename(key, e.target.value)}
                  onBlur={() => setEditing(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') setEditing(null);
                  }}
                  className="flex-1 min-w-0 px-1 py-0.5 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(key)}
                  title="Rename"
                  className={
                    'flex-1 min-w-0 text-left truncate ui-transition hover:text-slate-900 ' +
                    (isHidden ? 'text-slate-400 line-through' : 'text-slate-800')
                  }
                >
                  {label}
                </button>
              )}

              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditing(key)}
                  aria-label={`Rename ${label}`}
                  className="ui-transition w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  ✎
                </button>
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
                    className="ui-transition w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600"
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
      {Object.keys(data.sectionTitles ?? {}).length > 0 ? (
        <p className="text-[11px] text-slate-400 leading-relaxed">
          You have renamed a standard section. Placement resumes are usually
          expected to use the official headings — {SECTION_LABELS.positions} and
          the rest. Reset restores them.
        </p>
      ) : null}
    </div>
  );
}
