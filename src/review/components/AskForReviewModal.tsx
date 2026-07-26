import { useState } from 'react';
import { reviewApi } from '../useReview';
import { collectEntities } from '../projection';

export default function AskForReviewModal({
  open,
  resumeId,
  templateId,
  data,
  entityIds,
  onClose,
  onCreated,
}: {
  open: boolean;
  resumeId: string;
  templateId: string;
  data: unknown;
  entityIds: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const me = reviewApi.currentUser();
  const others = reviewApi.listPeople().filter((p) => p.id !== me.id);

  const [question, setQuestion] = useState('');
  const [invitees, setInvitees] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  // Exactly what the reviewer will receive — rendered here so the owner can see
  // the extent of what they are sharing before they share it.
  const preview = collectEntities(data, entityIds);

  function toggle(id: string) {
    setInvitees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit() {
    if (!invitees.length) {
      setErr('Pick at least one reviewer.');
      return;
    }
    try {
      reviewApi.createRequest({
        resume_id: resumeId,
        template_id: templateId,
        scope: 'selection',
        entity_ids: entityIds,
        question: question.trim(),
        audience: 'invited',
        invitee_ids: invitees,
        data,
      });
      setQuestion('');
      setInvitees([]);
      setErr(null);
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? 'Could not create the review request.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Ask for a review</h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {entityIds.length === 1
              ? 'One bullet, nothing else.'
              : `${entityIds.length} bullets, nothing else.`}
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.06em] text-slate-500 font-semibold mb-1.5">
              What they will see
            </div>
            <ul className="space-y-1.5">
              {preview.map((e) => (
                <li
                  key={e.id}
                  className="text-[12px] text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 leading-snug"
                >
                  {String(e.text ?? '(empty bullet)')}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Your name, grades, contact details and every other bullet stay private.
            </p>
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.06em] text-slate-500 font-semibold">
              Your question <span className="text-slate-400 normal-case">(optional)</span>
            </span>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              placeholder="Is the impact quantified well enough?"
              className="mt-1.5 w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </label>

          <div>
            <div className="text-[11px] uppercase tracking-[0.06em] text-slate-500 font-semibold mb-1.5">
              Ask
            </div>
            <div className="space-y-1.5">
              {others.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2.5 px-3 py-2 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={invitees.includes(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <span className="text-sm text-slate-800">{p.display_name}</span>
                  {p.headline && (
                    <span className="text-[11px] text-slate-400">{p.headline}</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {err && <p className="text-[12px] text-red-600">{err}</p>}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="ui-transition text-xs px-3 py-2 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="ui-transition text-xs px-3 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 font-medium"
          >
            Send request
          </button>
        </div>
      </div>
    </div>
  );
}
