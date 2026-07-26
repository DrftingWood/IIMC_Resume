import { useState } from 'react';
import { reviewApi, useReviewStore } from '../useReview';
import { collectEntities, isOutdated } from '../projection';
import { ReviewAccessError } from '../api';
import type { Comment, ReviewRequest } from '../types';

export default function ReviewPanel({
  open,
  resumeId,
  data,
  onClose,
  onApplySuggestion,
}: {
  open: boolean;
  resumeId: string;
  data: unknown;
  onClose: () => void;
  onApplySuggestion: (entityId: string, text: string) => void;
}) {
  useReviewStore();
  const [tab, setTab] = useState<'mine' | 'inbox'>('mine');

  const mine = reviewApi.listRequestsByMe(resumeId);
  const inbox = reviewApi.listRequestsForMe();

  if (!open) return null;

  return (
    <aside className="no-print fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white border-l border-slate-200 shadow-xl flex flex-col">
      <header className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Review</h2>
        <button
          onClick={onClose}
          aria-label="Close review panel"
          className="ui-transition w-7 h-7 rounded hover:bg-slate-100 text-slate-500"
        >
          ✕
        </button>
      </header>

      <PersonaSwitcher />

      <div className="px-4 pt-3 flex gap-1.5">
        <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>
          My requests {mine.length > 0 && <Count n={mine.length} />}
        </TabButton>
        <TabButton active={tab === 'inbox'} onClick={() => setTab('inbox')}>
          To review {inbox.length > 0 && <Count n={inbox.length} />}
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {tab === 'mine' ? (
          mine.length === 0 ? (
            <Empty>
              No requests yet. Use the <strong>Ask for review</strong> button next to any
              bullet in the editor.
            </Empty>
          ) : (
            mine.map((r) => (
              <OwnerRequestCard
                key={r.id}
                request={r}
                liveData={data}
                onApplySuggestion={onApplySuggestion}
              />
            ))
          )
        ) : inbox.length === 0 ? (
          <Empty>
            Nothing to review. Switch persona above to see the request you just sent from
            the other side.
          </Empty>
        ) : (
          inbox.map((r) => <ReviewerCard key={r.id} request={r} />)
        )}
      </div>
    </aside>
  );
}

/* ------------------------------- owner side ------------------------------- */

function OwnerRequestCard({
  request,
  liveData,
  onApplySuggestion,
}: {
  request: ReviewRequest;
  liveData: unknown;
  onApplySuggestion: (entityId: string, text: string) => void;
}) {
  const payload = reviewApi.getReviewPayload(request.id);
  const comments = reviewApi.listComments(request.id);
  const versionData = reviewApi.getVersionData(request.version_id);
  const people = reviewApi.listPeople();

  return (
    <article className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100">
        <div className="text-[11px] text-slate-500">
          Asked {request.invitee_ids.length === 1 ? '' : `${request.invitee_ids.length} people`}{' '}
          {request.invitee_ids
            .map((id) => people.find((p) => p.id === id)?.display_name ?? '?')
            .join(', ')}
        </div>
        {request.question && (
          <p className="text-[12.5px] text-slate-800 mt-1 leading-snug">"{request.question}"</p>
        )}
      </div>

      <div className="px-3 py-2.5 space-y-1.5 border-b border-slate-100">
        {payload.entities.map((e) => (
          <p key={e.id} className="text-[12px] text-slate-700 leading-snug">
            {String(e.text ?? '')}
          </p>
        ))}
      </div>

      <div className="divide-y divide-slate-100">
        {comments.length === 0 && (
          <p className="px-3 py-3 text-[12px] text-slate-400">Waiting for a reply.</p>
        )}
        {comments.map((c) => (
          <CommentRow
            key={c.id}
            comment={c}
            stale={isOutdated(liveData, versionData, c.entity_id)}
            canResolve
            onApplySuggestion={onApplySuggestion}
          />
        ))}
      </div>
    </article>
  );
}

function CommentRow({
  comment,
  stale,
  canResolve,
  onApplySuggestion,
}: {
  comment: Comment;
  stale: boolean;
  canResolve: boolean;
  onApplySuggestion?: (entityId: string, text: string) => void;
}) {
  const author = reviewApi.listPeople().find((p) => p.id === comment.author_id);
  const [err, setErr] = useState<string | null>(null);

  function accept() {
    if (!comment.entity_id || !comment.suggested_text || !onApplySuggestion) return;
    try {
      reviewApi.setCommentStatus(comment.id, 'accepted');
      onApplySuggestion(comment.entity_id, comment.suggested_text);
    } catch (e: any) {
      setErr(e?.message ?? 'Could not accept.');
    }
  }

  function reject() {
    try {
      reviewApi.setCommentStatus(comment.id, 'rejected');
    } catch (e: any) {
      setErr(e?.message ?? 'Could not reject.');
    }
  }

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[12px] font-semibold text-slate-800">
          {author?.display_name ?? 'Someone'}
        </span>
        {author?.headline && (
          <span className="text-[10.5px] text-slate-400">{author.headline}</span>
        )}
        {comment.status !== 'open' && (
          <span
            className={
              'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ' +
              (comment.status === 'accepted'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-500')
            }
          >
            {comment.status}
          </span>
        )}
        {stale && comment.status === 'open' && (
          <span
            className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700"
            title="You have edited this bullet since the reviewer read it"
          >
            outdated
          </span>
        )}
      </div>

      {comment.body && (
        <p className="text-[12.5px] text-slate-700 mt-1 leading-snug">{comment.body}</p>
      )}

      {comment.suggested_text && (
        <div className="mt-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
            Suggested rewrite
          </div>
          <p className="text-[12px] text-slate-800 bg-emerald-50/60 border border-emerald-100 rounded-md px-2.5 py-2 leading-snug">
            {comment.suggested_text}
          </p>
          {canResolve && comment.status === 'open' && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={accept}
                className="ui-transition text-[11px] px-2.5 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 font-medium"
              >
                Accept and replace
              </button>
              <button
                onClick={reject}
                className="ui-transition text-[11px] px-2.5 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {err && <p className="text-[11px] text-red-600 mt-1">{err}</p>}
    </div>
  );
}

/* ------------------------------ reviewer side ----------------------------- */

function ReviewerCard({ request }: { request: ReviewRequest }) {
  const [body, setBody] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [err, setErr] = useState<string | null>(null);

  let payload;
  try {
    payload = reviewApi.getReviewPayload(request.id);
  } catch (e) {
    return (
      <Empty>
        {e instanceof ReviewAccessError ? e.message : 'This review is unavailable.'}
      </Empty>
    );
  }

  const comments = reviewApi.listComments(request.id);
  const entity = payload.entities[0];

  function send() {
    try {
      reviewApi.addComment({
        request_id: request.id,
        entity_id: entity?.id ?? null,
        body,
        suggested_text: suggestion,
      });
      setBody('');
      setSuggestion('');
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? 'Could not send.');
    }
  }

  return (
    <article className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100">
        <div className="text-[11px] text-slate-500">
          {payload.requester.display_name}
          {payload.requester.headline ? ` · ${payload.requester.headline}` : ''} asked
        </div>
        {payload.question && (
          <p className="text-[12.5px] text-slate-800 mt-1 leading-snug">"{payload.question}"</p>
        )}
      </div>

      <div className="px-3 py-3 space-y-1.5 border-b border-slate-100">
        {payload.entities.map((e) => (
          <p key={e.id} className="text-[12.5px] text-slate-800 leading-snug">
            {String(e.text ?? '')}
          </p>
        ))}
        <p className="text-[10.5px] text-slate-400 pt-1">
          This is everything shared with you — the rest of the resume is private.
        </p>
      </div>

      {comments.length > 0 && (
        <div className="divide-y divide-slate-100 border-b border-slate-100">
          {comments.map((c) => (
            <CommentRow key={c.id} comment={c} stale={false} canResolve={false} />
          ))}
        </div>
      )}

      <div className="px-3 py-3 space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="What works, what doesn't…"
          className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
        />
        <textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          rows={2}
          placeholder="Optional: suggest a rewrite they can accept in one click"
          className="w-full border border-emerald-200 bg-emerald-50/40 rounded-md px-2.5 py-2 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-emerald-900/10"
        />
        {err && <p className="text-[11px] text-red-600">{err}</p>}
        <button
          onClick={send}
          className="ui-transition text-[11px] px-3 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 font-medium"
        >
          Send feedback
        </button>
      </div>
    </article>
  );
}

/* --------------------------------- chrome --------------------------------- */

function PersonaSwitcher() {
  const me = reviewApi.currentUser();
  return (
    <div className="px-4 py-2 bg-amber-50/70 border-y border-amber-100">
      <div className="text-[10px] uppercase tracking-[0.08em] text-amber-800/70 font-semibold mb-1">
        Demo — no accounts yet
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-slate-600">Viewing as</label>
        <select
          value={me.id}
          onChange={(e) => reviewApi.setCurrentUser?.(e.target.value)}
          className="text-[11.5px] border border-amber-200 rounded px-1.5 py-1 bg-white"
        >
          {reviewApi.listPeople().map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'ui-transition text-[12px] px-2.5 py-1.5 rounded-md font-medium inline-flex items-center gap-1.5 ' +
        (active
          ? 'bg-slate-900 text-white'
          : 'text-slate-600 hover:bg-slate-100 border border-slate-200')
      }
    >
      {children}
    </button>
  );
}

function Count({ n }: { n: number }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 tabular-nums">{n}</span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-slate-500 leading-relaxed py-6 text-center">{children}</p>;
}
