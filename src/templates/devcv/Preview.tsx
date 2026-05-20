import { forwardRef } from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles.css';
import type { DevCvData, DevCvSection } from './types';
import { renderInline } from '@/lib/bold';

interface Props {
  data: DevCvData;
}

// Maps the LaTeX \icon{...} short names to FontAwesome 5 css classes.
const ICON_MAP: Record<string, string> = {
  MapMarker: 'fas fa-map-marker-alt',
  Phone: 'fas fa-phone',
  At: 'fas fa-at',
  Envelope: 'fas fa-envelope',
  Globe: 'fas fa-globe',
  Github: 'fab fa-github',
  Twitter: 'fab fa-twitter',
  Linkedin: 'fab fa-linkedin',
  Facebook: 'fab fa-facebook',
  Instagram: 'fab fa-instagram',
  Home: 'fas fa-home',
  Mobile: 'fas fa-mobile-alt',
  Briefcase: 'fas fa-briefcase',
  Graduation: 'fas fa-graduation-cap',
};

function iconClass(name: string): string {
  return ICON_MAP[name] ?? `fas fa-${name.toLowerCase()}`;
}

const DevCvPreview = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  return (
    <div ref={ref} className="dcv-page">
      <Header data={data} />
      {data.sections.map((s) => (
        <SectionBlock key={s.id} section={s} />
      ))}
    </div>
  );
});

DevCvPreview.displayName = 'DevCvPreview';
export default DevCvPreview;

function Header({ data }: { data: DevCvData }) {
  // Split contacts into two roughly-equal columns (LaTeX template uses two side-by-side minipages).
  const mid = Math.ceil(data.contacts.length / 2);
  const col1 = data.contacts.slice(0, mid);
  const col2 = data.contacts.slice(mid);
  return (
    <div className="dcv-header">
      <div className="dcv-name">
        {data.firstName && <span className="dcv-namebox">{data.firstName}</span>}
        {data.lastName && <span className="dcv-namebox">{data.lastName}</span>}
        {data.title && <div className="dcv-title">{data.title}</div>}
      </div>
      <ContactColumn items={col1} />
      <ContactColumn items={col2} />
    </div>
  );
}

function ContactColumn({ items }: { items: DevCvData['contacts'] }) {
  return (
    <div className="dcv-contacts">
      {items.map((c) => {
        const inner = (
          <>
            <span className="dcv-contact-icon">
              <i className={iconClass(c.icon)} aria-hidden="true"></i>
            </span>
            <span>{c.text}</span>
          </>
        );
        return c.href ? (
          <a key={c.id} href={c.href} className="dcv-contact" target="_blank" rel="noreferrer">
            {inner}
          </a>
        ) : (
          <div key={c.id} className="dcv-contact">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

function SectionBlock({ section }: { section: DevCvSection }) {
  switch (section.kind) {
    case 'intro-skills':
      return <IntroSkills section={section} />;
    case 'entry-list':
      return <EntryList section={section} />;
    case 'columns':
      return <Columns section={section} />;
    case 'text':
      return <TextBlock section={section} />;
  }
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="dcv-sect">
      <span className="dcv-sect-title">{title}</span>
    </div>
  );
}

function IntroSkills({ section }: { section: Extract<DevCvSection, { kind: 'intro-skills' }> }) {
  const maxLabelLen = Math.max(0, ...section.bars.map((b) => b.label.length));
  // Reserve left padding for the label pill, scaled by longest label.
  const minBarPx = Math.max(60, maxLabelLen * 7);
  return (
    <>
      <SectionHeading title={section.title} />
      <div className="dcv-intro-skills">
        <div className="dcv-intro">
          <p>{section.intro}</p>
        </div>
        <div>
          <div className="dcv-bars">
            {section.bars.map((b) => (
              <div key={b.id} className="dcv-bar">
                <div
                  className="dcv-bar-fill"
                  style={{ width: `max(${minBarPx}px, ${b.pct}%)` }}
                />
                <span className="dcv-bar-label">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {section.bubbles.length > 0 && (
        <div className="dcv-bubbles">
          {section.bubbles.map((b) => {
            const px = Math.max(28, b.size * 8);
            return (
              <div key={b.id} className="dcv-bubble">
                <div
                  className="dcv-bubble-dot"
                  style={{ width: `${px}pt`, height: `${px}pt` }}
                />
                <span className="dcv-bubble-label">{b.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function EntryList({ section }: { section: Extract<DevCvSection, { kind: 'entry-list' }> }) {
  return (
    <>
      <SectionHeading title={section.title} />
      <div className="dcv-entries">
        {section.entries.map((e) => (
          <div key={e.id} className="dcv-entry">
            <div className="dcv-entry-dates">{e.dates}</div>
            <div className="dcv-entry-body">
              <div className="dcv-entry-top">
                <span className="dcv-entry-heading">{e.heading}</span>
                <span className="dcv-entry-qualifier">{e.qualifier}</span>
              </div>
              <div className="dcv-entry-desc">{renderInline(e.description)}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Columns({ section }: { section: Extract<DevCvSection, { kind: 'columns' }> }) {
  return (
    <>
      {section.title && <SectionHeading title={section.title} />}
      <div className="dcv-columns">
        {section.columns.map((c) => (
          <div key={c.id}>
            <div className="dcv-sect">
              <span className="dcv-sect-title">{c.title}</span>
            </div>
            <div className="dcv-column-body">{renderInline(c.body)}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function TextBlock({ section }: { section: Extract<DevCvSection, { kind: 'text' }> }) {
  return (
    <>
      <SectionHeading title={section.title} />
      <div className="dcv-text-body">{renderInline(section.body)}</div>
    </>
  );
}
