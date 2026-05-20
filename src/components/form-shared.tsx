import React, { useState } from 'react';

export function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200/70 rounded-lg bg-white mb-2.5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ui-transition w-full flex items-center justify-between px-3 py-2.5 text-left font-semibold text-sm text-slate-800 bg-white hover:bg-slate-50"
        aria-expanded={open}
      >
        <span>{title}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 space-y-3 border-t border-slate-100">{children}</div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={'text-slate-400 ui-transition ' + (open ? 'rotate-180' : '')}
    >
      <path d="M3 4.5 6 8l3-3.5" />
    </svg>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10.5px] font-medium uppercase tracking-[0.06em] text-slate-500 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      {...props}
      className={
        'ui-transition w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900/15 focus:border-slate-900 ' +
        (props.className ?? '')
      }
    />
  );
}

export function BoldableTextarea({
  value,
  onChange,
  rows = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  function applyBold() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return;
    const selected = value.slice(start, end);
    const wrapped = `**${selected}**`;
    const next = value.slice(0, start) + wrapped + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + 2, end + 2);
    });
  }

  return (
    <div className="ui-transition border border-slate-300 rounded-md overflow-hidden focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900/15">
      <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 border-b border-slate-200">
        <button
          type="button"
          onClick={applyBold}
          aria-label="Bold selected text"
          className="ui-transition inline-flex items-center justify-center w-6 h-6 border border-slate-300 rounded text-slate-700 text-[11px] font-bold hover:bg-white hover:border-slate-500"
          title="Select text, then click B to wrap in **bold**"
        >
          B
        </button>
        <span className="text-[10px] text-slate-500">Select text + B to bold</span>
      </div>
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none resize-y"
      />
    </div>
  );
}

export function RowControls({
  onUp,
  onDown,
  onDelete,
}: {
  onUp?: () => void;
  onDown?: () => void;
  onDelete: () => void;
}) {
  const base =
    'ui-transition inline-flex items-center justify-center w-6 h-6 border rounded';
  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={onUp}
        disabled={!onUp}
        aria-label="Move row up"
        className={`${base} border-slate-300 text-slate-600 disabled:opacity-30 hover:bg-slate-100 hover:border-slate-500`}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={!onDown}
        aria-label="Move row down"
        className={`${base} border-slate-300 text-slate-600 disabled:opacity-30 hover:bg-slate-100 hover:border-slate-500`}
      >
        ↓
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete row"
        className={`${base} border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300`}
      >
        ✕
      </button>
    </div>
  );
}

export function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-transition text-sm border border-dashed border-slate-300 rounded-md px-3 py-2 hover:bg-slate-50 hover:border-slate-500 text-slate-600 w-full"
    >
      + {label}
    </button>
  );
}

export function EmptyHint({ text }: { text: string }) {
  return (
    <div className="text-xs italic text-slate-400 px-1 pb-1">{text}</div>
  );
}

export function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const out = arr.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
