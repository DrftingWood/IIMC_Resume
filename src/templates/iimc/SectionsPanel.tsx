import type { IimcResumeData, SectionKey } from './types';
import { DEFAULT_SECTION_ORDER, SECTION_LABELS } from './types';

export default function IimcSectionsPanel({
  data,
  onChange,
}: {
  data: IimcResumeData;
  onChange: (patch: Partial<IimcResumeData>) => void;
}) {
  const order: SectionKey[] =
    data.sectionOrder && data.sectionOrder.length
      ? data.sectionOrder
      : DEFAULT_SECTION_ORDER;

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ sectionOrder: next });
  }

  function reset() {
    onChange({ sectionOrder: [...DEFAULT_SECTION_ORDER] });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Section Order</h2>
        <button
          type="button"
          onClick={reset}
          className="ui-transition text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2"
        >
          Reset
        </button>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Reorder how sections appear in the preview and export.
      </p>
      <ul className="space-y-1.5">
        {order.map((key, i) => (
          <li
            key={key}
            className="flex items-center gap-2 px-2.5 py-2 bg-white border border-slate-200 rounded-md text-xs"
          >
            <span className="flex-1 text-slate-800">{SECTION_LABELS[key]}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Move ${SECTION_LABELS[key]} up`}
                className="ui-transition w-6 h-6 flex items-center justify-center border border-slate-300 rounded text-slate-600 disabled:opacity-30 hover:bg-slate-100 hover:border-slate-400"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === order.length - 1}
                aria-label={`Move ${SECTION_LABELS[key]} down`}
                className="ui-transition w-6 h-6 flex items-center justify-center border border-slate-300 rounded text-slate-600 disabled:opacity-30 hover:bg-slate-100 hover:border-slate-400"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
