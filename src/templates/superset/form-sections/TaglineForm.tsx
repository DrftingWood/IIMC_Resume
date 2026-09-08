import type { SupersetResumeData } from '../types';
import { Accordion, Field, TextInput } from '@/components/form-shared';

export function TaglineForm({
  data,
  onChange,
}: {
  data: SupersetResumeData;
  onChange: (patch: Partial<SupersetResumeData>) => void;
}) {
  function update(i: number, v: string) {
    const t = [...data.taglines] as [string, string, string];
    t[i] = v;
    onChange({ taglines: t });
  }
  return (
    <Accordion title="Taglines (3 cells)" defaultOpen>
      {[0, 1, 2].map((i) => (
        <Field key={i} label={`Tagline ${i + 1}`}>
          <TextInput value={data.taglines[i]} onChange={(e) => update(i, e.target.value)} />
        </Field>
      ))}
    </Accordion>
  );
}
