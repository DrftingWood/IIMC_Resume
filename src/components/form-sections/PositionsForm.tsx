import type { ResumeData, PositionEntry } from '@/types/resume';
import { Accordion, Field, TextInput, BoldableTextarea, RowControls, AddButton, move } from './_shared';

export function PositionsForm({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (patch: Partial<ResumeData>) => void;
}) {
  function setPos(pi: number, patch: Partial<PositionEntry>) {
    onChange({ positions: data.positions.map((p, i) => (i === pi ? { ...p, ...patch } : p)) });
  }
  function addPos() {
    onChange({ positions: [...data.positions, { title: '', bullets: [], year: '' }] });
  }
  function removePos(pi: number) {
    onChange({ positions: data.positions.filter((_, i) => i !== pi) });
  }
  function movePos(pi: number, dir: -1 | 1) {
    onChange({ positions: move(data.positions, pi, dir) });
  }
  function addBullet(pi: number) {
    setPos(pi, { bullets: [...data.positions[pi].bullets, ''] });
  }
  function setBullet(pi: number, bi: number, v: string) {
    const arr = [...data.positions[pi].bullets];
    arr[bi] = v;
    setPos(pi, { bullets: arr });
  }
  function removeBullet(pi: number, bi: number) {
    setPos(pi, { bullets: data.positions[pi].bullets.filter((_, j) => j !== bi) });
  }
  function moveBullet(pi: number, bi: number, dir: -1 | 1) {
    setPos(pi, { bullets: move(data.positions[pi].bullets, bi, dir) });
  }
  return (
    <Accordion title="Positions of Responsibility">
      {data.positions.map((p, pi) => (
        <div key={pi} className="border border-gray-200 rounded p-3 bg-gray-50 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold">Position {pi + 1}</span>
            <RowControls
              onUp={pi > 0 ? () => movePos(pi, -1) : undefined}
              onDown={pi < data.positions.length - 1 ? () => movePos(pi, 1) : undefined}
              onDelete={() => removePos(pi)}
            />
          </div>
          <Field label="Title (line 1, then line 2 — use Enter for newline)">
            <textarea
              value={p.title}
              rows={2}
              onChange={(e) => setPos(pi, { title: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </Field>
          <Field label="Year">
            <TextInput value={p.year} onChange={(e) => setPos(pi, { year: e.target.value })} />
          </Field>
          {p.bullets.map((b, bi) => (
            <div key={bi} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Bullet {bi + 1}</span>
                <RowControls
                  onUp={bi > 0 ? () => moveBullet(pi, bi, -1) : undefined}
                  onDown={bi < p.bullets.length - 1 ? () => moveBullet(pi, bi, 1) : undefined}
                  onDelete={() => removeBullet(pi, bi)}
                />
              </div>
              <BoldableTextarea value={b} onChange={(v) => setBullet(pi, bi, v)} />
            </div>
          ))}
          <AddButton onClick={() => addBullet(pi)} label="Add bullet" />
        </div>
      ))}
      <AddButton onClick={addPos} label="Add position" />
    </Accordion>
  );
}
