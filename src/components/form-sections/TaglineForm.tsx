import type { ResumeData } from '@/types/resume';
import { Accordion, Field, TextInput } from './_shared';

export function TaglineForm({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (patch: Partial<ResumeData>) => void;
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
