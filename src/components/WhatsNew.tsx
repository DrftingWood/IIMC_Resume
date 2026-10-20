import { useState } from 'react';
import { RELEASE, dismissKey, isReleaseFresh } from '@/lib/releaseNotes';
import type { Release, ReleaseNote } from '@/lib/releaseNotes';

function wasDismissed(release: Release): boolean {
  try {
    return localStorage.getItem(dismissKey(release)) === '1';
  } catch {
    return false;
  }
}

const KIND_STYLE: Record<ReleaseNote['kind'], string> = {
  New: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Improved: 'bg-sky-50 text-sky-700 border-sky-200',
  Fixed: 'bg-amber-50 text-amber-800 border-amber-200',
};

/**
 * Release notes card on the landing page. It sits in the page flow (no
 * overlay, nothing covered), shows for SHOW_DAYS after a release, and stays
 * closed once dismissed on this browser.
 */
export function WhatsNew({
  release = RELEASE,
  now = Date.now(),
}: {
  release?: Release;
  now?: number;
}) {
  const [open, setOpen] = useState(() => isReleaseFresh(release, now) && !wasDismissed(release));
  // Titles only by default: the full notes pushed the upload card below the
  // fold on a 768px-tall laptop screen.
  const [details, setDetails] = useState(false);
  if (!open) return null;

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(dismissKey(release), '1');
    } catch {
      /* Private mode or blocked storage: it just shows again next visit. */
    }
  }

  const date = new Date(release.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section
      aria-labelledby="whats-new-title"
      className="relative mb-6 rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6 text-left shadow-[var(--shadow-card)]"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close what's new"
        className="ui-transition absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
      <div className="flex items-center gap-2 pr-8">
        <h2 id="whats-new-title" className="text-sm font-semibold text-slate-900">
          What's new
        </h2>
        <span className="text-[11px] text-slate-500">· {date}</span>
      </div>
      <ol className={'mt-3 list-none ' + (details ? 'space-y-3' : 'space-y-1.5')}>
        {release.notes.map((n, i) => (
          <li key={n.title} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600"
            >
              {i + 1}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[13px] font-semibold text-slate-800">{n.title}</span>
                <span className={`rounded border px-1.5 text-[10px] font-medium ${KIND_STYLE[n.kind]}`}>
                  {n.kind}
                </span>
              </div>
              {details && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{n.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => setDetails((d) => !d)}
        aria-expanded={details}
        className="ui-transition mt-3 text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
      >
        {details ? 'Hide details' : 'Show details'}
      </button>
    </section>
  );
}
