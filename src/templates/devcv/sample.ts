import type { DevCvData } from './types';

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. ';

export const SAMPLE: DevCvData = {
  firstName: 'Alyx',
  lastName: 'Vance',
  title: 'Web App Architect',
  contacts: [
    { id: 'c1', icon: 'MapMarker', text: 'Black Mesa East' },
    { id: 'c2', icon: 'Phone', text: '+1 123 456 789' },
    { id: 'c3', icon: 'At', text: 'alyx@vance.me', href: 'mailto:alyx@vance.me' },
    { id: 'c4', icon: 'Globe', text: 'alyx.vance.me', href: 'https://alyx.vance.me' },
    { id: 'c5', icon: 'Github', text: 'github.com/alyxvance', href: 'https://github.com/alyxvance' },
    { id: 'c6', icon: 'Twitter', text: '@alyxvance', href: 'https://twitter.com/alyxvance' },
  ],
  sections: [
    {
      id: 's-intro',
      kind: 'intro-skills',
      title: 'Who Am I?',
      intro: LOREM + LOREM + LOREM + LOREM + LOREM,
      bars: [
        { id: 'b1', label: 'JavaScript', pct: 60 },
        { id: 'b2', label: 'PHP', pct: 100 },
        { id: 'b3', label: 'SASS/LESS', pct: 70 },
        { id: 'b4', label: 'Bootstrap', pct: 70 },
        { id: 'b5', label: 'Git', pct: 40 },
        { id: 'b6', label: 'LaTeX', pct: 60 },
      ],
      bubbles: [
        { id: 'u1', label: 'Eclipse', size: 5 },
        { id: 'u2', label: 'git', size: 6 },
        { id: 'u3', label: 'Office', size: 4 },
        { id: 'u4', label: 'Inkscape', size: 3 },
        { id: 'u5', label: 'Blender', size: 3 },
      ],
    },
    {
      id: 's-exp',
      kind: 'entry-list',
      title: 'Experience',
      entries: [
        {
          id: 'e1',
          dates: '2017 – 3/2018',
          heading: 'Front-end developer',
          qualifier: 'Big Corporation Name Inc.',
          description:
            LOREM + LOREM + LOREM + '\nnode.js / Vue.js / Electron',
        },
        {
          id: 'e2',
          dates: '2015 – 2018\npart time',
          heading: 'Full stack developer',
          qualifier: 'Famous Eshop Inc.',
          description: LOREM + LOREM + '\nPHP / JS / MariaDB / Linux',
        },
        {
          id: 'e3',
          dates: '2013 – 2014\npart time',
          heading: 'Junior PHP Developer',
          qualifier: 'example.com',
          description: LOREM + LOREM + '\nPHP / Laravel',
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
          dates: '2013 – 2017',
          heading: "Master's Degree",
          qualifier: 'Another University Name',
          description: LOREM + LOREM + LOREM,
        },
        {
          id: 'd2',
          dates: '2014',
          heading: 'Postgraduate Diploma',
          qualifier: 'A University Name',
          description: LOREM + LOREM,
        },
        {
          id: 'd3',
          dates: '2007 – 2013',
          heading: "Bachelor's Degree",
          qualifier: 'A University Name',
          description: LOREM + LOREM,
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
          body: '**English** — native\n**German** — proficient\n**Polish** — rudimentary',
        },
        { id: 'col2', title: 'Hobbies', body: 'I love… ' + LOREM },
        { id: 'col3', title: 'Non profit', body: 'I help… ' + LOREM },
      ],
    },
  ],
};
