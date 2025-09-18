"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Education, Experience, ResumeData, STORAGE_KEY } from "../../types";
import clsx from "classnames";

// Icons as simple SVG components
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const LoadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={clsx("w-5 h-5 transition-transform", open && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default function FormPage() {
  const router = useRouter();
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    github: "",
    portfolio: "",
    location: "",
    summary: ""
  });
  const [education, setEducation] = useState<Education[]>([
    { degree: "", university: "", year: "", gpa: "", description: "" }
  ]);
  const [experience, setExperience] = useState<Experience[]>([
    { title: "", company: "", duration: "", description: "" }
  ]);
  const [skills, setSkills] = useState({
    technical: "",
    soft: "",
    languages: ""
  });
  const [projects, setProjects] = useState<Array<{
    name: string;
    description: string;
    technologies: string;
    link: string;
  }>>([]);
  const [certifications, setCertifications] = useState<Array<{
    name: string;
    issuer: string;
    date: string;
  }>>([]);
  
  const [saving, setSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    education: true,
    experience: true,
    skills: false,
    projects: false,
    certifications: false
  });

  // Calculate completion percentage
  useEffect(() => {
    let filledFields = 0;
    let totalFields = 8; // Basic personal info fields

    // Personal info
    if (personalInfo.name) filledFields++;
    if (personalInfo.email) filledFields++;
    if (personalInfo.phone) filledFields++;
    if (personalInfo.location) filledFields++;
    
    // At least one education
    if (education.some(e => e.degree && e.university)) filledFields++;
    
    // At least one experience
    if (experience.some(e => e.title && e.company)) filledFields++;
    
    // Skills
    if (skills.technical) filledFields++;
    
    // Summary
    if (personalInfo.summary) filledFields++;

    setCompletionPercentage(Math.round((filledFields / totalFields) * 100));
  }, [personalInfo, education, experience, skills]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled) return;
    
    const timer = setTimeout(() => {
      saveData(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [personalInfo, education, experience, skills, projects, certifications, autoSaveEnabled]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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

  const addProject = () =>
    setProjects((p) => [...p, { name: "", description: "", technologies: "", link: "" }]);
  const removeProject = (idx: number) =>
    setProjects((p) => p.filter((_, i) => i !== idx));
  const updateProject = (idx: number, key: keyof typeof projects[0], val: string) =>
    setProjects((p) => p.map((row, i) => (i === idx ? { ...row, [key]: val } : row)));

  const addCertification = () =>
    setCertifications((c) => [...c, { name: "", issuer: "", date: "" }]);
  const removeCertification = (idx: number) =>
    setCertifications((c) => c.filter((_, i) => i !== idx));
  const updateCertification = (idx: number, key: keyof typeof certifications[0], val: string) =>
    setCertifications((c) => c.map((row, i) => (i === idx ? { ...row, [key]: val } : row)));

  const saveData = (showNotification = true) => {
    const data: ResumeData & { 
      personalInfo: typeof personalInfo; 
      skills: typeof skills;
      projects: typeof projects;
      certifications: typeof certifications;
    } = { 
      personalInfo, 
      education, 
      experience, 
      skills, 
      projects,
      certifications 
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setLastSaved(new Date());
    if (showNotification) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    saveData();
    setTimeout(() => {
      setSaving(false);
      router.push("/resume");
    }, 500);
  };

  const loadExisting = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      alert("No saved data found!");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setPersonalInfo(parsed.personalInfo || personalInfo);
      setEducation(parsed.education?.length ? parsed.education : education);
      setExperience(parsed.experience?.length ? parsed.experience : experience);
      setSkills(parsed.skills || skills);
      setProjects(parsed.projects || []);
      setCertifications(parsed.certifications || []);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
      alert("Error loading saved data");
    }
  };

  const clearAll = () => {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Build Your Resume
              </h1>
              <p className="text-sm text-gray-600 mt-1">Fill in your details to create a professional resume</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="rounded"
                />
                Auto-save
              </label>
              <button
                type="button"
                onClick={loadExisting}
                className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <LoadIcon />
                Load saved
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-2 rounded-xl border border-red-200 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors"
              >
                <TrashIcon />
                Clear all
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Profile Completion</span>
              <span className="font-medium text-gray-900">{completionPercentage}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
          
          {lastSaved && (
            <p className="text-xs text-gray-500 mt-2">
              Last saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </header>

        {/* Success Notification */}
        {showSuccess && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-in">
            ✓ Data saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Section
            title="Personal Information"
            expanded={expandedSections.personal}
            onToggle={() => toggleSection('personal')}
            required
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                value={personalInfo.name}
                onChange={(v) => setPersonalInfo({...personalInfo, name: v})}
                placeholder="John Doe"
                required
              />
              <Input
                label="Email"
                type="email"
                value={personalInfo.email}
                onChange={(v) => setPersonalInfo({...personalInfo, email: v})}
                placeholder="john@example.com"
                required
              />
              <Input
                label="Phone"
                value={personalInfo.phone}
                onChange={(v) => setPersonalInfo({...personalInfo, phone: v})}
                placeholder="+1 234 567 8900"
                required
              />
              <Input
                label="Location"
                value={personalInfo.location}
                onChange={(v) => setPersonalInfo({...personalInfo, location: v})}
                placeholder="New York, NY"
                required
              />
              <Input
                label="LinkedIn (optional)"
                value={personalInfo.linkedin}
                onChange={(v) => setPersonalInfo({...personalInfo, linkedin: v})}
                placeholder="linkedin.com/in/johndoe"
              />
              <Input
                label="GitHub (optional)"
                value={personalInfo.github}
                onChange={(v) => setPersonalInfo({...personalInfo, github: v})}
                placeholder="github.com/johndoe"
              />
              <Input
                label="Portfolio (optional)"
                value={personalInfo.portfolio}
                onChange={(v) => setPersonalInfo({...personalInfo, portfolio: v})}
                placeholder="johndoe.com"
              />
              <Textarea
                label="Professional Summary"
                value={personalInfo.summary}
                onChange={(v) => setPersonalInfo({...personalInfo, summary: v})}
                placeholder="Brief 2-3 sentence summary highlighting your expertise and career objectives..."
                className="sm:col-span-2"
              />
            </div>
          </Section>

          {/* Education */}
          <Section
            title="Education"
            expanded={expandedSections.education}
            onToggle={() => toggleSection('education')}
            required
          >
            <div className="space-y-4">
              {education.map((row, idx) => (
                <Card key={idx} onRemove={() => removeEdu(idx)} canRemove={education.length > 1}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Degree"
                      value={row.degree}
                      onChange={(v) => updateEdu(idx, "degree", v)}
                      placeholder="Bachelor of Science in Computer Science"
                      required
                    />
                    <Input
                      label="University"
                      value={row.university}
                      onChange={(v) => updateEdu(idx, "university", v)}
                      placeholder="Stanford University"
                      required
                    />
                    <Input
                      label="Year"
                      value={row.year}
                      onChange={(v) => updateEdu(idx, "year", v)}
                      placeholder="2018 - 2022"
                      required
                    />
                    <Input
                      label="GPA (optional)"
                      value={row.gpa ?? ""}
                      onChange={(v) => updateEdu(idx, "gpa", v)}
                      placeholder="3.8/4.0"
                    />
                    <Textarea
                      label="Additional Details (optional)"
                      value={row.description ?? ""}
                      onChange={(v) => updateEdu(idx, "description", v)}
                      placeholder="Relevant coursework, honors, activities..."
                      className="sm:col-span-2"
                    />
                  </div>
                </Card>
              ))}
              <button
                type="button"
                onClick={addEdu}
                className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <PlusIcon />
                Add Education
              </button>
            </div>
          </Section>

          {/* Experience */}
          <Section
            title="Work Experience"
            expanded={expandedSections.experience}
            onToggle={() => toggleSection('experience')}
            required
          >
            <div className="space-y-4">
              {experience.map((row, idx) => (
                <Card key={idx} onRemove={() => removeExp(idx)} canRemove={experience.length > 1}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Job Title"
                      value={row.title}
                      onChange={(v) => updateExp(idx, "title", v)}
                      placeholder="Senior Software Engineer"
                      required
                    />
                    <Input
                      label="Company"
                      value={row.company}
                      onChange={(v) => updateExp(idx, "company", v)}
                      placeholder="Google"
                      required
                    />
                    <Input
                      label="Duration"
                      value={row.duration}
                      onChange={(v) => updateExp(idx, "duration", v)}
                      placeholder="Jan 2022 - Present"
                      required
                    />
                    <Textarea
                      label="Description"
                      value={row.description ?? ""}
                      onChange={(v) => updateExp(idx, "description", v)}
                      placeholder="• Led development of key features...&#10;• Improved system performance by 40%...&#10;• Mentored junior developers..."
                      className="sm:col-span-2"
                      rows={4}
                    />
                  </div>
                </Card>
              ))}
              <button
                type="button"
                onClick={addExp}
                className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <PlusIcon />
                Add Experience
              </button>
            </div>
          </Section>

          {/* Skills */}
          <Section
            title="Skills"
            expanded={expandedSections.skills}
            onToggle={() => toggleSection('skills')}
          >
            <div className="space-y-4">
              <Textarea
                label="Technical Skills"
                value={skills.technical}
                onChange={(v) => setSkills({...skills, technical: v})}
                placeholder="JavaScript, React, Node.js, Python, AWS, Docker..."
                rows={2}
              />
              <Textarea
                label="Soft Skills (optional)"
                value={skills.soft}
                onChange={(v) => setSkills({...skills, soft: v})}
                placeholder="Leadership, Communication, Problem-solving..."
                rows={2}
              />
              <Textarea
                label="Languages (optional)"
                value={skills.languages}
                onChange={(v) => setSkills({...skills, languages: v})}
                placeholder="English (Native), Spanish (Fluent), French (Basic)..."
                rows={2}
              />
            </div>
          </Section>

          {/* Projects */}
          <Section
            title="Projects"
            expanded={expandedSections.projects}
            onToggle={() => toggleSection('projects')}
          >
            <div className="space-y-4">
              {projects.map((project, idx) => (
                <Card key={idx} onRemove={() => removeProject(idx)} canRemove>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Project Name"
                      value={project.name}
                      onChange={(v) => updateProject(idx, "name", v)}
                      placeholder="E-commerce Platform"
                    />
                    <Input
                      label="Project Link (optional)"
                      value={project.link}
                      onChange={(v) => updateProject(idx, "link", v)}
                      placeholder="github.com/username/project"
                    />
                    <Input
                      label="Technologies Used"
                      value={project.technologies}
                      onChange={(v) => updateProject(idx, "technologies", v)}
                      placeholder="React, Node.js, MongoDB"
                      className="sm:col-span-2"
                    />
                    <Textarea
                      label="Description"
                      value={project.description}
                      onChange={(v) => updateProject(idx, "description", v)}
                      placeholder="Built a full-stack e-commerce platform with features like..."
                      className="sm:col-span-2"
                    />
                  </div>
                </Card>
              ))}
              <button
                type="button"
                onClick={addProject}
                className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <PlusIcon />
                Add Project
              </button>
            </div>
          </Section>

          {/* Certifications */}
          <Section
            title="Certifications"
            expanded={expandedSections.certifications}
            onToggle={() => toggleSection('certifications')}
          >
            <div className="space-y-4">
              {certifications.map((cert, idx) => (
                <Card key={idx} onRemove={() => removeCertification(idx)} canRemove>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input
                      label="Certification Name"
                      value={cert.name}
                      onChange={(v) => updateCertification(idx, "name", v)}
                      placeholder="AWS Solutions Architect"
                    />
                    <Input
                      label="Issuing Organization"
                      value={cert.issuer}
                      onChange={(v) => updateCertification(idx, "issuer", v)}
                      placeholder="Amazon Web Services"
                    />
                    <Input
                      label="Date"
                      value={cert.date}
                      onChange={(v) => updateCertification(idx, "date", v)}
                      placeholder="March 2023"
                    />
                  </div>
                </Card>
              ))}
              <button
                type="button"
                onClick={addCertification}
                className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <PlusIcon />
                Add Certification
              </button>
            </div>
          </Section>

          {/* Submit Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Ready to preview?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Your data is automatically saved locally in your browser.
                </p>
              </div>
              <button
                type="submit"
                disabled={saving || completionPercentage < 50}
                className={clsx(
                  "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all",
                  completionPercentage >= 50
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg transform hover:scale-105"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                {saving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <SaveIcon />
                    Save & Preview Resume
                  </>
                )}
              </button>
            </div>
            {completionPercentage < 50 && (
              <p className="text-sm text-amber-600 mt-3">
                ⚠️ Please complete at least 50% of your profile before previewing
              </p>
            )}
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// Section Component
function Section({ 
  title, 
  children, 
  expanded, 
  onToggle,
  required = false 
}: { 
  title: string; 
  children: React.ReactNode; 
  expanded: boolean; 
  onToggle: () => void;
  required?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {required && <span className="text-xs text-red-500 font-medium">Required</span>}
        </div>
        <ChevronIcon open={expanded} />
      </button>
      {expanded && (
        <div className="px-6 pb-6">
          <div className="border-t pt-6">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// Card Component
function Card({ 
  children, 
  onRemove, 
  canRemove = true 
}: { 
  children: React.ReactNode; 
  onRemove: () => void; 
  canRemove?: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 relative group">
      {children}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-4 right-4 p-2 rounded-lg bg-white border border-gray-200 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
          aria-label="Remove"
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
}

// Enhanced Input Component
function Input({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  className = ""
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  className?: string;
}) {
  return (
    <label className={clsx("flex flex-col gap-2", className)}>
      <span className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
      <input
        type={type}
        className="rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

// Enhanced Textarea Component
function Textarea({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  rows = 3
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}) {
  return (
    <label className={clsx("flex flex-col gap-2", className)}>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <textarea
        className="rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </label>
  );
}
