import type { SkynetResumeData } from './types';

// Fully fictional candidate. All metrics, organisations, and outcomes are
// invented to illustrate the layout and bold-rendering — no resemblance to
// any real student or selection list is intended.
export const SAMPLE: SkynetResumeData = {
  name: 'ROHAN SENGUPTA',
  mbaId: 'MBA/0247/63',
  taglines: [
    'IIM CALCUTTA, TOP 8% (PGP1)',
    'EX-ZS ASSOCIATES, ASIAN PAINTS SIP',
    'NATIONAL CASE FINALIST, B.TECH NIT TRICHY',
  ],
  sectionOrder: ['education', 'distinctions', 'projects', 'entrepreneurial', 'industry', 'positions', 'extras'],
  hiddenSections: [],
  education: [
    { degree: 'B.Tech Mechanical Engineering', institute: 'National Institute of Technology Tiruchirappalli', gpa: '8.91/10', year: '2022' },
    { degree: 'CLASS XII (CBSE)', institute: 'Delhi Public School, Ruby Park, Kolkata', gpa: '96.4 %', year: '2018' },
    { degree: 'CLASS X (CBSE)', institute: 'Delhi Public School, Ruby Park, Kolkata', gpa: '95.8 %', year: '2016' },
  ],
  distinctions: [
    {
      category: 'Scholastic &\nAcademic Honours',
      bullets: [
        { text: 'Top 8% at IIMC PGP1; secured **A/A+ grades in 9/14 courses** including Strategic Marketing and Finance I', year: '24-25' },
        { text: 'Dean\'s Merit List for **6 consecutive semesters** at NIT Trichy; CGPA 8.91/10 in B.Tech Mechanical', year: '18-22' },
        { text: 'School topper (1/220+) in Class XII CBSE board; school rank **3/240+** in Class X', year: '15-18' },
      ],
    },
    {
      category: 'Case Competitions\n& Competitions',
      bullets: [
        { text: 'National Finalist (**1 in 6 of 1.8k+ teams**) at Meridian National Case Challenge by Tata Consumer', year: '2025' },
        { text: 'Campus runner-up (**2/64 teams**) at Hindustan Unilever LIME Top 50 internal IIMC round', year: '2025' },
        { text: 'Top 1% (**Rank 412/35k+**) at All-India CAT 2023 with VARC 99.71 percentile', year: '2023' },
      ],
    },
  ],
  projects: [
    {
      category: 'Capstone &\nConsulting Projects',
      bullets: [
        { text: 'Led a **6-member capstone team** advising a mid-size FMCG client on **channel margin optimisation**', year: '2025' },
        { text: 'Built a **discrete-event simulation model** for a QSR client\'s kitchen layout, cutting projected', year: '2025' },
        { text: 'Co-authored a working paper on **rural fintech adoption** (30-village primary survey, n=740); accepted', year: '2024' },
      ],
    },
  ],
  entrepreneurial: [
    {
      category: 'Venture\nBuilding',
      bullets: [
        { text: 'Co-founded **Craftloom**, a D2C marketplace for artisan textiles; onboarded **60+ weaver clusters** and', year: '22-23' },
        { text: 'Raised **₹12L pre-seed** from a campus angel network and 2 family-office investors; grew the founding', year: '2023' },
        { text: 'Piloted a **subscription box model** that lifted repeat-purchase rate from **9% to 27%** within two', year: '2023' },
      ],
    },
  ],
  industryRightText: '22 Months (FULL-TIME)',
  experience: [
    {
      type: 'Full Time',
      firm: 'ZS ASSOCIATES',
      role: 'BUSINESS OPERATIONS ASSOCIATE',
      dates: "Jun`22 - Apr`24",
      subSections: [
        {
          label: 'Revenue\nImpact',
          bullets: [
            'Drove **₹6.4 Cr+** incremental revenue for a US pharma client by segmenting **8k+ HCPs** and rebuilding',
            'Delivered **18% YoY uplift** in promotional ROI across 4 brands by introducing a new attribution model',
          ],
        },
        {
          label: 'Leadership &\nMentorship',
          bullets: [
            'Mentored **3 new joiners** through a 90-day onboarding; **2/3 received outstanding ratings** in their',
            'Selected (**1 of 12 from cohort of 220+**) to facilitate firm-wide Python for Analytics training',
          ],
        },
      ],
    },
    {
      type: 'Intern',
      firm: 'ASIAN PAINTS LIMITED',
      role: 'BRAND MANAGEMENT SUMMER INTERN',
      dates: "Apr`25 - Jun`25",
      subSections: [
        {
          label: 'Brand\nStrategy',
          bullets: [
            'Defined a **GTM strategy for a new premium wood-finishes range** by interviewing',
            'Modelled a **3-yr revenue plan of ₹120 Cr+** for the launch SKU; recommendations accepted by VP',
            'Identified **2 white-space segments (₹35 Cr+ TAM each)** by triangulating Nielsen panel, primary survey',
          ],
        },
      ],
    },
    {
      type: 'Others',
      firm: 'CENTRE FOR OPERATIONS RESEARCH, NIT TRICHY',
      role: 'UNDERGRADUATE RESEARCH ASSISTANT',
      dates: "Jan`21 - May`22",
      subSections: [
        {
          label: 'Applied\nResearch',
          bullets: [
            'Assisted a faculty-led study on **queueing models for hospital emergency wards**; co-built a simulation',
            'Co-authored a peer-reviewed conference paper accepted at a national',
          ],
        },
      ],
    },
  ],
  positions: [
    {
      title: 'Cluster Lead,\nIndustry Interaction Cell, IIM Calcutta',
      bullets: [
        'Led a team of **9 PGP students** to manage final placement engagement for **15 firms** across BFSI and',
        'Negotiated **42+ slots** with firms during summer placements; helped achieve **100% placement** for the',
        'Built a CRM in Notion tracking **800+ touchpoints**; reduced response TAT to recruiters by **~60%** vs',
      ],
      year: '2024',
    },
  ],
  extras: [
    {
      category: 'Sports &\nFitness',
      bullets: [
        { text: 'State-level table tennis player (**Rank 7/180+**) at West Bengal sub-junior nationals; won 4', year: '13-16' },
        { text: 'Completed **2 half-marathons (Tata Mumbai 2023, Kolkata 25K)** with personal best of **1:48**', year: '23-24' },
      ],
    },
  ],
  email: 'rohan.sengupta2026@email.iimcal.ac.in',
  institute: 'Indian Institute of Management Calcutta',
};
