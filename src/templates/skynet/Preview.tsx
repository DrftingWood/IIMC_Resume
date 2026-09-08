import React, { forwardRef } from 'react';
import type {
  SkynetResumeData,
  BulletGroup,
  ExperienceEntry,
  SectionKey,
} from './types';
import { DEFAULT_SECTION_ORDER } from './types';
import { renderInline } from '@/lib/bold';

interface Props {
  data: SkynetResumeData;
}

const ResumePreview = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const hidden = new Set(data.hiddenSections ?? []);
  const order: SectionKey[] = (
    data.sectionOrder && data.sectionOrder.length ? data.sectionOrder : DEFAULT_SECTION_ORDER
  ).filter((k) => !hidden.has(k));

  return (
    <div ref={ref} className="skynet-page">
      <HeaderBand data={data} />
      <TaglineRow taglines={data.taglines} />

      {order.map((key) => {
        switch (key) {
          case 'education':
            return (
              <React.Fragment key={key}>
                <SectionBar title="ACADEMIC PROFILE" />
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
          case 'projects':
            return (
              <React.Fragment key={key}>
                <SectionBar title="PROJECTS AND PAPERS" />
                <BulletGroupTable groups={data.projects} />
              </React.Fragment>
            );
          case 'entrepreneurial':
            return (
              <React.Fragment key={key}>
                <SectionBar title="ENTREPRENEURIAL/NON-PROFIT VENTURE" />
                <BulletGroupTable groups={data.entrepreneurial} />
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
                <SectionBar title="POSITION OF RESPONSIBILITY" />
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

      <div className="sk-footer">
        <span className="sk-footer-line">Email: {data.email}</span>
        <span className="sk-footer-line">{data.institute}</span>
      </div>
    </div>
  );
});

ResumePreview.displayName = 'ResumePreview';
export default ResumePreview;

function HeaderBand({ data }: { data: SkynetResumeData }) {
  return (
    <div className="sk-header">
      <div>
        <div className="sk-inst-eng">Indian Institute of Management Calcutta</div>
        <div className="sk-inst-hindi">भारतीय प्रबंध संस्थान कलकत्ता</div>
      </div>
      <div className="sk-header-right">
        <div className="sk-name">{data.name || ' '}</div>
        <div className="sk-mbaid">{data.mbaId || ' '}</div>
      </div>
    </div>
  );
}

function TaglineRow({ taglines }: { taglines: [string, string, string] }) {
  return (
    <div className="sk-tagline-row">
      {taglines.map((t, i) => (
        <div key={i} className="sk-tagline">{t}</div>
      ))}
    </div>
  );
}

function SectionBar({ title, rightText }: { title: string; rightText?: string }) {
  return (
    <div className="sk-section-bar">
      <h2 className="sk-section-title">{title}</h2>
      {rightText ? <span className="sk-section-bar-right">{rightText}</span> : null}
    </div>
  );
}

function EducationTable({ data }: { data: SkynetResumeData }) {
  return (
    <table className="sk-table sk-edu">
      <colgroup>
        <col style={{ width: '40%' }} />
        <col style={{ width: '41%' }} />
        <col style={{ width: '12%' }} />
        <col style={{ width: '7%' }} />
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
    <table className="sk-table">
      <colgroup>
        <col style={{ width: '15%' }} />
        <col style={{ width: '78%' }} />
        <col style={{ width: '7%' }} />
      </colgroup>
      <tbody>
        {groups.flatMap((g, gi) =>
          g.bullets.map((b, bi) => (
            <tr key={`${gi}-${bi}`} className={bi > 0 ? 'sk-continuation' : ''}>
              {bi === 0 && (
                <td className="sk-category" rowSpan={g.bullets.length}>
                  <div className="sk-label-inner">
                    {g.category.split('\n').map((line, li) => (
                      <div key={li}>{line}</div>
                    ))}
                  </div>
                </td>
              )}
              <td className="sk-bullet-cell">
                <span className="sk-bullet">{renderInline(b.text)}</span>
              </td>
              <td className="sk-cell-year">{b.year}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function IndustryTable({ entries }: { entries: ExperienceEntry[] }) {
  if (!entries.length) {
    return <table className="sk-table"><tbody></tbody></table>;
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
            <td className="sk-vertical" rowSpan={typeRowCount}>
              <div className="sk-vertical-inner">
                <span>{grp.type}</span>
              </div>
            </td>
          )}
          <td className="sk-firm-banner-cell" colSpan={2}>
            <div className="sk-firm-banner">
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
              className={bi > 0 ? 'sk-continuation' : ''}
            >
              {bi === 0 && (
                <td className="sk-exp-sublabel" rowSpan={bullets.length}>
                  <div className="sk-label-inner">
                    {sub.label.split('\n').map((line, li) => (
                      <div key={li}>{line}</div>
                    ))}
                  </div>
                </td>
              )}
              <td className="sk-bullet-cell">
                <span className="sk-bullet">{renderInline(b)}</span>
              </td>
            </tr>
          );
        });
      });
    });
  });

  return (
    <table className="sk-table">
      <colgroup>
        <col style={{ width: '0.45cm' }} />
        <col style={{ width: 'calc(15% - 0.45cm)' }} />
        <col style={{ width: '85%' }} />
      </colgroup>
      <tbody>{rows}</tbody>
    </table>
  );
}

function PositionsTable({ data }: { data: SkynetResumeData }) {
  return (
    <table className="sk-table">
      <colgroup>
        <col style={{ width: '15%' }} />
        <col style={{ width: '78%' }} />
        <col style={{ width: '7%' }} />
      </colgroup>
      <tbody>
        {data.positions.flatMap((p, pi) =>
          p.bullets.map((b, bi) => (
            <tr key={`${pi}-${bi}`} className={bi > 0 ? 'sk-continuation' : ''}>
              {bi === 0 && (
                <td className="sk-category" rowSpan={p.bullets.length}>
                  <div className="sk-label-inner">
                    {p.title.split('\n').map((line, li) => (
                      <div key={li}>{line}</div>
                    ))}
                  </div>
                </td>
              )}
              <td className="sk-bullet-cell">
                <span className="sk-bullet">{renderInline(b)}</span>
              </td>
              {bi === 0 && (
                <td className="sk-cell-year" rowSpan={p.bullets.length}>
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
