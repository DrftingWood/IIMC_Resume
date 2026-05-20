import { TEMPLATES } from '@/templates/registry';
import type { AnyTemplateConfig } from '@/templates/types';

export default function TemplateChooserModal({
  open,
  busy = false,
  onPick,
  onCancel,
  title = "Couldn't auto-detect the template",
  body = 'Pick a template to parse this PDF with. Templates without a parser will open with sample data.',
}: {
  open: boolean;
  busy?: boolean;
  onPick: (template: AnyTemplateConfig) => void;
  onCancel: () => void;
  title?: string;
  body?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
        <div className="font-semibold text-slate-900 mb-1">{title}</div>
        <p className="text-sm text-slate-600 mb-4">{body}</p>
        <div className="grid gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t)}
              disabled={busy}
              className="ui-transition text-left px-3 py-2 border border-slate-300 rounded-md hover:border-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              <div className="font-semibold text-sm text-slate-800">{t.label}</div>
              <div className="text-[11px] text-slate-500">
                {t.parse ? 'Has a parser' : 'No parser — opens with sample data'}
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={onCancel}
            className="ui-transition text-sm text-slate-500 hover:text-slate-800 px-3 py-1.5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
