import type { ResumeData } from '@/types/resume';

export const SAMPLE: ResumeData = {
  name: 'ABHISHEK LALATENDU ACHARYA',
  mbaId: 'MBA/0166/61',
  taglines: [
    'IIM C CEMS RANK 1; MIM @ HEC PARIS',
    'MCKINSEY INTERN; ITC (PPI)',
    "INT'L DEBATOR, 6X NATL. CHAMPION",
  ],
  education: [
    { degree: 'MBA', institute: 'Indian Institute of Management Calcutta', gpa: '7.29/9', year: '2026' },
    { degree: 'B.Tech Chemical Engineering', institute: 'Indian Institute of Technology Bombay', gpa: '8.25/10', year: '2022' },
    { degree: 'CLASS XII', institute: 'Higher Secondary Certificate', gpa: '91.69 %', year: '2018' },
    { degree: 'CLASS X', institute: 'Indian Certificate of Secondary Education', gpa: '96.83 %', year: '2016' },
  ],
  distinctions: [
    {
      category: 'Competitive Examinations',
      bullets: [
        { text: 'Secured **99.99%ile/2.8L+** candidates in CAT, **100%ile in DILR**; Admission Rank 4/4.8K+ at IIM Indore', year: '2023' },
        { text: 'Achieved **AIR 1638/1.5L+** candidates in JEE (Advanced); **99.84%ile/10.4L+** candidates in JEE (Main)', year: '2018' },
        { text: 'Ranked **7/1L+** candidates in Maharashtra Talent Exam; **Bronze/75K+** applicants in **Homi Bhaba** Exam', year: '2015' },
      ],
    },
    {
      category: 'National Scholarships',
      bullets: [
        { text: 'Conferred the **NTSE Scholarship** by NCERT, given to **0.1%/12L+**, received a **scholarship** worth ₹1.2L+', year: '2016' },
        { text: 'Recipient of **KVPY Fellowship** by IISc Bangalore with **AIR 192/90K+**, awarded a **fellowship** of ₹4.6L+', year: '2017' },
      ],
    },
    {
      category: 'International Distinction & Mentorship',
      bullets: [
        { text: "IIM C **CEMS MiM Rank 1/480** pursuing Intl' Mgmt. at **HEC Paris**; **Adani** Digitization Business Project", year: '25-26' },
        { text: 'Coached **U15 Indian** squad for **Oxford ICYD** who were crowned **Champions** among **48 global teams**', year: '2022' },
        { text: 'Trained **100+ school debaters** in the **APAC** region at academies in Singapore, China and South Korea', year: '21-24' },
      ],
    },
    {
      category: 'National Case Competitions',
      bullets: [
        { text: '**National Winner**/500+ teams, **Lodha(PPI)**; Campus Winner, **ITC(PPI)** Interrobang; **₹3L+** agg. winnings', year: '2025' },
        { text: "**3x Nat'l Semis**: **Flipkart**(35K), Bajaj FinServ(2K), Tata Steel(4K); **3x Campus F'nls**: EYP, Asian Paints, VCIC", year: '24-25' },
        { text: '**Founder**, Case Collective, **250+** student votes; **2nd/2K+**, CFO Challenge, IIMB; **3rd/80** Joka Bulls, IIMC', year: '24-25' },
      ],
    },
  ],
  industryRightText: '22 MONTHS (FULL-TIME)',
  experience: [
    {
      type: 'Full Time',
      firm: 'AB INBEV',
      role: 'DATA ENGINEER',
      dates: "Aug`22 - May`24",
      subSections: [
        {
          label: 'Awards and Recognition',
          bullets: [
            '**NASSCOM** award-winning ML team member, ethically streamlining risk identification across **60+ countries**',
            '**1/220** employees felicitated with the **Cicerone & Pint Awards** by the Command Centre **senior leadership**',
          ],
        },
        {
          label: 'Cost Optimization',
          bullets: [
            'Saved **200+ FTE hours** annually by achieving a **43% run-time reduction** redesigning **Data Factory** pipelines',
            'Achieved **40% cost savings** of **$50K annually** by leading platform migration of **12 dashboards** to **Delta Lake**',
          ],
        },
        {
          label: 'Governance, Risk & Analytics',
          bullets: [
            'Oversaw data of **250K+ employees**, automating a risk-triggered mail suite to **80+ zonal compliance officers**',
            'Analyzed **$40B+ vendor transactions** across **80M+ invoices** detecting at-risk payments of **$168M+** via ML',
          ],
        },
        {
          label: 'Stakeholder Management',
          bullets: [
            'Empowered **100+ global compliance managers** in **7 BUs** by managing the daily operations of 2 dashboards',
            'Advised **80 compliance officers** across **6 global zones** on **financial** report quality by designing a **NLP model**',
          ],
        },
      ],
    },
    {
      type: 'Intern',
      firm: 'MCKINSEY',
      role: 'SUMMER ASSOCIATE',
      dates: "May`25 - Jun`25",
      subSections: [
        {
          label: 'BFSI CX Transformation',
          bullets: [
            'Led modernization of CX for **$6B BFSI** client by redesigning **8 Omni-channel service journeys** for **2M+ users**',
            'Drafted **2 strategic proposals ($70M)**, targeting **digital transformation** and commercial **banking expansion**',
            'Identified **8 critical feature gaps** via benchmarking **20+ global rivals** across **200+ offerings** on 50+ metrics',
          ],
        },
      ],
    },
    {
      type: 'Intern',
      firm: 'WINZO',
      role: 'STRATEGY & GROWTH',
      dates: "April`26 - May`26",
      subSections: [
        {
          label: '[Theme]',
          bullets: ['[Bullet 1 — fill in]', '[Bullet 2 — fill in]'],
        },
      ],
    },
  ],
  positions: [
    {
      title: 'Council Chair,\nUnited Asian Debate Union',
      bullets: [
        'Elected rep. of **30 Univ. from 7 countries** to oversee **400+ debates** at the **Asian AP Championships**',
        'Led a **10 member** team, supervising the Malaysian **UADC** with **400+ participants** from **12 countries**',
        'Amended **15+ statutes** to modernize **UADC** constitution; Distributed **$1K+** need based scholarships',
      ],
      year: '2021',
    },
    {
      title: 'Tourney Director,\nIIT Bombay Debate',
      bullets: [
        "Led a **25 member** team to host one of **India's biggest** debate championship with **300+ participants**",
        'Administered budget worth **INR 2.5L+** & achieved **100% y-o-y growth** in **international** participation',
      ],
      year: '2020',
    },
  ],
  extras: [
    {
      category: 'International Debating',
      bullets: [
        { text: '**QF Judge** at **Korea, Belgrade & Vietnam** World Championships with **900+ debaters** of **42 countries**', year: '21-24' },
        { text: 'Judged **Finals** at **30+ Intl. competitions** inc. **Yale, Tokyo, Oxford & Sydney** with remuneration of ₹7L+', year: '20-24' },
        { text: '**6x National Champion**; **3rd Rank Team** (Highest by an Indian Team ever) & **10th Best Speaker**, Asian Championships', year: '20-24' },
      ],
    },
    {
      category: 'Strategy Competitions',
      bullets: [
        { text: '**3/80+** IITB teams Strategy Wars; **4/120+** IITB teams Logic GC; **3/40+** schools **CBSE Cryptic Crossword**', year: '18, 15' },
        { text: '**1/400+** teams in **Bournvita Quiz**, Mumbai City; **1st rank** in **5 inter-school** and **7 intra-school** quizzes', year: '09-15' },
      ],
    },
  ],
  email: 'abhisheka2026@email.iimcal.ac.in',
  institute: 'Indian Institute of Management Calcutta',
};
