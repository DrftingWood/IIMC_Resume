import type { SupersetResumeData, EducationRow } from '../types';
import { Accordion, Field, TextInput, RowControls, AddButton, move } from '@/components/form-shared';

export function EducationForm({
  data,
  onChange,
}: {
  data: SupersetResumeData;
  onChange: (patch: Partial<SupersetResumeData>) => void;
}) {
  function update(i: number, patch: Partial<EducationRow>) {
    const next = data.education.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange({ education: next });
  }
  function add() {
    onChange({ education: [...data.education, { degree: '', institute: '', gpa: '', rank: '', year: '' }] });
  }
  function setResumeType(t: 'ranked' | 'unranked') {
    if (t === 'unranked') {
      onChange({
        resumeType: t,
        education: data.education.map((r) => ({ ...r, rank: '' })),
      });
    } else {
      onChange({ resumeType: t });
    }
  }
  const ranked = data.resumeType === 'ranked';
  function remove(i: number) {
    onChange({ education: data.education.filter((_, idx) => idx !== i) });
  }
  function moveRow(i: number, dir: -1 | 1) {
    onChange({ education: move(data.education, i, dir) });
  }
  return (
    <Accordion title="Academic Qualifications">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-600">Resume type:</span>
        <button
          type="button"
          onClick={() => setResumeType('unranked')}
          className={
            'px-2 py-1 rounded border ' +
            (!ranked
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-300')
          }
        >
          Unranked
        </button>
        <button
          type="button"
          onClick={() => setResumeType('ranked')}
          className={
            'px-2 py-1 rounded border ' +
            (ranked
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-300')
          }
        >
          Ranked
        </button>
      </div>
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
          <div className={ranked ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2'}>
            <Field label="%/CGPA">
              <TextInput value={r.gpa} onChange={(e) => update(i, { gpa: e.target.value })} />
            </Field>
            {ranked && (
              <Field label="Rank">
                <TextInput value={r.rank ?? ''} onChange={(e) => update(i, { rank: e.target.value })} />
              </Field>
            )}
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
