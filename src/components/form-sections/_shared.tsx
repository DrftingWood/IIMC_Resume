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
    <div className="border border-gray-200 rounded-md bg-white mb-3 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-sm bg-gray-50 hover:bg-gray-100"
      >
        <span>{title}</span>
        <span className="text-gray-500">{open ? '–' : '+'}</span>
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
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
      <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
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
        'w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
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
    <div className="border border-gray-300 rounded overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 border-b border-gray-200">
        <button
          type="button"
          onClick={applyBold}
          className="text-xs font-bold px-2 py-0.5 rounded hover:bg-gray-200"
          title="Select text and click B to wrap in **bold**"
        >
          B
        </button>
        <span className="text-[10px] text-gray-500">Select text + B to bold</span>
      </div>
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1 text-sm focus:outline-none resize-y"
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
  return (
    <div className="flex gap-1 text-xs">
      <button
        type="button"
        onClick={onUp}
        disabled={!onUp}
        className="px-2 py-1 border border-gray-300 rounded disabled:opacity-30 hover:bg-gray-100"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={!onDown}
        className="px-2 py-1 border border-gray-300 rounded disabled:opacity-30 hover:bg-gray-100"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="px-2 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50"
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
      className="text-sm border border-dashed border-gray-400 rounded px-3 py-1.5 hover:bg-gray-100 w-full"
    >
      + {label}
    </button>
  );
}

export function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const out = arr.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
