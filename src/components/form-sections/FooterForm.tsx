import type { ResumeData } from '@/types/resume';
import { Accordion, Field, TextInput } from './_shared';

export function FooterForm({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (patch: Partial<ResumeData>) => void;
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
