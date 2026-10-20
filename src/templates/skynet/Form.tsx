import type { SkynetResumeData, CustomSection } from './types';
import { sectionLabel } from './types';
import { HeaderForm } from './form-sections/HeaderForm';
import { TaglineForm } from './form-sections/TaglineForm';
import { EducationForm } from './form-sections/EducationForm';
import { BulletGroupsForm } from './form-sections/BulletGroupsForm';
import { IndustryForm } from './form-sections/IndustryForm';
import { PositionsForm } from './form-sections/PositionsForm';
import { FooterForm } from './form-sections/FooterForm';
import { LayoutKeyContext } from '@/components/LineFill';

export default function SkynetForm({
  data,
  onChange,
}: {
  data: SkynetResumeData;
  onChange: (patch: Partial<SkynetResumeData>) => void;
}) {
  const title = (key: Parameters<typeof sectionLabel>[1]) => sectionLabel(data, key);
  const custom = data.customSections ?? [];
  function setCustom(key: CustomSection['key'], groups: CustomSection['groups']) {
    onChange({ customSections: custom.map((c) => (c.key === key ? { ...c, groups } : c)) });
  }

  return (
    // Re-measure every line-fill meter when the row pitch changes.
    <LayoutKeyContext.Provider value={data.density ?? 'official'}>
    <div className="space-y-2">
      <HeaderForm data={data} onChange={onChange} />
      <TaglineForm data={data} onChange={onChange} />
      <EducationForm data={data} onChange={onChange} title={title('education')} />
      <BulletGroupsForm
        title={title('distinctions')}
        groups={data.distinctions}
        onChange={(distinctions) => onChange({ distinctions })}
      />
      <BulletGroupsForm
        title={title('projects')}
        groups={data.projects}
        onChange={(projects) => onChange({ projects })}
      />
      <BulletGroupsForm
        title={title('entrepreneurial')}
        groups={data.entrepreneurial}
        onChange={(entrepreneurial) => onChange({ entrepreneurial })}
      />
      <IndustryForm data={data} onChange={onChange} title={title('industry')} />
      <PositionsForm data={data} onChange={onChange} title={title('positions')} />
      <BulletGroupsForm
        title={title('extras')}
        groups={data.extras}
        onChange={(extras) => onChange({ extras })}
      />
      {/* The student's own sections, edited like any other bullet table.
          Their name and place on the page are set in the Sections panel. */}
      {custom.map((c) => (
        <BulletGroupsForm
          key={c.key}
          id={`form-${c.key}`}
          title={title(c.key)}
          groups={c.groups}
          onChange={(groups) => setCustom(c.key, groups)}
        />
      ))}
      <FooterForm data={data} onChange={onChange} />
    </div>
    </LayoutKeyContext.Provider>
  );
}
