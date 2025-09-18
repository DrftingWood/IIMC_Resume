"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Education, Experience, ResumeData, STORAGE_KEY } from "../../types";
import clsx from "classnames";

export default function FormPage() {
  const router = useRouter();
  const [education, setEducation] = useState<Education[]>([
    { degree: "", university: "", year: "", gpa: "", description: "" }
  ]);
  const [experience, setExperience] = useState<Experience[]>([
    { title: "", company: "", duration: "", description: "" }
  ]);
  const [saving, setSaving] = useState(false);

  const addEdu = () =>
    setEducation((e) => [...e, { degree: "", university: "", year: "", gpa: "", description: "" }]);
  const removeEdu = (idx: number) =>
    setEducation((e) => e.filter((_, i) => i !== idx));

  const updateEdu = (idx: number, key: keyof Education, val: string) =>
    setEducation((e) => e.map((row, i) => (i === idx ? { ...row, [key]: val } : row)));

  const addExp = () =>
    setExperience((e) => [...e, { title: "", company: "", duration: "", description: "" }]);
  const removeExp = (idx: number) =>
    setExperience((e) => e.filter((_, i) => i !== idx));

  const updateExp = (idx: number, key: keyof Experience, val: string) =>
    setExperience((e) => e.map((row, i) => (i === idx ? { ...row, [key]: val } : row)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data: ResumeData = { education, experience };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSaving(false);
    router.push("/resume");
  };

  const loadExisting = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed: ResumeData = JSON.parse(raw);
      setEducation(parsed.education?.length ? parsed.education : education);
      setExperience(parsed.experience?.length ? parsed.experience : experience);
    } catch {}
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Build your resume</h1>
        <button
          type="button"
          onClick={loadExisting}
          className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          Load saved data
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Education */}
        <section>
          <h2 className="text-lg font-bold uppercase tracking-wide">Education</h2>
          <div className="mt-4 space-y-6">
            {education.map((row, idx) => (
              <div key={idx} className="rounded-2xl border p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Degree"
                    value={row.degree}
                    onChange={(v) => updateEdu(idx, "degree", v)}
                    placeholder="B.Tech in Chemical Engineering"
                    required
                  />
                  <Input
                    label="University"
                    value={row.university}
                    onChange={(v) => updateEdu(idx, "university", v)}
                    placeholder="IIT Bombay"
                    required
                  />
                  <Input
                    label="Year"
                    value={row.year}
                    onChange={(v) => updateEdu(idx, "year", v)}
                    placeholder="2022"
                    required
                  />
                  <Input
                    label="GPA (optional)"
                    value={row.gpa ?? ""}
                    onChange={(v) => updateEdu(idx, "gpa", v)}
                    placeholder="8.5/10"
                  />
                  <Textarea
                    label="Description (optional)"
                    value={row.description ?? ""}
                    onChange={(v) => updateEdu(idx, "description", v)}
                    placeholder="Relevant coursework, honors, societies…"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeEdu(idx)}
                    className={clsx(
                      "rounded-xl border px-3 py-1.5 text-sm",
                      education.length === 1 && "opacity-30 pointer-events-none"
                    )}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addEdu}
              className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
            >
              + Add education
            </button>
          </div>
        </section>

        {/* Experience */}
        <section>
          <h2 className="text-lg font-bold uppercase tracking-wide">Work Experience</h2>
          <div className="mt-4 space-y-6">
            {experience.map((row, idx) => (
              <div key={idx} className="rounded-2xl border p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Job Title"
                    value={row.title}
                    onChange={(v) => updateExp(idx, "title", v)}
                    placeholder="Data Scientist"
                    required
                  />
                  <Input
                    label="Company"
                    value={row.company}
                    onChange={(v) => updateExp(idx, "company", v)}
                    placeholder="AB InBev"
                    required
                  />
                  <Input
                    label="Duration"
                    value={row.duration}
                    onChange={(v) => updateExp(idx, "duration", v)}
                    placeholder="Jun 2022 – Aug 2024"
                    required
                  />
                  <Textarea
                    label="Description (optional)"
                    value={row.description ?? ""}
                    onChange={(v) => updateExp(idx, "description", v)}
                    placeholder="Key responsibilities, achievements, tools used…"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeExp(idx)}
                    className={clsx(
                      "rounded-xl border px-3 py-1.5 text-sm",
                      experience.length === 1 && "opacity-30 pointer-events-none"
                    )}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addExp}
              className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
            >
              + Add experience
            </button>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            {saving ? "Saving…" : "Save & Preview Resume"}
          </button>
          <span className="text-xs text-neutral-500">Data is stored locally in your browser.</span>
        </div>
      </form>
    </div>
  );
}

function Input(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const { label, value, onChange, placeholder, required } = props;
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        className="rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function Textarea(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { label, value, onChange, placeholder } = props;
  return (
    <label className="sm:col-span-2 flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        className="min-h-[90px] rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
