import type { SupersetResumeData } from '../types';
import { Accordion, Field, TextInput } from '@/components/form-shared';

export function HeaderForm({
  data,
  onChange,
}: {
  data: SupersetResumeData;
  onChange: (patch: Partial<SupersetResumeData>) => void;
}) {
  return (
    <Accordion title="Header" defaultOpen>
      <Field label="Name (ALL CAPS)">
        <TextInput
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value.toUpperCase() })}
        />
      </Field>
      <Field label="MBA ID (e.g. MBA/9001/61)">
        <TextInput value={data.mbaId} onChange={(e) => onChange({ mbaId: e.target.value })} />
      </Field>
    </Accordion>
  );
}
