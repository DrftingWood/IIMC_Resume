import { TEMPLATES } from '@/templates/registry';
import type { AnyTemplateConfig, TemplateKey } from '@/templates/types';

export default function TemplateGallery({
  onReady,
  onBack,
}: {
  onReady: (templateId: TemplateKey, data: unknown) => void;
  onBack: () => void;
}) {
  function startBlank(t: AnyTemplateConfig) {
    onReady(t.id, t.emptyData());
  }
  function useSample(t: AnyTemplateConfig) {
    onReady(t.id, t.sampleData);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-100 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={onBack}
          className="ui-transition text-xs text-slate-500 hover:text-slate-800 mb-6 inline-flex items-center gap-1"
        >
          <span>←</span> <span>Back to home</span>
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Choose a template</h1>
          <p className="mt-2 text-sm text-slate-500">
            Pick a layout to start from. You can switch templates later from the editor.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {TEMPLATES.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onStartBlank={() => startBlank(t)}
              onUseSample={() => useSample(t)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onStartBlank,
  onUseSample,
}: {
  template: AnyTemplateConfig;
  onStartBlank: () => void;
  onUseSample: () => void;
}) {
  return (
    <div className="ui-transition hover-lift bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-[var(--shadow-card)]">
      <div className="relative aspect-[210/297] bg-slate-50 border-b border-slate-200 flex items-center justify-center overflow-hidden">
        <img
          src={template.thumbnail}
          alt={`${template.label} preview`}
          className="w-full h-full object-contain"
        />
        {!template.supportsPdfUpload && (
          <span className="absolute top-2 right-2 text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 bg-white/90 backdrop-blur border border-slate-200 rounded text-slate-500">
            No PDF parser
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="font-semibold text-slate-900 text-sm">{template.label}</div>
          <div className="text-[12px] text-slate-500 mt-1 leading-snug">
            {template.description}
          </div>
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={onUseSample}
            className="ui-transition text-xs px-3 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 font-medium"
          >
            Use sample
          </button>
          <button
            onClick={onStartBlank}
            className="ui-transition text-xs px-3 py-2 rounded-md border border-slate-300 hover:border-slate-500 hover:bg-slate-50 text-slate-700 font-medium"
          >
            Start blank
          </button>
        </div>
      </div>
    </div>
  );
}
