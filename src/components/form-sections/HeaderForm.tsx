import type { ResumeData } from '@/types/resume';
import { Accordion, Field, TextInput } from './_shared';

export function HeaderForm({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (patch: Partial<ResumeData>) => void;
}) {
  return (
    <Accordion title="Header" defaultOpen>
      <Field label="Name (ALL CAPS)">
        <TextInput
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value.toUpperCase() })}
        />
      </Field>
      <Field label="MBA ID (e.g. MBA/0166/61)">
        <TextInput value={data.mbaId} onChange={(e) => onChange({ mbaId: e.target.value })} />
      </Field>
    </Accordion>
  );
}
