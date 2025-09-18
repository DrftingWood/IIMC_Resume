"use client";

import { useEffect, useRef, useState } from "react";
import { ResumeData, STORAGE_KEY } from "../../types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import clsx from "classnames";

// Icons
const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const PrintIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);

const EmailIcon = () => (
  <svg className="w-3.5 h-3.5 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-3.5 h-3.5 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const LocationIcon = () => (
  <svg className="w-3.5 h-3.5 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-3.5 h-3.5 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

type ExtendedResumeData = ResumeData & {
  personalInfo?: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    summary?: string;
  };
  skills?: {
    technical: string;
    soft: string;
    languages: string;
  };
  projects?: Array<{
    name: string;
    description: string;
    technologies: string;
    link: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
};

export default function ResumePage() {
  const [data, setData] = useState<ExtendedResumeData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [template, setTemplate] = useState<"classic" | "modern" | "minimal">("modern");
  const cvRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setData(JSON.parse(raw));
      } catch {
        setData(null);
      }
    }
  }, []);

  const downloadPDF = async () => {
    if (!cvRef.current) return;
    setDownloading(true);
    const element = cvRef.current;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4"
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");

      let heightLeft = imgHeight - pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      const fileName = data?.personalInfo?.name 
        ? `${data.personalInfo.name.replace(/\s+/g, '_')}_Resume.pdf`
        : "resume.pdf";
      
      pdf.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Resume Data Found</h1>
          <p className="text-gray-600 mb-6">
            Please fill out the form first to generate your resume.
          </p>
          <a
            href="/form"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all"
          >
            <EditIcon />
            Go to Form
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header Controls */}
        <header className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Your Resume
              </h1>
              <p className="text-sm text-gray-600 mt-1">Preview and download your professional resume</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Template Selector */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                {(["classic", "modern", "minimal"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTemplate(t)}
                    className={clsx(
                      "px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all",
                      template === t 
                        ? "bg-white shadow-sm text-blue-600" 
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <a
                href="/form"
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <EditIcon />
                Edit Resume
              </a>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <PrintIcon />
                Print
              </button>
              <button
                onClick={downloadPDF}
                disabled={downloading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <DownloadIcon />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Resume Preview Container */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 overflow-x-auto">
          <div
            ref={cvRef}
            className={clsx(
              "mx-auto",
              "resume-container",
              template === "modern" && "resume-modern",
              template === "classic" && "resume-classic",
              template === "minimal" && "resume-minimal"
            )}
            style={{ 
              maxWidth: "850px",
              minHeight: "1100px",
              backgroundColor: "#ffffff",
              padding: template === "minimal" ? "40px" : "0"
            }}
          >
            {template === "modern" && <ModernTemplate data={data} />}
            {template === "classic" && <ClassicTemplate data={data} />}
            {template === "minimal" && <MinimalTemplate data={data} />}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .resume-container, .resume-container * {
            visibility: visible;
          }
          .resume-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

// Modern Template
function ModernTemplate({ data }: { data: ExtendedResumeData }) {
  return (
    <div className="bg-white">
      {/* Header with gradient accent */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
        <h1 className="text-4xl font-bold mb-2">
          {data.personalInfo?.name || "Your Name"}
        </h1>
        {data.personalInfo?.summary && (
          <p className="text-blue-50 text-sm leading-relaxed max-w-3xl">
            {data.personalInfo.summary}
          </p>
        )}
      </div>

      {/* Contact Bar */}
      <div className="bg-gray-50 px-8 py-4 border-b">
        <div className="flex flex-wrap gap-4 text-sm">
          {data.personalInfo?.email && (
            <span className="text-gray-700">
              <EmailIcon />
              {data.personalInfo.email}
            </span>
          )}
          {data.personalInfo?.phone && (
            <span className="text-gray-700">
              <PhoneIcon />
              {data.personalInfo.phone}
            </span>
          )}
          {data.personalInfo?.location && (
            <span className="text-gray-700">
              <LocationIcon />
              {data.personalInfo.location}
            </span>
          )}
          {data.personalInfo?.linkedin && (
            <span className="text-gray-700">
              <LinkIcon />
              {data.personalInfo.linkedin}
            </span>
          )}
          {data.personalInfo?.github && (
            <span className="text-gray-700">
              <LinkIcon />
              {data.personalInfo.github}
            </span>
          )}
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Experience */}
        {data.experience && data.experience.length > 0 && (
          <Section title="Professional Experience" accent="modern">
            {data.experience.map((exp, i) => (
              <div key={i} className="mb-5 last:mb-0">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h4 className="font-semibold text-gray-900">{exp.title}</h4>
                    <p className="text-blue-600 font-medium">{exp.company}</p>
                  </div>
                  <span className="text-sm text-gray-600 font-medium">{exp.duration}</span>
                </div>
                {exp.description && (
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Education */}
        {data.education && data.education.length > 0 && (
          <Section title="Education" accent="modern">
            {data.education.map((edu, i) => (
              <div key={i} className="mb-4 last:mb-0">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h4 className="font-semibold text-gray-900">{edu.degree}</h4>
                    <p className="text-blue-600 font-medium">{edu.university}</p>
                  </div>
                  <span className="text-sm text-gray-600 font-medium">{edu.year}</span>
                </div>
                {edu.gpa && (
                  <p className="text-sm text-gray-700">GPA: {edu.gpa}</p>
                )}
                {edu.description && (
                  <p className="mt-1 text-sm text-gray-700 leading-relaxed">
                    {edu.description}
                  </p>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Skills */}
        {data.skills && (data.skills.technical || data.skills.soft || data.skills.languages) && (
          <Section title="Skills" accent="modern">
            {data.skills.technical && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Technical Skills</h4>
                <p className="text-sm text-gray-600">{data.skills.technical}</p>
              </div>
            )}
            {data.skills.soft && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Soft Skills</h4>
                <p className="text-sm text-gray-600">{data.skills.soft}</p>
              </div>
            )}
            {data.skills.languages && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Languages</h4>
                <p className="text-sm text-gray-600">{data.skills.languages}</p>
              </div>
            )}
          </Section>
        )}

        {/* Projects */}
        {data.projects && data.projects.length > 0 && (
          <Section title="Projects" accent="modern">
            {data.projects.map((project, i) => (
              <div key={i} className="mb-4 last:mb-0">
                <h4 className="font-semibold text-gray-900">
                  {project.name}
                  {project.link && (
                    <span className="ml-2 text-sm font-normal text-blue-600">
                      ({project.link})
                    </span>
                  )}
                </h4>
                {project.technologies && (
                  <p className="text-sm text-gray-600 italic mb-1">
                    Technologies: {project.technologies}
                  </p>
                )}
                {project.description && (
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {project.description}
                  </p>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Certifications */}
        {data.certifications && data.certifications.length > 0 && (
          <Section title="Certifications" accent="modern">
            {data.certifications.map((cert, i) => (
              <div key={i} className="mb-2 last:mb-0 flex justify-between">
                <div>
                  <span className="font-medium text-gray-900">{cert.name}</span>
                  <span className="text-gray-600"> • {cert.issuer}</span>
                </div>
                <span className="text-sm text-gray-600">{cert.date}</span>
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

// Classic Template
function ClassicTemplate({ data }: { data: ExtendedResumeData }) {
  return (
    <div className="p-10 bg-white">
      {/* Header */}
      <div className="text-center mb-6 pb-4 border-b-2 border-gray-900">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {data.personalInfo?.name || "Your Name"}
        </h1>
        <div className="flex justify-center flex-wrap gap-3 text-sm">
          {data.personalInfo?.email && <span>{data.personalInfo.email}</span>}
          {data.personalInfo?.phone && <span>• {data.personalInfo.phone}</span>}
          {data.personalInfo?.location && <span>• {data.personalInfo.location}</span>}
        </div>
        {(data.personalInfo?.linkedin || data.personalInfo?.github) && (
          <div className="flex justify-center flex-wrap gap-3 text-sm mt-1">
            {data.personalInfo?.linkedin && <span>{data.personalInfo.linkedin}</span>}
            {data.personalInfo?.github && <span>• {data.personalInfo.github}</span>}
          </div>
        )}
      </div>

      {/* Summary */}
      {data.personalInfo?.summary && (
        <div className="mb-6">
          <p className="text-sm leading-relaxed text-gray-700 italic text-center">
            {data.personalInfo.summary}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        {/* Education */}
        {data.education && data.education.length > 0 && (
          <Section title="EDUCATION" accent="classic">
            {data.education.map((edu, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="font-bold">{edu.degree}</span>
                    {edu.gpa && <span className="ml-2 text-sm">(GPA: {edu.gpa})</span>}
                  </div>
                  <span className="text-sm">{edu.year}</span>
                </div>
                <div className="text-sm italic">{edu.university}</div>
                {edu.description && (
                  <p className="mt-1 text-sm text-gray-700">{edu.description}</p>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Experience */}
        {data.experience && data.experience.length > 0 && (
          <Section title="WORK EXPERIENCE" accent="classic">
            {data.experience.map((exp, i) => (
              <div key={i} className="mb-4 last:mb-0">
                <div className="flex justify-between items-baseline">
                  <div className="font-bold">{exp.title}</div>
                  <span className="text-sm">{exp.duration}</span>
                </div>
                <div className="text-sm italic mb-1">{exp.company}</div>
                {exp.description && (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Skills */}
        {data.skills && (data.skills.technical || data.skills.soft) && (
          <Section title="SKILLS" accent="classic">
            {data.skills.technical && (
              <div className="mb-2">
                <span className="font-semibold text-sm">Technical: </span>
                <span className="text-sm">{data.skills.technical}</span>
              </div>
            )}
            {data.skills.soft && (
              <div className="mb-2">
                <span className="font-semibold text-sm">Soft Skills: </span>
                <span className="text-sm">{data.skills.soft}</span>
              </div>
            )}
            {data.skills.languages && (
              <div>
                <span className="font-semibold text-sm">Languages: </span>
                <span className="text-sm">{data.skills.languages}</span>
              </div>
            )}
          </Section>
        )}

        {/* Projects */}
        {data.projects && data.projects.length > 0 && (
          <Section title="PROJECTS" accent="classic">
            {data.projects.map((project, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <div className="font-bold text-sm">
                  {project.name}
                  {project.link && <span className="font-normal ml-2">({project.link})</span>}
                </div>
                {project.technologies && (
                  <div className="text-sm italic text-gray-600">
                    {project.technologies}
                  </div>
                )}
                {project.description && (
                  <p className="text-sm text-gray-700 mt-1">{project.description}</p>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Certifications */}
        {data.certifications && data.certifications.length > 0 && (
          <Section title="CERTIFICATIONS" accent="classic">
            {data.certifications.map((cert, i) => (
              <div key={i} className="text-sm mb-1 last:mb-0">
                <span className="font-semibold">{cert.name}</span>
                <span> - {cert.issuer}</span>
                <span className="text-gray-600"> ({cert.date})</span>
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

// Minimal Template
function MinimalTemplate({ data }: { data: ExtendedResumeData }) {
  return (
    <div className="bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-light tracking-wide mb-3">
          {data.personalInfo?.name || "Your Name"}
        </h1>
        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex flex-wrap gap-4">
            {data.personalInfo?.email && <span>{data.personalInfo.email}</span>}
            {data.personalInfo?.phone && <span>{data.personalInfo.phone}</span>}
            {data.personalInfo?.location && <span>{data.personalInfo.location}</span>}
          </div>
          <div className="flex flex-wrap gap-4">
            {data.personalInfo?.linkedin && <span>{data.personalInfo.linkedin}</span>}
            {data.personalInfo?.github && <span>{data.personalInfo.github}</span>}
            {data.personalInfo?.portfolio && <span>{data.personalInfo.portfolio}</span>}
          </div>
        </div>
        {data.personalInfo?.summary && (
          <p className="mt-3 text-sm text-gray-700 leading-relaxed">
            {data.personalInfo.summary}
          </p>
        )}
      </div>

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
            Experience
          </h2>
          {data.experience.map((exp, i) => (
            <div key={i} className="mb-4 last:mb-0">
              <div className="flex justify-between items-baseline mb-1">
                <div>
                  <span className="font-medium">{exp.title}</span>
                  <span className="text-gray-500 mx-2">—</span>
                  <span className="text-gray-700">{exp.company}</span>
                </div>
                <span className="text-sm text-gray-500">{exp.duration}</span>
              </div>
              {exp.description && (
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {exp.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
            Education
          </h2>
          {data.education.map((edu, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="font-medium">{edu.degree}</span>
                  <span className="text-gray-500 mx-2">—</span>
                  <span className="text-gray-700">{edu.university}</span>
                </div>
                <span className="text-sm text-gray-500">{edu.year}</span>
              </div>
              {(edu.g
