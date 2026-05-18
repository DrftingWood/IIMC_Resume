import React, { forwardRef } from 'react';
import type {
  ResumeData,
  BulletGroup,
  ExperienceEntry,
} from '@/types/resume';
import { renderInline } from '@/lib/bold';

interface Props {
  data: ResumeData;
}

const ResumePreview = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  return (
    <div ref={ref} className="f1-page">
      <HeaderBand data={data} />
      <TaglineRow taglines={data.taglines} />

      <SectionBar title="ACADEMIC QUALIFICATIONS" />
      <EducationTable data={data} />

      <SectionBar title="ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS" />
      <BulletGroupTable groups={data.distinctions} />

      <SectionBar title="INDUSTRY EXPERIENCE" rightText={data.industryRightText} />
      <IndustryTable entries={data.experience} />

      <SectionBar title="POSITIONS OF RESPONSIBILITY" />
      <PositionsTable data={data} />

      <SectionBar title="EXTRA-CURRICULAR ACHIEVEMENTS" />
      <BulletGroupTable groups={data.extras} />

      <div className="f1-footer">
        <span className="f1-footer-line">Email: {data.email}</span>
        <span className="f1-footer-line">{data.institute}</span>
      </div>
    </div>
  );
});

ResumePreview.displayName = 'ResumePreview';
export default ResumePreview;

function HeaderBand({ data }: { data: ResumeData }) {
  return (
    <div className="f1-header">
      <div>
        <div className="f1-inst-hindi">भारतीय प्रबंध संस्थान कलकत्ता</div>
        <div className="f1-inst-eng">Indian Institute of Management Calcutta</div>
      </div>
      <div className="f1-header-right">
        <div className="f1-name">{data.name || ' '}</div>
        <div className="f1-mbaid">{data.mbaId || ' '}</div>
      </div>
    </div>
  );
}

function TaglineRow({ taglines }: { taglines: [string, string, string] }) {
  return (
    <table className="f1-tagline-row">
      <tbody>
        <tr>
          {taglines.map((t, i) => (
            <td key={i}>{t}</td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function SectionBar({ title, rightText }: { title: string; rightText?: string }) {
  return (
    <div className="f1-section-bar">
      <span>{title}</span>
      {rightText ? <span className="f1-section-bar-right">{rightText}</span> : null}
    </div>
  );
}

function EducationTable({ data }: { data: ResumeData }) {
  return (
    <table className="f1-table f1-edu">
      <colgroup>
        <col style={{ width: '41%' }} />
        <col style={{ width: '41%' }} />
        <col style={{ width: '12%' }} />
        <col style={{ width: '6%' }} />
      </colgroup>
      <thead>
        <tr>
          <th>Degree/Exam</th>
          <th>Board/Institute</th>
          <th>%/CGPA</th>
          <th>Year</th>
        </tr>
      </thead>
      <tbody>
        {data.education.map((row, i) => (
          <tr key={i}>
            <td>{row.degree}</td>
            <td>{row.institute}</td>
            <td>{row.gpa}</td>
            <td>{row.year}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BulletGroupTable({ groups }: { groups: BulletGroup[] }) {
  return (
    <table className="f1-table">
      <colgroup>
        <col style={{ width: '15%' }} />
        <col style={{ width: '80%' }} />
        <col style={{ width: '5%' }} />
      </colgroup>
      <tbody>
        {groups.flatMap((g, gi) =>
          g.bullets.map((b, bi) => (
            <tr key={`${gi}-${bi}`}>
              {bi === 0 && (
                <td className="f1-category" rowSpan={g.bullets.length}>
                  {g.category.split('\n').map((line, li) => (
                    <div key={li}>{line}</div>
                  ))}
                </td>
              )}
              <td className="f1-bullet-cell">
                <span className="f1-bullet">{renderInline(b.text)}</span>
              </td>
              <td className="f1-cell-year">{b.year}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function IndustryTable({ entries }: { entries: ExperienceEntry[] }) {
  if (!entries.length) {
    return <table className="f1-table"><tbody></tbody></table>;
  }

  const rows: React.ReactNode[] = [];

  entries.forEach((entry, ei) => {
    // Bullet-row count for this firm (drives vertical-label rowSpan)
    const firmBulletRowCount = entry.subSections.reduce(
      (n, s) => n + Math.max(s.bullets.length, 1),
      0
    );

    // Firm banner — full width, cuts across the vertical column
    rows.push(
      <tr key={`e${ei}-head`}>
        <td className="f1-firm-banner-cell" colSpan={3}>
          <div className="f1-firm-banner">
            <span>{entry.firm}</span>
            <span>{entry.role}</span>
            <span>{entry.dates}</span>
          </div>
        </td>
      </tr>
    );

    let firstBulletRowOfFirm = true;

    entry.subSections.forEach((sub, si) => {
      const bullets = sub.bullets.length ? sub.bullets : [''];
      bullets.forEach((b, bi) => {
        rows.push(
          <tr key={`e${ei}-s${si}-b${bi}`}>
            {firstBulletRowOfFirm && (
              <td className="f1-vertical" rowSpan={firmBulletRowCount}>
                <span>{entry.type}</span>
              </td>
            )}
            {bi === 0 && (
              <td className="f1-exp-sublabel" rowSpan={bullets.length}>
                {sub.label.split('\n').map((line, li) => (
                  <div key={li}>{line}</div>
                ))}
              </td>
            )}
            <td className="f1-bullet-cell">
              <span className="f1-bullet">{renderInline(b)}</span>
            </td>
          </tr>
        );
        firstBulletRowOfFirm = false;
      });
    });
  });

  return (
    <table className="f1-table">
      <colgroup>
        <col style={{ width: '0.5cm' }} />
        <col style={{ width: '15%' }} />
        <col style={{ width: '80%' }} />
      </colgroup>
      <tbody>{rows}</tbody>
    </table>
  );
}

function PositionsTable({ data }: { data: ResumeData }) {
  return (
    <table className="f1-table">
      <colgroup>
        <col style={{ width: '15%' }} />
        <col style={{ width: '80%' }} />
        <col style={{ width: '5%' }} />
      </colgroup>
      <tbody>
        {data.positions.flatMap((p, pi) =>
          p.bullets.map((b, bi) => (
            <tr key={`${pi}-${bi}`}>
              {bi === 0 && (
                <td className="f1-category" rowSpan={p.bullets.length}>
                  {p.title.split('\n').map((line, li) => (
                    <div key={li}>{line}</div>
                  ))}
                </td>
              )}
              <td className="f1-bullet-cell">
                <span className="f1-bullet">{renderInline(b)}</span>
              </td>
              {bi === 0 && (
                <td className="f1-cell-year" rowSpan={p.bullets.length}>
                  {p.year}
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
