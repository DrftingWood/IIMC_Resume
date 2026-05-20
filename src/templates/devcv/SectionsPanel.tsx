import type { DevCvData, DevCvSection } from './types';

export default function DevCvSectionsPanel({
  data,
  onChange,
}: {
  data: DevCvData;
  onChange: (patch: Partial<DevCvData>) => void;
}) {
  function moveSection(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= data.sections.length) return;
    const next = [...data.sections];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ sections: next });
  }
  function rename(i: number, title: string) {
    const next = data.sections.map((s, idx) =>
      idx === i ? ({ ...s, title } as DevCvSection) : s
    );
    onChange({ sections: next });
  }
  return (
    <div className="space-y-2.5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
        Section Order
      </h2>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Reorder sections or rename them inline. Use the editor panel to add or remove sections.
      </p>
      <ul className="bg-white border border-slate-200/70 rounded-md overflow-hidden divide-y divide-slate-100">
        {data.sections.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 px-2.5 py-2 text-xs">
            <input
              value={s.title}
              onChange={(e) => rename(i, e.target.value)}
              className="flex-1 bg-transparent border-0 px-0 py-0 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900/15 rounded-sm"
              placeholder={`Section ${i + 1}`}
            />
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              {s.kind}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => moveSection(i, -1)}
                disabled={i === 0}
                aria-label="Move section up"
                className="ui-transition w-6 h-6 flex items-center justify-center rounded text-slate-500 disabled:opacity-30 hover:bg-slate-100"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveSection(i, 1)}
                disabled={i === data.sections.length - 1}
                aria-label="Move section down"
                className="ui-transition w-6 h-6 flex items-center justify-center rounded text-slate-500 disabled:opacity-30 hover:bg-slate-100"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
        {data.sections.length === 0 && (
          <li className="text-xs text-slate-400 italic px-3 py-2">No sections yet.</li>
        )}
      </ul>
    </div>
  );
}
