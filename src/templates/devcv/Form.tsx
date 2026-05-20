import type {
  DevCvData,
  DevCvSection,
  DevCvSectionKind,
  ContactItem,
  EntryRow,
  BarItem,
  BubbleItem,
  ColumnItem,
} from './types';
import { uid } from './types';
import {
  Accordion,
  Field,
  TextInput,
  BoldableTextarea,
  RowControls,
  AddButton,
  move,
} from '@/components/form-shared';

const ICON_OPTIONS = [
  'MapMarker',
  'Phone',
  'Mobile',
  'At',
  'Envelope',
  'Globe',
  'Github',
  'Twitter',
  'Linkedin',
  'Facebook',
  'Instagram',
  'Home',
  'Briefcase',
  'Graduation',
];

export default function DevCvForm({
  data,
  onChange,
}: {
  data: DevCvData;
  onChange: (patch: Partial<DevCvData>) => void;
}) {
  function setSections(sections: DevCvSection[]) {
    onChange({ sections });
  }
  function updateSection(idx: number, patch: Partial<DevCvSection>) {
    const next = data.sections.map((s, i) =>
      i === idx ? ({ ...s, ...patch } as DevCvSection) : s
    );
    setSections(next);
  }
  function removeSection(idx: number) {
    setSections(data.sections.filter((_, i) => i !== idx));
  }
  function moveSection(idx: number, dir: -1 | 1) {
    setSections(move(data.sections, idx, dir));
  }
  function addSection(kind: DevCvSectionKind) {
    const id = uid('sec');
    let s: DevCvSection;
    switch (kind) {
      case 'intro-skills':
        s = { id, kind, title: 'About', intro: '', bars: [], bubbles: [] };
        break;
      case 'entry-list':
        s = { id, kind, title: 'New Section', entries: [] };
        break;
      case 'columns':
        s = { id, kind, title: '', columns: [] };
        break;
      case 'text':
        s = { id, kind, title: 'New Section', body: '' };
        break;
    }
    setSections([...data.sections, s]);
  }

  return (
    <div className="space-y-2">
      <HeaderForm data={data} onChange={onChange} />
      <Accordion title="Contacts" defaultOpen={false}>
        <ContactsEditor data={data} onChange={onChange} />
      </Accordion>

      {data.sections.map((section, i) => (
        <Accordion key={section.id} title={section.title || `Section ${i + 1}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">
              {sectionKindLabel(section.kind)}
            </span>
            <RowControls
              onUp={i > 0 ? () => moveSection(i, -1) : undefined}
              onDown={i < data.sections.length - 1 ? () => moveSection(i, 1) : undefined}
              onDelete={() => removeSection(i)}
            />
          </div>
          <Field label="Section title">
            <TextInput
              value={section.title}
              onChange={(e) => updateSection(i, { title: e.target.value } as Partial<DevCvSection>)}
            />
          </Field>
          <SectionBody
            section={section}
            onChange={(patch) => updateSection(i, patch)}
          />
        </Accordion>
      ))}

      <AddSectionMenu onAdd={addSection} />
    </div>
  );
}

function sectionKindLabel(k: DevCvSectionKind): string {
  switch (k) {
    case 'intro-skills':
      return 'Intro + Skills';
    case 'entry-list':
      return 'Entry list';
    case 'columns':
      return '3-column block';
    case 'text':
      return 'Plain text';
  }
}

function AddSectionMenu({ onAdd }: { onAdd: (k: DevCvSectionKind) => void }) {
  const kinds: { k: DevCvSectionKind; label: string; hint: string }[] = [
    { k: 'intro-skills', label: 'Intro + Skills', hint: 'Text on the left, bar chart + bubbles on the right' },
    { k: 'entry-list', label: 'Entry list', hint: 'Dates | heading + qualifier + description (Experience, Education)' },
    { k: 'columns', label: '3-column block', hint: 'Three side-by-side mini sections (Languages, Hobbies, Non-profit)' },
    { k: 'text', label: 'Plain text', hint: 'A title plus a free-text body' },
  ];
  return (
    <div className="border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
        Add a section
      </div>
      <div className="grid grid-cols-2 gap-2">
        {kinds.map(({ k, label, hint }) => (
          <button
            key={k}
            type="button"
            onClick={() => onAdd(k)}
            className="ui-transition text-left px-3 py-2 bg-white border border-slate-300 rounded-md hover:border-slate-500 hover:bg-white"
          >
            <div className="text-sm font-semibold text-slate-800">{label}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Header & contacts ---------- */

function HeaderForm({
  data,
  onChange,
}: {
  data: DevCvData;
  onChange: (patch: Partial<DevCvData>) => void;
}) {
  return (
    <Accordion title="Name & Title" defaultOpen={true}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="First name">
          <TextInput
            value={data.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
          />
        </Field>
        <Field label="Last name">
          <TextInput
            value={data.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Title / current role">
        <TextInput value={data.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
    </Accordion>
  );
}

function ContactsEditor({
  data,
  onChange,
}: {
  data: DevCvData;
  onChange: (patch: Partial<DevCvData>) => void;
}) {
  function update(i: number, patch: Partial<ContactItem>) {
    onChange({
      contacts: data.contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    });
  }
  function add() {
    onChange({
      contacts: [...data.contacts, { id: uid('c'), icon: 'At', text: '' }],
    });
  }
  function remove(i: number) {
    onChange({ contacts: data.contacts.filter((_, idx) => idx !== i) });
  }
  function moveRow(i: number, dir: -1 | 1) {
    onChange({ contacts: move(data.contacts, i, dir) });
  }
  return (
    <div className="space-y-2">
      {data.contacts.map((c, i) => (
        <div key={c.id} className="border border-slate-200 rounded p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Row {i + 1}</span>
            <RowControls
              onUp={i > 0 ? () => moveRow(i, -1) : undefined}
              onDown={i < data.contacts.length - 1 ? () => moveRow(i, 1) : undefined}
              onDelete={() => remove(i)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Icon">
              <select
                value={c.icon}
                onChange={(e) => update(i, { icon: e.target.value })}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
              >
                {ICON_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Text">
              <TextInput
                value={c.text}
                onChange={(e) => update(i, { text: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Link (optional)">
            <TextInput
              value={c.href ?? ''}
              onChange={(e) => update(i, { href: e.target.value || undefined })}
            />
          </Field>
        </div>
      ))}
      <AddButton onClick={add} label="Add contact" />
    </div>
  );
}

/* ---------- Section bodies ---------- */

function SectionBody({
  section,
  onChange,
}: {
  section: DevCvSection;
  onChange: (patch: Partial<DevCvSection>) => void;
}) {
  switch (section.kind) {
    case 'intro-skills':
      return <IntroSkillsBody section={section} onChange={onChange} />;
    case 'entry-list':
      return <EntryListBody section={section} onChange={onChange} />;
    case 'columns':
      return <ColumnsBody section={section} onChange={onChange} />;
    case 'text':
      return <TextBody section={section} onChange={onChange} />;
  }
}

function IntroSkillsBody({
  section,
  onChange,
}: {
  section: Extract<DevCvSection, { kind: 'intro-skills' }>;
  onChange: (patch: Partial<DevCvSection>) => void;
}) {
  function setBars(bars: BarItem[]) {
    onChange({ bars } as Partial<DevCvSection>);
  }
  function setBubbles(bubbles: BubbleItem[]) {
    onChange({ bubbles } as Partial<DevCvSection>);
  }
  return (
    <div className="space-y-3">
      <Field label="Intro paragraph">
        <BoldableTextarea
          value={section.intro}
          onChange={(v) => onChange({ intro: v } as Partial<DevCvSection>)}
          rows={4}
        />
      </Field>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
          Skill bars
        </div>
        {section.bars.map((b, i) => (
          <div key={b.id} className="flex gap-2 items-end mb-2">
            <Field label="Label">
              <TextInput
                value={b.label}
                onChange={(e) =>
                  setBars(section.bars.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
                }
              />
            </Field>
            <Field label="% (0–100)">
              <TextInput
                type="number"
                value={String(b.pct)}
                onChange={(e) =>
                  setBars(
                    section.bars.map((x, idx) =>
                      idx === i ? { ...x, pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } : x
                    )
                  )
                }
              />
            </Field>
            <RowControls
              onUp={i > 0 ? () => setBars(move(section.bars, i, -1)) : undefined}
              onDown={i < section.bars.length - 1 ? () => setBars(move(section.bars, i, 1)) : undefined}
              onDelete={() => setBars(section.bars.filter((_, idx) => idx !== i))}
            />
          </div>
        ))}
        <AddButton
          label="Add skill"
          onClick={() => setBars([...section.bars, { id: uid('b'), label: '', pct: 50 }])}
        />
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
          Bubbles (tools)
        </div>
        {section.bubbles.map((b, i) => (
          <div key={b.id} className="flex gap-2 items-end mb-2">
            <Field label="Label">
              <TextInput
                value={b.label}
                onChange={(e) =>
                  setBubbles(
                    section.bubbles.map((x, idx) =>
                      idx === i ? { ...x, label: e.target.value } : x
                    )
                  )
                }
              />
            </Field>
            <Field label="Size (1–10)">
              <TextInput
                type="number"
                value={String(b.size)}
                onChange={(e) =>
                  setBubbles(
                    section.bubbles.map((x, idx) =>
                      idx === i
                        ? { ...x, size: Math.max(1, Math.min(10, Number(e.target.value) || 1)) }
                        : x
                    )
                  )
                }
              />
            </Field>
            <RowControls
              onUp={i > 0 ? () => setBubbles(move(section.bubbles, i, -1)) : undefined}
              onDown={
                i < section.bubbles.length - 1 ? () => setBubbles(move(section.bubbles, i, 1)) : undefined
              }
              onDelete={() => setBubbles(section.bubbles.filter((_, idx) => idx !== i))}
            />
          </div>
        ))}
        <AddButton
          label="Add bubble"
          onClick={() => setBubbles([...section.bubbles, { id: uid('u'), label: '', size: 4 }])}
        />
      </div>
    </div>
  );
}

function EntryListBody({
  section,
  onChange,
}: {
  section: Extract<DevCvSection, { kind: 'entry-list' }>;
  onChange: (patch: Partial<DevCvSection>) => void;
}) {
  function setEntries(entries: EntryRow[]) {
    onChange({ entries } as Partial<DevCvSection>);
  }
  function update(i: number, patch: Partial<EntryRow>) {
    setEntries(section.entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  return (
    <div className="space-y-2">
      {section.entries.map((e, i) => (
        <div key={e.id} className="border border-slate-200 rounded p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Entry {i + 1}</span>
            <RowControls
              onUp={i > 0 ? () => setEntries(move(section.entries, i, -1)) : undefined}
              onDown={
                i < section.entries.length - 1 ? () => setEntries(move(section.entries, i, 1)) : undefined
              }
              onDelete={() => setEntries(section.entries.filter((_, idx) => idx !== i))}
            />
          </div>
          <Field label="Dates">
            <TextInput value={e.dates} onChange={(ev) => update(i, { dates: ev.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Heading (bold)">
              <TextInput value={e.heading} onChange={(ev) => update(i, { heading: ev.target.value })} />
            </Field>
            <Field label="Qualifier (right side)">
              <TextInput value={e.qualifier} onChange={(ev) => update(i, { qualifier: ev.target.value })} />
            </Field>
          </div>
          <Field label="Description">
            <BoldableTextarea
              value={e.description}
              onChange={(v) => update(i, { description: v })}
              rows={3}
            />
          </Field>
        </div>
      ))}
      <AddButton
        label="Add entry"
        onClick={() =>
          setEntries([
            ...section.entries,
            { id: uid('e'), dates: '', heading: '', qualifier: '', description: '' },
          ])
        }
      />
    </div>
  );
}

function ColumnsBody({
  section,
  onChange,
}: {
  section: Extract<DevCvSection, { kind: 'columns' }>;
  onChange: (patch: Partial<DevCvSection>) => void;
}) {
  function setCols(columns: ColumnItem[]) {
    onChange({ columns } as Partial<DevCvSection>);
  }
  function update(i: number, patch: Partial<ColumnItem>) {
    setCols(section.columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  return (
    <div className="space-y-2">
      {section.columns.map((c, i) => (
        <div key={c.id} className="border border-slate-200 rounded p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Column {i + 1}</span>
            <RowControls
              onUp={i > 0 ? () => setCols(move(section.columns, i, -1)) : undefined}
              onDown={
                i < section.columns.length - 1 ? () => setCols(move(section.columns, i, 1)) : undefined
              }
              onDelete={() => setCols(section.columns.filter((_, idx) => idx !== i))}
            />
          </div>
          <Field label="Column title">
            <TextInput value={c.title} onChange={(e) => update(i, { title: e.target.value })} />
          </Field>
          <Field label="Body">
            <BoldableTextarea
              value={c.body}
              onChange={(v) => update(i, { body: v })}
              rows={4}
            />
          </Field>
        </div>
      ))}
      <AddButton
        label="Add column"
        onClick={() => setCols([...section.columns, { id: uid('col'), title: '', body: '' }])}
      />
    </div>
  );
}

function TextBody({
  section,
  onChange,
}: {
  section: Extract<DevCvSection, { kind: 'text' }>;
  onChange: (patch: Partial<DevCvSection>) => void;
}) {
  return (
    <Field label="Body">
      <BoldableTextarea
        value={section.body}
        onChange={(v) => onChange({ body: v } as Partial<DevCvSection>)}
        rows={6}
      />
    </Field>
  );
}
