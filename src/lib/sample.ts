import type { ResumeData } from '@/types/resume';

export const SAMPLE: ResumeData = {
  name: 'FIRST NAME LAST NAME',
  mbaId: 'MBA/XXXX/XX',
  taglines: [
    'TAGLINE / HIGHLIGHT 1',
    'TAGLINE / HIGHLIGHT 2',
    'TAGLINE / HIGHLIGHT 3',
  ],
  resumeType: 'unranked',
  sectionOrder: ['education', 'distinctions', 'industry', 'positions', 'extras'],
  education: [
    { degree: 'Post-Graduate Degree', institute: 'Institute Name', gpa: 'X.XX/X', rank: '', year: '20XX' },
    { degree: 'Under-Graduate Degree', institute: 'Institute Name', gpa: 'X.XX/X', rank: '', year: '20XX' },
    { degree: 'CLASS XII', institute: 'Board Name', gpa: 'XX.XX%', rank: '', year: '20XX' },
    { degree: 'CLASS X', institute: 'Board Name', gpa: 'XX.XX%', rank: '', year: '20XX' },
  ],
  distinctions: [
    {
      category: 'Sub-category\nLabel A',
      bullets: [
        { text: 'Achievement bullet with **key metric / rank** and **supporting context** placed here', year: '20XX' },
        { text: 'Achievement bullet with **key metric / rank** and **supporting context** placed here', year: '20XX' },
        { text: 'Achievement bullet with **key metric / rank** and **supporting context** placed here', year: '20XX' },
      ],
    },
    {
      category: 'Sub-category\nLabel B',
      bullets: [
        { text: 'Award / honour bullet with **awarding body**, **scope (X+ pool)** and value of **₹X.XL+**', year: '20XX' },
        { text: 'Award / honour bullet with **awarding body**, **scope (X+ pool)** and value of **₹X.XL+**', year: '20XX' },
      ],
    },
    {
      category: 'Sub-category\nLabel C',
      bullets: [
        { text: 'Distinction / role bullet with **title**, **scope** and **quantified outcome (X+)** here', year: '20XX' },
        { text: 'Distinction / role bullet with **title**, **scope** and **quantified outcome (X+)** here', year: '20XX' },
        { text: 'Distinction / role bullet with **title**, **scope** and **quantified outcome (X+)** here', year: 'XX-XX' },
      ],
    },
    {
      category: 'Sub-category\nLabel D',
      bullets: [
        { text: '**Result A** / X+ pool, Org A; **Result B**, Org B; third item; **₹XL+** aggregate value', year: '20XX' },
        { text: '**Stage A:** Org A (XK), Org B (XK), Org C (XK); **Stage B:** Org D, Org E, Org F', year: 'XX-XX' },
        { text: '**Role**, Initiative, X+ scope; **2nd/XK+**, Event A, Org B; **3rd/XX** Event B', year: 'XX-XX' },
      ],
    },
  ],
  industryRightText: 'XX MONTHS (FULL-TIME)',
  experience: [
    {
      type: 'Full Time',
      firm: 'ORGANISATION A',
      role: 'ROLE / TITLE',
      dates: "Mon`XX - Mon`XX",
      subSections: [
        {
          label: 'Sub-category\nLabel A',
          bullets: [
            'Action verb describing impact with **X+ metric** across **X+ stakeholders / scope**',
            'Action verb describing impact with **X+ metric** across **X+ stakeholders / scope**',
          ],
        },
        {
          label: 'Sub-category\nLabel B',
          bullets: [
            'Action verb describing impact with **X+ metric** across **X+ stakeholders / scope**',
            'Action verb describing impact with **X+ metric** across **X+ stakeholders / scope**',
          ],
        },
        {
          label: 'Sub-category\nLabel C',
          bullets: [
            'Action verb describing impact with **X+ metric** across **X+ stakeholders / scope**',
            'Action verb describing impact with **X+ metric** across **X+ stakeholders / scope**',
          ],
        },
        {
          label: 'Sub-category\nLabel D',
          bullets: [
            'Action verb describing impact with **X+ metric** across **X+ stakeholders / scope**',
            'Action verb describing impact with **X+ metric** across **X+ stakeholders / scope**',
          ],
        },
      ],
    },
    {
      type: 'Intern',
      firm: 'ORGANISATION B',
      role: 'ROLE / TITLE',
      dates: "Mon`XX - Mon`XX",
      subSections: [
        {
          label: 'Sub-category\nLabel',
          bullets: [
            'Action verb describing impact with **X+ metric** across **X+ stakeholders / scope**',
            'Action verb describing impact with **X+ metric** across **X+ stakeholders / scope**',
            'Action verb describing impact with **X+ metric** across **X+ stakeholders / scope**',
          ],
        },
      ],
    },
    {
      type: 'Intern',
      firm: 'ORGANISATION C',
      role: 'ROLE / TITLE',
      dates: "Mon`XX - Mon`XX",
      subSections: [
        {
          label: 'Sub-category\nLabel',
          bullets: [
            'Action verb describing impact with **X+ metric** across **X+ stakeholders / scope**',
            'Action verb describing impact with **X+ metric** across **X+ stakeholders / scope**',
          ],
        },
      ],
    },
  ],
  positions: [
    {
      title: 'Role Title,\nOrganisation',
      bullets: [
        'Bullet describing **role / mandate**, **scope (X+ units)** and primary responsibility',
        'Bullet describing **role / mandate**, **scope (X+ units)** and primary responsibility',
        'Bullet describing **role / mandate**, **scope (X+ units)** and primary responsibility',
      ],
      year: '20XX',
    },
    {
      title: 'Role Title,\nOrganisation',
      bullets: [
        'Bullet describing **role / mandate**, **scope (X+ units)** and primary responsibility',
        'Bullet describing **role / mandate**, **scope (X+ units)** and primary responsibility',
      ],
      year: '20XX',
    },
  ],
  extras: [
    {
      category: 'Sub-category\nLabel A',
      bullets: [
        { text: 'Bullet describing **achievement / role**, **scope (X+)** and supporting context', year: 'XX-XX' },
        { text: 'Bullet describing **achievement / role**, **scope (X+)** and supporting context', year: 'XX-XX' },
        { text: 'Bullet describing **achievement / role**, **scope (X+)** and supporting context', year: 'XX-XX' },
      ],
    },
    {
      category: 'Sub-category\nLabel B',
      bullets: [
        { text: 'Bullet describing **achievement / role**, **scope (X+)** and supporting context', year: 'XX-XX' },
        { text: 'Bullet describing **achievement / role**, **scope (X+)** and supporting context', year: 'XX-XX' },
      ],
    },
  ],
  email: 'yourname@email.iimcal.ac.in',
  institute: 'Indian Institute of Management Calcutta',
};
