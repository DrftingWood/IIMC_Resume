import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { measureFill } from '@/lib/lineFill';
import type { FillKind, FillReport } from '@/lib/lineFill';

/** Changes whenever the page's type geometry changes (compact mode), so every
    meter re-measures even though its own text did not change. */
export const LayoutKeyContext = createContext('');

/** One line under a point's editor: how full its printed line is. */
export function LineFill({ text, kind }: { text: string; kind: FillKind }) {
  const layoutKey = useContext(LayoutKeyContext);
  const [report, setReport] = useState<FillReport | null>(null);
  const [fontsTick, setFontsTick] = useState(0);

  // Measure after the page has rendered this text into the DOM.
  useLayoutEffect(() => {
    setReport(measureFill(text, kind));
  }, [text, kind, layoutKey, fontsTick]);

  // Web fonts (Carlito) can land after the first measurement and change
  // every width; re-measure once they are ready and on window resizes.
  useEffect(() => {
    let live = true;
    const bump = () => live && setFontsTick((n) => n + 1);
    document.fonts?.ready.then(bump);
    window.addEventListener('resize', bump);
    return () => {
      live = false;
      window.removeEventListener('resize', bump);
    };
  }, []);

  if (!report) return null;
  return <FillText report={report} />;
}

export function FillText({ report }: { report: FillReport }) {
  if (report.lines > 1) {
    return (
      <p role="status" className="text-[11px] font-medium text-red-700">
        Wraps onto {report.lines} lines · cut about {report.overflowChars} characters to fit one line
      </p>
    );
  }
  const pct = Math.round(report.fill * 100);
  // Real IIMC points end within a few characters of the edge.
  const tone =
    pct >= 92 ? 'text-emerald-700' : pct >= 75 ? 'text-amber-700' : 'text-slate-500';
  const left =
    report.charsLeft <= 1 ? 'full' : `about ${report.charsLeft} characters left`;
  return (
    <p role="status" className={`text-[11px] ${tone}`}>
      <span className="inline-block w-24 align-middle mr-2 h-1 rounded bg-slate-200 overflow-hidden">
        <span className="block h-full bg-current" style={{ width: `${pct}%` }} />
      </span>
      Line {pct}% full · {left}
    </p>
  );
}
