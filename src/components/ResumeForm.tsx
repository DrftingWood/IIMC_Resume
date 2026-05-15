import type { ResumeData } from '@/types/resume';
import { HeaderForm } from './form-sections/HeaderForm';
import { TaglineForm } from './form-sections/TaglineForm';
import { EducationForm } from './form-sections/EducationForm';
import { BulletGroupsForm } from './form-sections/BulletGroupsForm';
import { IndustryForm } from './form-sections/IndustryForm';
import { PositionsForm } from './form-sections/PositionsForm';
import { FooterForm } from './form-sections/FooterForm';

export default function ResumeForm({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (patch: Partial<ResumeData>) => void;
}) {
  return (
    <div className="space-y-2">
      <HeaderForm data={data} onChange={onChange} />
      <TaglineForm data={data} onChange={onChange} />
      <EducationForm data={data} onChange={onChange} />
      <BulletGroupsForm
        title="Academic Distinctions & Co-curricular Achievements"
        groups={data.distinctions}
        onChange={(distinctions) => onChange({ distinctions })}
      />
      <IndustryForm data={data} onChange={onChange} />
      <PositionsForm data={data} onChange={onChange} />
      <BulletGroupsForm
        title="Extra-Curricular Achievements"
        groups={data.extras}
        onChange={(extras) => onChange({ extras })}
      />
      <FooterForm data={data} onChange={onChange} />
    </div>
  );
}
