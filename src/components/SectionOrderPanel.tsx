import type { AnyTemplateConfig } from '@/templates/types';

/** Thin dispatcher: delegates to the template's own SectionsPanel if it has one. */
export default function SectionOrderPanel({
  template,
  data,
  onChange,
}: {
  template: AnyTemplateConfig;
  data: unknown;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const Panel = template.SectionsPanel;
  if (!Panel) {
    return (
      <div className="text-xs text-slate-500 p-2">
        This template has no section ordering controls.
      </div>
    );
  }
  return <Panel data={data} onChange={onChange} />;
}
