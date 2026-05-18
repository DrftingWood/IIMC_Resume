import type { ResumeData, EducationRow } from '@/types/resume';
import { Accordion, Field, TextInput, RowControls, AddButton, move } from './_shared';

export function EducationForm({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (patch: Partial<ResumeData>) => void;
}) {
  function update(i: number, patch: Partial<EducationRow>) {
    const next = data.education.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange({ education: next });
  }
  function add() {
    onChange({ education: [...data.education, { degree: '', institute: '', gpa: '', year: '' }] });
  }
  function remove(i: number) {
    onChange({ education: data.education.filter((_, idx) => idx !== i) });
  }
  function moveRow(i: number, dir: -1 | 1) {
    onChange({ education: move(data.education, i, dir) });
  }
  return (
    <Accordion title="Academic Qualifications">
      {data.education.map((r, i) => (
        <div key={i} className="border border-gray-200 rounded p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Row {i + 1}</span>
            <RowControls
              onUp={i > 0 ? () => moveRow(i, -1) : undefined}
              onDown={i < data.education.length - 1 ? () => moveRow(i, 1) : undefined}
              onDelete={() => remove(i)}
            />
          </div>
          <Field label="Degree/Exam">
            <TextInput value={r.degree} onChange={(e) => update(i, { degree: e.target.value })} />
          </Field>
          <Field label="Board/Institute">
            <TextInput value={r.institute} onChange={(e) => update(i, { institute: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="%/CGPA">
              <TextInput value={r.gpa} onChange={(e) => update(i, { gpa: e.target.value })} />
            </Field>
            <Field label="Year">
              <TextInput value={r.year} onChange={(e) => update(i, { year: e.target.value })} />
            </Field>
          </div>
        </div>
      ))}
      <AddButton onClick={add} label="Add education row" />
    </Accordion>
  );
}
