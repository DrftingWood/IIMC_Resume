import type { SupersetResumeData } from '../types';
import { Accordion, Field, TextInput } from '@/components/form-shared';

export function FooterForm({
  data,
  onChange,
}: {
  data: SupersetResumeData;
  onChange: (patch: Partial<SupersetResumeData>) => void;
}) {
  return (
    <Accordion title="Footer">
      <Field label="Email">
        <TextInput value={data.email} onChange={(e) => onChange({ email: e.target.value })} />
      </Field>
      <Field label="Institute">
        <TextInput value={data.institute} onChange={(e) => onChange({ institute: e.target.value })} />
      </Field>
    </Accordion>
  );
}
