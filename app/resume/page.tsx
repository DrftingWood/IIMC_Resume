"use client";

import { useEffect, useRef, useState } from "react";
import { ResumeData, STORAGE_KEY } from "../../types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function ResumePage() {
  const [data, setData] = useState<ResumeData | null>(null);
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
    const element = cvRef.current;

    // Make sure fonts/layout have settled
    const canvas = await html2canvas(element, {
      scale: 2,             // crisp
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Fit width, preserve aspect ratio
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");

    // Handle overflow to additional pages
    let heightLeft = imgHeight - pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    pdf.save("resume.pdf");
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your Resume</h1>
        <p className="text-neutral-600">
          No data found. Please fill the form first.
        </p>
        <a
          href="/form"
          className="inline-block rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
        >
          Go to form
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your Resume</h1>
        <div className="flex gap-2">
          <a
            href="/form"
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            Edit data
          </a>
          <button
            onClick={downloadPDF}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            Download PDF
          </button>
        </div>
      </header>

      {/* Printable CV */}
      <div
        ref={cvRef}
        className="mx-auto max-w-[780px] rounded-2xl border p-8"
        style={{ background: "#ffffff" }}
      >
        {/* Header (optional – minimal style, black text only) */}
        <div className="mb-6">
          <h2 className="text-xl font-bold uppercase tracking-wide">Resume</h2>
        </div>

        {/* EDUCATION */}
        <Section title="Education">
          {data.education?.map((edu, i) => (
            <div key={i} className="mb-4 last:mb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <div className="font-semibold">{edu.degree}</div>
                <div className="text-sm">{edu.year}</div>
              </div>
              <div className="text-sm italic">{edu.university}</div>
              {edu.gpa ? <div className="text-sm">GPA: {edu.gpa}</div> : null}
              {edu.description ? (
                <p className="mt-1 text-sm leading-relaxed">{edu.description}</p>
              ) : null}
            </div>
          ))}
        </Section>

        {/* EXPERIENCE */}
        <Section title="Work Experience">
          {data.experience?.map((exp, i) => (
            <div key={i} className="mb-4 last:mb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <div className="font-semibold">{exp.title}</div>
                <div className="text-sm">{exp.duration}</div>
              </div>
              <div className="text-sm italic">{exp.company}</div>
              {exp.description ? (
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                  {exp.description}
                </p>
              ) : null}
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 last:mb-0">
      <h3 className="mb-2 border-b pb-1 text-lg font-bold uppercase tracking-wide">
        {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}
