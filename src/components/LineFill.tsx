import { createContext, useContext, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { measureFill } from '@/lib/lineFill';
import type { FillKind, FillReport } from '@/lib/lineFill';

/** Changes whenever the page's type geometry changes (compact mode), so every
    meter re-measures even though its own text did not change. */
export const LayoutKeyContext = createContext('');

/* One shared, frame-throttled listener for everything that changes widths:
   window resizes and late-loading web fonts (Carlito). A listener per meter
   cost ~1ms each per resize event, so 100 points stuttered while dragging. */
let tick = 0;
const subscribers = new Set<() => void>();
let frame = 0;
function bump() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    tick += 1;
    subscribers.forEach((fn) => fn());
  });
}
function subscribe(fn: () => void) {
  if (subscribers.size === 0) {
    window.addEventListener('resize', bump);
    document.fonts?.ready.then(bump);
  }
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) window.removeEventListener('resize', bump);
  };
}
const getTick = () => tick;

/** How full a point's printed line is, shown on the point's header row.
    Nothing for hidden or empty points, or when there is no page to measure. */
export function LineFill({
  text,
  kind,
  hidden = false,
}: {
  text: string;
  kind: FillKind;
  hidden?: boolean;
}) {
  const layoutKey = useContext(LayoutKeyContext);
  const widthsTick = useSyncExternalStore(subscribe, getTick, getTick);
  const [report, setReport] = useState<FillReport | null>(null);

  // Measure after the page has rendered this text into the DOM.
  useLayoutEffect(() => {
    setReport(hidden ? null : measureFill(text, kind));
  }, [text, kind, hidden, layoutKey, widthsTick]);

  if (!report) return null;
  return <FillText report={report} />;
}

/** Plain text, deliberately not a live region: announcing every point on
    every keystroke would drown a screen reader. */
export function FillText({ report }: { report: FillReport }) {
  if (report.lines > 1) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-700" data-fill="wraps">
        <Bar pct={100} className="bg-red-600" />
        {report.unbreakable
          ? 'One word is wider than the line'
          : `Runs onto ${report.lines} lines · cut about ${report.overflowChars} characters`}
      </span>
    );
  }
  const pct = Math.round(report.fill * 100);
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600" data-fill="fits">
      <Bar pct={pct} className="bg-slate-500" />
      {report.charsLeft <= 1
        ? 'Fills the line'
        : `${report.charsLeft} characters to spare`}
    </span>
  );
}

function Bar({ pct, className }: { pct: number; className: string }) {
  return (
    <span aria-hidden="true" className="inline-block h-1 w-12 overflow-hidden rounded bg-slate-200">
      <span className={`block h-full ${className}`} style={{ width: `${pct}%` }} />
    </span>
  );
}
