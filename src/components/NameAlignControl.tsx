/** Name and MBA ID at the right of the header (the official layout) or the
    left. Styled like the Page density switch. */
export function NameAlignControl({
  value,
  onChange,
}: {
  value: 'left' | 'right' | undefined;
  onChange: (v: 'left' | 'right' | undefined) => void;
}) {
  const current = value === 'left' ? 'left' : 'right';
  const options: { value: 'right' | 'left'; label: string }[] = [
    { value: 'right', label: 'Right (official)' },
    { value: 'left', label: 'Left' },
  ];
  return (
    <div>
      <span className="block text-[10.5px] font-medium uppercase tracking-[0.06em] text-slate-500 mb-1">
        Name and MBA ID position
      </span>
      <div role="radiogroup" aria-label="Name and MBA ID position" className="grid grid-cols-2 gap-1">
        {options.map((o) => {
          const on = o.value === current;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              // Right is the default, so it is stored as "no value".
              onClick={() => onChange(o.value === 'left' ? 'left' : undefined)}
              className={
                'ui-transition rounded-md border px-1.5 py-1 text-[11px] ' +
                (on
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500')
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
