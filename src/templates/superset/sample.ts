import type { SupersetResumeData } from './types';

// Fully fictional candidate. All metrics, organisations, and outcomes are
// invented to illustrate the layout and bold-rendering — no resemblance to
// any real student or selection list is intended.
export const SAMPLE: SupersetResumeData = {
  name: 'ROHAN SENGUPTA',
  mbaId: 'MBA/0247/61',
  taglines: [
    'IIM CALCUTTA, TOP 8% (PGP1)',
    'EX-ZS ASSOCIATES, ASIAN PAINTS SIP',
    'NATIONAL CASE FINALIST, B.TECH NIT TRICHY',
  ],
  resumeType: 'unranked',
  sectionOrder: ['education', 'distinctions', 'industry', 'positions', 'extras'],
  hiddenSections: [],
  sectionTitles: {},
  customSections: [],
  education: [
    { degree: 'MBA', institute: 'Indian Institute of Management Calcutta (Term 3)', gpa: '7.62/9', rank: '', year: '2026' },
    { degree: 'B.Tech Mechanical Engineering', institute: 'National Institute of Technology Tiruchirappalli', gpa: '8.91/10', rank: '', year: '2022' },
    { degree: 'CLASS XII (CBSE)', institute: 'Delhi Public School, Ruby Park, Kolkata', gpa: '96.4 %', rank: '', year: '2018' },
    { degree: 'CLASS X (CBSE)', institute: 'Delhi Public School, Ruby Park, Kolkata', gpa: '95.8 %', rank: '', year: '2016' },
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
        { text: 'National Finalist (**1 in 6 of 1.8k+ teams**) at Meridian National Case Challenge', year: '2025' },
        { text: 'Campus runner-up (**2/64 teams**) at Hindustan Unilever LIME Top 50 internal IIMC round', year: '2025' },
        { text: 'Top 1% (**Rank 412/35k+**) at All-India CAT 2023 with VARC 99.71 percentile', year: '2023' },
      ],
    },
    {
      category: 'Scholarships &\nFellowships',
      bullets: [
        { text: 'Awarded **INSPIRE Scholarship** by DST, GoI (₹80k) for scoring in the **top 1%** of CBSE Class XII', year: '2018' },
        { text: 'KVPY Fellowship awardee (**Rank SX-94**) by Indian Institute of Science, Bengaluru', year: '2018' },
      ],
    },
    {
      category: 'Leadership &\nResponsibilities',
      bullets: [
        { text: 'Student mentor for **12 PGP1 students** under IIMC Mentorship Programme; led **20+ prep sessions**', year: '24-25' },
        { text: 'Class Representative (**1/120+**) for two semesters at NIT Trichy; coordinated **35+ guest lectures**', year: '20-22' },
        { text: 'House Captain (**1/250+**) in Class XII; led 4-house athletics meet with **footfall of ~900**', year: '17-18' },
      ],
    },
  ],
  industryRightText: '22 MONTHS (FULL-TIME)',
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
            'Drove **₹6.4 Cr+** incremental revenue for a US pharma client by segmenting **8k+ HCPs** and rebuilding the call plan',
            'Delivered **18% YoY uplift** in promotional ROI across 4 brands via a new attribution model',
          ],
        },
        {
          label: 'Leadership &\nMentorship',
          bullets: [
            'Mentored **3 new joiners** through a 90-day onboarding; **2/3 received outstanding ratings** in their first review cycle',
            'Selected (**1 of 12 from cohort of 220+**) to run Python training for **180+ associates**',
          ],
        },
        {
          label: 'Process\nExcellence',
          bullets: [
            'Automated 5 client deliverables using **SQL + Airflow**, saving **160+ hours/quarter** of manual effort',
            'Authored 9 SOPs and a quality playbook adopted as default across **3 adjacent engagement teams**',
          ],
        },
        {
          label: 'Analytics &\nReporting',
          bullets: [
            'Built **12 Tableau dashboards** covering 90+ KPIs; tracked **₹40 Cr+** of brand spend in near-real-time for the client',
            'Designed an A/B testing framework adopted by the client\'s digital marketing team across **6 therapy areas**',
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
            'Defined a **GTM strategy for a new premium wood-finishes range** from **40+ dealer interviews** in 4 cities',
            'Modelled a **3-yr revenue plan of ₹120 Cr+** for the launch SKU; adopted by VP Marketing',
            'Identified **2 white-space segments (₹35 Cr+ TAM each)** from Nielsen, survey and channel data',
          ],
        },
      ],
    },
  ],
  positions: [
    {
      title: 'Cluster Lead,\nIndustry Interaction Cell, IIM Calcutta',
      bullets: [
        'Led a team of **9 PGP students** to manage placements with **15 firms** across BFSI and consulting',
        'Negotiated **42+ slots** with firms during summer placements; helped achieve **100% placement**',
        'Built a CRM in Notion tracking **800+ touchpoints**; cut recruiter response time by **~60%**',
      ],
      year: '2024',
    },
  ],
  extras: [
    {
      category: 'Sports &\nFitness',
      bullets: [
        { text: 'State-level table tennis player (**Rank 7/180+**) at West Bengal sub-junior nationals; won 4 medals', year: '13-16' },
        { text: 'Completed **2 half-marathons (Tata Mumbai 2023, Kolkata 25K)** with personal best of **1:48**', year: '23-24' },
      ],
    },
    {
      category: 'Community\nService',
      bullets: [
        { text: 'Volunteered **120+ hours** as math tutor at Shiksha Foundation for low-income class IX–X students', year: '20-22' },
        { text: 'Coordinated **blood donation drive (190+ donors)** at NIT Trichy in partnership with Red Cross Tamil Nadu', year: '2021' },
        { text: 'Built and maintained the open-source **case-prep wiki** with 24 contributors and **~6k page views/month**', year: '24-25' },
      ],
    },
  ],
  email: 'rohan.sengupta2026@email.iimcal.ac.in',
  institute: 'Indian Institute of Management Calcutta',
};
