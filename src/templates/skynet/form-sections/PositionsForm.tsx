import type { SkynetResumeData, PositionEntry } from '../types';
import {
  Accordion,
  Field,
  TextInput,
  BoldableTextarea,
  RowControls,
  AddButton,
  HideableRow,
  RowLabel,
  move,
} from '@/components/form-shared';
import { LineFill } from '@/components/LineFill';
import { moveFlag, removeFlag, toggleFlag } from '@/lib/visibility';

export function PositionsForm({
  data,
  onChange,
  title = 'Position of Responsibility',
}: {
  data: SkynetResumeData;
  onChange: (patch: Partial<SkynetResumeData>) => void;
  /** The section's display title, renamed or official. */
  title?: string;
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
  // Bullet flags travel with their bullets; see hiddenBullets in types.ts.
  function removeBullet(pi: number, bi: number) {
    const p = data.positions[pi];
    setPos(pi, {
      bullets: p.bullets.filter((_, j) => j !== bi),
      ...(p.hiddenBullets && { hiddenBullets: removeFlag(p.hiddenBullets, bi, p.bullets.length) }),
    });
  }
  function moveBullet(pi: number, bi: number, dir: -1 | 1) {
    const p = data.positions[pi];
    setPos(pi, {
      bullets: move(p.bullets, bi, dir),
      ...(p.hiddenBullets && { hiddenBullets: moveFlag(p.hiddenBullets, bi, dir, p.bullets.length) }),
    });
  }
  function toggleBullet(pi: number, bi: number) {
    const p = data.positions[pi];
    setPos(pi, { hiddenBullets: toggleFlag(p.hiddenBullets, bi, p.bullets.length) });
  }
  return (
    <Accordion title={title}>
      {data.positions.map((p, pi) => (
        <HideableRow key={pi} hidden={p.hidden} className="border border-gray-200 rounded p-3 bg-gray-50 space-y-2">
          <div className="flex justify-between items-center">
            <RowLabel hidden={p.hidden} className="text-xs font-semibold">
              Position {pi + 1}
            </RowLabel>
            <RowControls
              onUp={pi > 0 ? () => movePos(pi, -1) : undefined}
              onDown={pi < data.positions.length - 1 ? () => movePos(pi, 1) : undefined}
              onDelete={() => removePos(pi)}
              hidden={p.hidden}
              onToggleHidden={() => setPos(pi, { hidden: !p.hidden })}
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
          {p.bullets.map((b, bi) => {
            const hidden = !!p.hiddenBullets?.[bi];
            return (
              <HideableRow key={bi} hidden={hidden} className="space-y-1">
                <div className="flex justify-between items-center">
                  <RowLabel hidden={hidden}>Bullet {bi + 1}</RowLabel>
                  <RowControls
                    onUp={bi > 0 ? () => moveBullet(pi, bi, -1) : undefined}
                    onDown={bi < p.bullets.length - 1 ? () => moveBullet(pi, bi, 1) : undefined}
                    onDelete={() => removeBullet(pi, bi)}
                    hidden={hidden}
                    onToggleHidden={() => toggleBullet(pi, bi)}
                  />
                </div>
                <BoldableTextarea value={b} onChange={(v) => setBullet(pi, bi, v)} />
                <LineFill text={b} kind="bullet" />
              </HideableRow>
            );
          })}
          <AddButton onClick={() => addBullet(pi)} label="Add bullet" />
        </HideableRow>
      ))}
      <AddButton onClick={addPos} label="Add position" />
    </Accordion>
  );
}
