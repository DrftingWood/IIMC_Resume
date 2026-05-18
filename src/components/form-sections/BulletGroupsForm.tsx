import type { BulletGroup, YearedBullet } from '@/types/resume';
import { Accordion, Field, TextInput, BoldableTextarea, RowControls, AddButton, move } from './_shared';

export function BulletGroupsForm({
  title,
  defaultOpen = false,
  groups,
  onChange,
}: {
  title: string;
  defaultOpen?: boolean;
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
    <Accordion title={title} defaultOpen={defaultOpen}>
      {groups.map((g, gi) => (
        <div key={gi} className="border border-gray-200 rounded p-3 space-y-2 bg-gray-50">
          <div className="flex justify-between items-center">
            <Field label="Category">
              <TextInput value={g.category} onChange={(e) => setGroup(gi, { category: e.target.value })} />
            </Field>
            <RowControls
              onUp={gi > 0 ? () => moveGroup(gi, -1) : undefined}
              onDown={gi < groups.length - 1 ? () => moveGroup(gi, 1) : undefined}
              onDelete={() => removeGroup(gi)}
            />
          </div>
          {g.bullets.map((b, bi) => (
            <div key={bi} className="border border-gray-200 rounded p-2 bg-white space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Bullet {bi + 1}</span>
                <RowControls
                  onUp={bi > 0 ? () => moveBullet(gi, bi, -1) : undefined}
                  onDown={bi < g.bullets.length - 1 ? () => moveBullet(gi, bi, 1) : undefined}
                  onDelete={() => removeBullet(gi, bi)}
                />
              </div>
              <Field label="Text (use **bold**)">
                <BoldableTextarea value={b.text} onChange={(v) => setBullet(gi, bi, { text: v })} />
              </Field>
              <Field label="Year">
                <TextInput value={b.year} onChange={(e) => setBullet(gi, bi, { year: e.target.value })} />
              </Field>
            </div>
          ))}
          <AddButton onClick={() => addBullet(gi)} label="Add bullet" />
        </div>
      ))}
      <AddButton onClick={addGroup} label="Add category" />
    </Accordion>
  );
}
