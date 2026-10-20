import { DENSITIES } from '@/lib/density';
import type { Density } from '@/lib/density';

/** Official / Compact 40 / Compact 45 switch for the Sections panel. */
export function DensityControl({
  value = 'official',
  onChange,
}: {
  value?: Density;
  onChange: (d: Density) => void;
}) {
  const current = DENSITIES.find((d) => d.value === value) ?? DENSITIES[0];
  return (
    <div className="space-y-1.5 pt-1">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
        Page density
      </div>
      <div role="radiogroup" aria-label="Page density" className="grid grid-cols-3 gap-1">
        {DENSITIES.map((d) => {
          const on = d.value === current.value;
          return (
            <button
              key={d.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(d.value)}
              className={
                'ui-transition rounded-md border px-1.5 py-1 text-[11px] ' +
                (on
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500')
              }
            >
              {d.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500">Fits {current.points} on one page.</p>
      {current.value !== 'official' && (
        <p role="note" className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
          Not the official IIMC format. Rows are tighter than the placement template, so check
          that a compact resume is accepted before you submit it.
        </p>
      )}
    </div>
  );
}
