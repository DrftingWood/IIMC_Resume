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

      <SectionBar
        title="INDUSTRY EXPERIENCE"
        rightText={data.industryRightText}
      />
      <IndustryTable entries={data.experience} />

      <SectionBar title="POSITIONS OF RESPONSIBILITY" />
      <PositionsTable data={data} />

      <SectionBar title="EXTRA-CURRICULAR ACHIEVEMENTS" />
      <BulletGroupTable groups={data.extras} />

      <div className="f1-footer">
        Email: {data.email} | {data.institute}
      </div>
    </div>
  );
});

ResumePreview.displayName = 'ResumePreview';
export default ResumePreview;

function HeaderBand({ data }: { data: ResumeData }) {
  return (
    <div className="f1-header">
      <div className="f1-header-left">
        <div className="f1-logo-placeholder">IIM<br />C</div>
        <div>
          <div className="f1-inst-hindi">भारतीय प्रबंध संस्थान कलकत्ता</div>
          <div className="f1-inst-eng">INDIAN INSTITUTE OF MANAGEMENT CALCUTTA</div>
        </div>
      </div>
      <div className="f1-header-right">
        <div className="f1-name">{data.name || ' '}</div>
        <div className="f1-mbaid">{data.mbaId || ' '}</div>
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
    <table className="f1-table">
      <colgroup>
        <col style={{ width: '24%' }} />
        <col style={{ width: '48%' }} />
        <col style={{ width: '14%' }} />
        <col style={{ width: '14%' }} />
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
            <td className="f1-cell-bold">{row.degree}</td>
            <td>{row.institute}</td>
            <td className="f1-cell-center">{row.gpa}</td>
            <td className="f1-cell-year">{row.year}</td>
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
        <col style={{ width: '18%' }} />
        <col style={{ width: '72%' }} />
        <col style={{ width: '10%' }} />
      </colgroup>
      <tbody>
        {groups.flatMap((g, gi) =>
          g.bullets.map((b, bi) => (
            <tr key={`${gi}-${bi}`}>
              {bi === 0 && (
                <td className="f1-category" rowSpan={g.bullets.length}>
                  {g.category}
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

  // Group entries by type to compute rowSpan for the vertical label column.
  const groups: { type: string; entries: ExperienceEntry[] }[] = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.type === e.type) last.entries.push(e);
    else groups.push({ type: e.type, entries: [e] });
  }

  const rows: React.ReactNode[] = [];

  groups.forEach((grp, gi) => {
    // Count total rows for this type group: header row + bullets per subSection
    let typeRowCount = 0;
    for (const e of grp.entries) {
      typeRowCount += 1; // header row
      for (const s of e.subSections) {
        typeRowCount += Math.max(s.bullets.length, 1);
      }
    }

    let isFirstRowOfType = true;

    grp.entries.forEach((entry, ei) => {
      // Header row: firm | role | dates
      rows.push(
        <tr key={`g${gi}-e${ei}-head`} className="f1-exp-headrow">
          {isFirstRowOfType && (
            <td className="f1-vertical" rowSpan={typeRowCount}>
              <span>{grp.type}</span>
            </td>
          )}
          <td>{entry.firm}</td>
          <td colSpan={2}>{entry.role}</td>
          <td className="f1-cell-year">{entry.dates}</td>
        </tr>
      );
      isFirstRowOfType = false;

      // Body rows: for each subsection, rowspan label cell across its bullets
      entry.subSections.forEach((sub, si) => {
        const bullets = sub.bullets.length ? sub.bullets : [''];
        bullets.forEach((b, bi) => {
          rows.push(
            <tr key={`g${gi}-e${ei}-s${si}-b${bi}`}>
              {bi === 0 && (
                <td className="f1-exp-sublabel" rowSpan={bullets.length}>
                  {sub.label}
                </td>
              )}
              <td className="f1-bullet-cell" colSpan={3}>
                <span className="f1-bullet">{renderInline(b)}</span>
              </td>
            </tr>
          );
        });
      });
    });
  });

  return (
    <table className="f1-table">
      <colgroup>
        <col style={{ width: '28px' }} />
        <col style={{ width: '18%' }} />
        <col style={{ width: '54%' }} />
        <col style={{ width: '14%' }} />
      </colgroup>
      <tbody>{rows}</tbody>
    </table>
  );
}

function PositionsTable({ data }: { data: ResumeData }) {
  return (
    <table className="f1-table">
      <colgroup>
        <col style={{ width: '22%' }} />
        <col style={{ width: '68%' }} />
        <col style={{ width: '10%' }} />
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
