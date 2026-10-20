import type { BulletGroup, YearedBullet } from '../types';
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
import { withHiddenCount } from '@/lib/visibility';

export function BulletGroupsForm({
  title,
  defaultOpen = false,
  id,
  groups,
  onChange,
}: {
  title: string;
  defaultOpen?: boolean;
  id?: string;
  groups: BulletGroup[];
  onChange: (groups: BulletGroup[]) => void;
}) {
  function setGroup(gi: number, patch: Partial<BulletGroup>) {
    onChange(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  }
  function setBullet(gi: number, bi: number, patch: Partial<YearedBullet>) {
    const next = groups.map((g, i) => {
      if (i !== gi) return g;
      return {
        ...g,
        bullets: g.bullets.map((b, j) => (j === bi ? { ...b, ...patch } : b)),
      };
    });
    onChange(next);
  }
  function addGroup() {
    onChange([...groups, { category: 'New Category', bullets: [] }]);
  }
  function removeGroup(gi: number) {
    onChange(groups.filter((_, i) => i !== gi));
  }
  function moveGroup(gi: number, dir: -1 | 1) {
    onChange(move(groups, gi, dir));
  }
  function addBullet(gi: number) {
    setGroup(gi, { bullets: [...groups[gi].bullets, { text: '', year: '' }] });
  }
  function removeBullet(gi: number, bi: number) {
    setGroup(gi, { bullets: groups[gi].bullets.filter((_, j) => j !== bi) });
  }
  function moveBullet(gi: number, bi: number, dir: -1 | 1) {
    setGroup(gi, { bullets: move(groups[gi].bullets, bi, dir) });
  }

  return (
    <Accordion id={id} title={withHiddenCount(title, groups)} defaultOpen={defaultOpen}>
      {groups.map((g, gi) => (
        <HideableRow key={gi} hidden={g.hidden} className="border border-gray-200 rounded p-3 space-y-2 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex-1 mr-3">
              <Field label="Category">
                <TextInput value={g.category} onChange={(e) => setGroup(gi, { category: e.target.value })} />
              </Field>
            </div>
            <RowControls
              onUp={gi > 0 ? () => moveGroup(gi, -1) : undefined}
              onDown={gi < groups.length - 1 ? () => moveGroup(gi, 1) : undefined}
              onDelete={() => removeGroup(gi)}
              label={`category ${g.category.trim() || gi + 1}`}
              hidden={g.hidden}
              onToggleHidden={() => setGroup(gi, { hidden: !g.hidden })}
            />
          </div>
          {g.hidden && <RowLabel hidden>This category</RowLabel>}
          {g.bullets.map((b, bi) => (
            <HideableRow key={bi} hidden={b.hidden} className="border border-gray-200 rounded p-2 bg-white space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <RowLabel hidden={b.hidden}>Bullet {bi + 1}</RowLabel>
                  <LineFill text={b.text} kind="bullet" hidden={b.hidden || g.hidden} />
                </div>
                <RowControls
                  onUp={bi > 0 ? () => moveBullet(gi, bi, -1) : undefined}
                  onDown={bi < g.bullets.length - 1 ? () => moveBullet(gi, bi, 1) : undefined}
                  onDelete={() => removeBullet(gi, bi)}
                  label={`bullet ${bi + 1} in ${g.category.trim() || `category ${gi + 1}`}`}
                  hidden={b.hidden}
                  onToggleHidden={() => setBullet(gi, bi, { hidden: !b.hidden })}
                />
              </div>
              <Field label="Text (use **bold**)">
                <BoldableTextarea value={b.text} onChange={(v) => setBullet(gi, bi, { text: v })} />
              </Field>
              <Field label="Year">
                <TextInput value={b.year} onChange={(e) => setBullet(gi, bi, { year: e.target.value })} />
              </Field>
            </HideableRow>
          ))}
          <AddButton onClick={() => addBullet(gi)} label="Add bullet" />
        </HideableRow>
      ))}
      <AddButton onClick={addGroup} label="Add category" />
    </Accordion>
  );
}
