import type { IimcResumeData, ExperienceEntry, ExperienceSubSection } from '../types';
import { newBullet, newExperienceEntry, newExperienceSubSection } from '../types';
import { Accordion, Field, TextInput, BoldableTextarea, RowControls, AddButton, move } from '@/components/form-shared';
import { AskForReviewButton } from '@/review/ReviewContext';

export function IndustryForm({
  data,
  onChange,
}: {
  data: IimcResumeData;
  onChange: (patch: Partial<IimcResumeData>) => void;
}) {
  function setEntry(ei: number, patch: Partial<ExperienceEntry>) {
    onChange({
      experience: data.experience.map((e, i) => (i === ei ? { ...e, ...patch } : e)),
    });
  }
  function setSub(ei: number, si: number, patch: Partial<ExperienceSubSection>) {
    setEntry(ei, {
      subSections: data.experience[ei].subSections.map((s, j) =>
        j === si ? { ...s, ...patch } : s
      ),
    });
  }
  function addEntry() {
    onChange({
      experience: [...data.experience, newExperienceEntry('Full Time')],
    });
  }
  function removeEntry(ei: number) {
    onChange({ experience: data.experience.filter((_, i) => i !== ei) });
  }
  function moveEntry(ei: number, dir: -1 | 1) {
    onChange({ experience: move(data.experience, ei, dir) });
  }
  function addSub(ei: number) {
    setEntry(ei, {
      subSections: [...data.experience[ei].subSections, newExperienceSubSection()],
    });
  }
  function removeSub(ei: number, si: number) {
    setEntry(ei, {
      subSections: data.experience[ei].subSections.filter((_, j) => j !== si),
    });
  }
  function addBullet(ei: number, si: number) {
    setSub(ei, si, { bullets: [...data.experience[ei].subSections[si].bullets, newBullet()] });
  }
  function setBullet(ei: number, si: number, bi: number, v: string) {
    const arr = [...data.experience[ei].subSections[si].bullets];
    arr[bi] = { ...arr[bi], text: v };
    setSub(ei, si, { bullets: arr });
  }
  function removeBullet(ei: number, si: number, bi: number) {
    setSub(ei, si, {
      bullets: data.experience[ei].subSections[si].bullets.filter((_, k) => k !== bi),
    });
  }
  function moveBullet(ei: number, si: number, bi: number, dir: -1 | 1) {
    setSub(ei, si, { bullets: move(data.experience[ei].subSections[si].bullets, bi, dir) });
  }

  return (
    <Accordion title="Industry Experience">
      <Field label="Right-side header text">
        <TextInput
          value={data.industryRightText}
          onChange={(e) => onChange({ industryRightText: e.target.value })}
        />
      </Field>

      {data.experience.map((entry, ei) => (
        <div key={entry.id} className="border border-gray-200 rounded p-3 bg-gray-50 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold">Entry {ei + 1}</span>
            <RowControls
              onUp={ei > 0 ? () => moveEntry(ei, -1) : undefined}
              onDown={ei < data.experience.length - 1 ? () => moveEntry(ei, 1) : undefined}
              onDelete={() => removeEntry(ei)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type (Full Time / Intern)">
              <TextInput value={entry.type} onChange={(e) => setEntry(ei, { type: e.target.value })} />
            </Field>
            <Field label="Dates (e.g. Aug`22 - May`24)">
              <TextInput value={entry.dates} onChange={(e) => setEntry(ei, { dates: e.target.value })} />
            </Field>
            <Field label="Firm">
              <TextInput value={entry.firm} onChange={(e) => setEntry(ei, { firm: e.target.value })} />
            </Field>
            <Field label="Role">
              <TextInput value={entry.role} onChange={(e) => setEntry(ei, { role: e.target.value })} />
            </Field>
          </div>

          {entry.subSections.map((sub, si) => (
            <div key={sub.id} className="border border-gray-200 rounded p-2 bg-white space-y-2">
              <div className="flex justify-between items-center">
                <Field label="Sub-section label">
                  <TextInput value={sub.label} onChange={(e) => setSub(ei, si, { label: e.target.value })} />
                </Field>
                <RowControls onDelete={() => removeSub(ei, si)} />
              </div>
              {sub.bullets.map((b, bi) => (
                <div key={b.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">Bullet {bi + 1}</span>
                      <AskForReviewButton entityId={b.id} />
                    </div>
                    <RowControls
                      onUp={bi > 0 ? () => moveBullet(ei, si, bi, -1) : undefined}
                      onDown={bi < sub.bullets.length - 1 ? () => moveBullet(ei, si, bi, 1) : undefined}
                      onDelete={() => removeBullet(ei, si, bi)}
                    />
                  </div>
                  <BoldableTextarea value={b.text} onChange={(v) => setBullet(ei, si, bi, v)} />
                </div>
              ))}
              <AddButton onClick={() => addBullet(ei, si)} label="Add bullet" />
            </div>
          ))}
          <AddButton onClick={() => addSub(ei)} label="Add sub-section" />
        </div>
      ))}
      <AddButton onClick={addEntry} label="Add experience entry" />
    </Accordion>
  );
}
