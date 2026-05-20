import type { DevCvData } from './types';

// Fully fictional engineer. Companies, schools, contact details, and GitHub
// handles are invented for illustration only.
export const SAMPLE: DevCvData = {
  firstName: 'Mira',
  lastName: 'Holloway',
  title: 'Senior Full-Stack Engineer',
  contacts: [
    { id: 'c1', icon: 'MapMarker', text: 'Portland, OR' },
    { id: 'c2', icon: 'Phone', text: '+1 555 014 8893' },
    {
      id: 'c3',
      icon: 'At',
      text: 'mira@holloway.dev',
      href: 'mailto:mira@holloway.dev',
    },
    {
      id: 'c4',
      icon: 'Globe',
      text: 'holloway.dev',
      href: 'https://holloway.dev',
    },
    {
      id: 'c5',
      icon: 'Github',
      text: 'github.com/miraholloway',
      href: 'https://github.com/miraholloway',
    },
    {
      id: 'c6',
      icon: 'Twitter',
      text: '@miraholloway',
      href: 'https://twitter.com/miraholloway',
    },
  ],
  sections: [
    {
      id: 's-intro',
      kind: 'intro-skills',
      title: 'About',
      intro:
        'Full-stack engineer with **eight years** shipping fintech and developer-tools products. Comfortable owning a slice end-to-end — from product discovery and schema design to deploys, observability and on-call. Recently focused on platform work: making services boring, fast and easy to extend.',
      bars: [
        { id: 'b1', label: 'TypeScript', pct: 90 },
        { id: 'b2', label: 'Go', pct: 75 },
        { id: 'b3', label: 'Python', pct: 65 },
        { id: 'b4', label: 'PostgreSQL', pct: 80 },
        { id: 'b5', label: 'AWS', pct: 70 },
        { id: 'b6', label: 'Terraform', pct: 55 },
      ],
      bubbles: [
        { id: 'u1', label: 'VS Code', size: 7 },
        { id: 'u2', label: 'Docker', size: 6 },
        { id: 'u3', label: 'Linear', size: 4 },
        { id: 'u4', label: 'Figma', size: 4 },
        { id: 'u5', label: 'Notion', size: 3 },
      ],
    },
    {
      id: 's-exp',
      kind: 'entry-list',
      title: 'Experience',
      entries: [
        {
          id: 'e1',
          dates: '2022 – present',
          heading: 'Staff Engineer, Platform',
          qualifier: 'Lighthouse Labs',
          description:
            'Led the migration of the billing pipeline from a monolith to event-driven services on Kafka. Mentored **4 engineers** through the rewrite and **cut p95 latency by 38%**. Owned the platform roadmap and on-call rota for a team of nine.',
        },
        {
          id: 'e2',
          dates: '2019 – 2022',
          heading: 'Senior Full-Stack Engineer',
          qualifier: 'Coastline Studio',
          description:
            'Built a Stripe-based subscription system handling **$8M+ ARR** across three products. Introduced a Playwright end-to-end suite that catches **~70% of regressions** before merge. Led the frontend rewrite from CRA to Next.js with zero customer-facing downtime.',
        },
        {
          id: 'e3',
          dates: '2017 – 2019\npart time',
          heading: 'Backend Engineer',
          qualifier: 'Drift Analytics',
          description:
            'Designed the PostgreSQL schemas that still power event-tracking today (**~2B rows/month**). Wrote the first version of the data-export API and the Python SDK used by **180+ customer integrations**.',
        },
      ],
    },
    {
      id: 's-edu',
      kind: 'entry-list',
      title: 'Education',
      entries: [
        {
          id: 'd1',
          dates: '2017 – 2019',
          heading: 'MSc, Computer Science',
          qualifier: 'Northeast Polytechnic University',
          description:
            'Thesis on incremental query planning for column stores. Coursework in distributed systems, compilers, and applied cryptography.',
        },
        {
          id: 'd2',
          dates: '2013 – 2017',
          heading: 'BSc, Software Engineering',
          qualifier: 'Westhaven College',
          description:
            'Summa cum laude. Founded the student infra club; ran the campus CI/CD service used by **12 student projects**.',
        },
      ],
    },
    {
      id: 's-foot',
      kind: 'columns',
      title: '',
      columns: [
        {
          id: 'col1',
          title: 'Languages',
          body:
            '**English** — native\n**Spanish** — proficient\n**German** — conversational',
        },
        {
          id: 'col2',
          title: 'Hobbies',
          body:
            'Trail running on the Wildwood Trail, building mechanical keyboards, and slowly learning the cello.',
        },
        {
          id: 'col3',
          title: 'Open source',
          body:
            'Maintainer of **cli-toolkit** (1.2k★). Regular contributor to **react-hook-form**. Occasionally writes about Postgres on **holloway.dev**.',
        },
      ],
    },
  ],
};
