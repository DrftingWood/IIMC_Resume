import React, { forwardRef } from 'react';
import type {
  SupersetResumeData,
  BulletGroup,
  ExperienceEntry,
  SectionKey,
} from './types';
import { DEFAULT_SECTION_ORDER } from './types';
import { renderInline } from '@/lib/bold';

interface Props {
  data: SupersetResumeData;
}

const ResumePreview = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const order: SectionKey[] =
    data.sectionOrder && data.sectionOrder.length
      ? data.sectionOrder
      : DEFAULT_SECTION_ORDER;

  return (
    <div ref={ref} className="f1-page">
      <HeaderBand data={data} />
      <TaglineRow taglines={data.taglines} />

      {order.map((key) => {
        switch (key) {
          case 'education':
            return (
              <React.Fragment key={key}>
                <SectionBar title="ACADEMIC QUALIFICATIONS" />
                <EducationTable data={data} />
              </React.Fragment>
            );
          case 'distinctions':
            return (
              <React.Fragment key={key}>
                <SectionBar title="ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS" />
                <BulletGroupTable groups={data.distinctions} />
              </React.Fragment>
            );
          case 'industry':
            return (
              <React.Fragment key={key}>
                <SectionBar title="INDUSTRY EXPERIENCE" rightText={data.industryRightText} />
                <IndustryTable entries={data.experience} />
              </React.Fragment>
            );
          case 'positions':
            return (
              <React.Fragment key={key}>
                <SectionBar title="POSITIONS OF RESPONSIBILITY" />
                <PositionsTable data={data} />
              </React.Fragment>
            );
          case 'extras':
            return (
              <React.Fragment key={key}>
                <SectionBar title="EXTRA-CURRICULAR ACHIEVEMENTS" />
                <BulletGroupTable groups={data.extras} />
              </React.Fragment>
            );
          default:
            return null;
        }
      })}

      <div className="f1-footer">
        <span className="f1-footer-line">Email: {data.email}</span>
        <span className="f1-footer-line">{data.institute}</span>
      </div>
    </div>
  );
});

ResumePreview.displayName = 'ResumePreview';
export default ResumePreview;

function HeaderBand({ data }: { data: SupersetResumeData }) {
  return (
    <div className="f1-header">
      <div>
        <div className="f1-inst-eng">Indian Institute of Management Calcutta</div>
        <div className="f1-inst-hindi">भारतीय प्रबंध संस्थान कलकत्ता</div>
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
    <div className="f1-tagline-row">
      {taglines.map((t, i) => (
        <div key={i} className="f1-tagline">{t}</div>
      ))}
    </div>
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

function EducationTable({ data }: { data: SupersetResumeData }) {
  const ranked = data.resumeType === 'ranked';
  return (
    <table className="f1-table f1-edu">
      <colgroup>
        <col style={{ width: ranked ? '32%' : '40%' }} />
        <col style={{ width: ranked ? '43%' : '41%' }} />
        <col style={{ width: ranked ? '9%' : '12%' }} />
        {ranked && <col style={{ width: '9%' }} />}
        <col style={{ width: '7%' }} />
      </colgroup>
      <thead>
        <tr>
          <th>Degree/Exam</th>
          <th>Board/Institute</th>
          <th>%/CGPA</th>
          {ranked && <th>Rank</th>}
          <th>Year</th>
        </tr>
      </thead>
      <tbody>
        {data.education.map((row, i) => (
          <tr key={i}>
            <td>{row.degree}</td>
            <td>{row.institute}</td>
            <td>{row.gpa}</td>
            {ranked && <td>{row.rank ?? ''}</td>}
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
        <col style={{ width: '78%' }} />
        <col style={{ width: '7%' }} />
      </colgroup>
      <tbody>
        {groups.flatMap((g, gi) =>
          g.bullets.map((b, bi) => (
            <tr key={`${gi}-${bi}`} className={bi > 0 ? 'f1-continuation' : ''}>
              {bi === 0 && (
                <td className="f1-category" rowSpan={g.bullets.length}>
                  <div className="f1-label-inner">
                    {g.category.split('\n').map((line, li) => (
                      <div key={li}>{line}</div>
                    ))}
                  </div>
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

  // Group consecutive entries by type so vertical Intern/Full-Time stays
  // uninterrupted across firms of the same type.
  const groups: { type: string; entries: ExperienceEntry[] }[] = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.type === e.type) last.entries.push(e);
    else groups.push({ type: e.type, entries: [e] });
  }

  const rows: React.ReactNode[] = [];

  groups.forEach((grp, gi) => {
    // Rows in this type-group = (firm banner row + sub-section bullet rows) per entry
    let typeRowCount = 0;
    for (const e of grp.entries) {
      typeRowCount += 1; // firm banner row
      for (const s of e.subSections) {
        typeRowCount += Math.max(s.bullets.length, 1);
      }
    }

    let isFirstRowOfType = true;

    grp.entries.forEach((entry, ei) => {
      // Firm banner row: spans the sub-label + bullet columns only
      rows.push(
        <tr key={`g${gi}-e${ei}-head`}>
          {isFirstRowOfType && (
            <td className="f1-vertical" rowSpan={typeRowCount}>
              <div className="f1-vertical-inner">
                <span>{grp.type}</span>
              </div>
            </td>
          )}
          <td className="f1-firm-banner-cell" colSpan={2}>
            <div className="f1-firm-banner">
              <span>{entry.firm}</span>
              <span>{entry.role}</span>
              <span>{entry.dates}</span>
            </div>
          </td>
        </tr>
      );
      isFirstRowOfType = false;

      entry.subSections.forEach((sub, si) => {
        const bullets = sub.bullets.length ? sub.bullets : [''];
        bullets.forEach((b, bi) => {
          rows.push(
            <tr
              key={`g${gi}-e${ei}-s${si}-b${bi}`}
              className={bi > 0 ? 'f1-continuation' : ''}
            >
              {bi === 0 && (
                <td className="f1-exp-sublabel" rowSpan={bullets.length}>
                  <div className="f1-label-inner">
                    {sub.label.split('\n').map((line, li) => (
                      <div key={li}>{line}</div>
                    ))}
                  </div>
                </td>
              )}
              <td className="f1-bullet-cell">
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
        <col style={{ width: '0.45cm' }} />
        <col style={{ width: 'calc(15% - 0.45cm)' }} />
        <col style={{ width: '85%' }} />
      </colgroup>
      <tbody>{rows}</tbody>
    </table>
  );
}

function PositionsTable({ data }: { data: SupersetResumeData }) {
  return (
    <table className="f1-table">
      <colgroup>
        <col style={{ width: '15%' }} />
        <col style={{ width: '78%' }} />
        <col style={{ width: '7%' }} />
      </colgroup>
      <tbody>
        {data.positions.flatMap((p, pi) =>
          p.bullets.map((b, bi) => (
            <tr key={`${pi}-${bi}`} className={bi > 0 ? 'f1-continuation' : ''}>
              {bi === 0 && (
                <td className="f1-category" rowSpan={p.bullets.length}>
                  <div className="f1-label-inner">
                    {p.title.split('\n').map((line, li) => (
                      <div key={li}>{line}</div>
                    ))}
                  </div>
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
