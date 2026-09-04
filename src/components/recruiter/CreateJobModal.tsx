import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { DatePicker } from "rsuite"
import "rsuite/DatePicker/styles/index.css"
import type { Job } from "../../store/slices/jobsSlice"
import {
  DEPARTMENTS,
  JOB_TYPES,
  WORK_MODES,
  EXPERIENCE_LEVELS,
  EDUCATION_LEVELS,
  getTomorrowISODate,
} from "../../constants/jobOptions"
import { SelectField } from "../common/SelectField"
import { SkillsInput } from "../common/SkillsInput"
import { SalaryRangeInput } from "../common/SalaryRangeInput"

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: (job: Omit<Job, "company" | "matchScore">) => void;
  initialData?: Job | null;
  onJobUpdated?: (job: Job) => void;
}

export function CreateJobModal({
  isOpen,
  onClose,
  onJobCreated,
  initialData,
  onJobUpdated,
}: CreateJobModalProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    department: initialData?.department || DEPARTMENTS[0],
    jobType: initialData?.jobType || JOB_TYPES[0],
    location: initialData?.location || "Bengaluru, India",
    workMode: initialData?.workMode || WORK_MODES[0],
    description: initialData?.description || "",
    skills: initialData?.skills || ["React", "Node.js", "TypeScript"],
    experienceLevel: initialData?.experienceLevel || EXPERIENCE_LEVELS[1],
    education: initialData?.education || EDUCATION_LEVELS[0],
    salaryMin: initialData?.salaryMin || "",
    salaryMax: initialData?.salaryMax || "",
    deadline: initialData?.deadline || getTomorrowISODate(),
    requireAssessment: initialData?.requireAssessment || false,
    status: (initialData?.status as "Active" | "Draft") || "Active",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: initialData?.title || "",
        department: initialData?.department || DEPARTMENTS[0],
        jobType: initialData?.jobType || JOB_TYPES[0],
        location: initialData?.location || "Bengaluru, India",
        workMode: initialData?.workMode || WORK_MODES[0],
        description: initialData?.description || "",
        skills: initialData?.skills || ["React", "Node.js", "TypeScript"],
        experienceLevel: initialData?.experienceLevel || EXPERIENCE_LEVELS[1],
        education: initialData?.education || EDUCATION_LEVELS[0],
        salaryMin: initialData?.salaryMin || "",
        salaryMax: initialData?.salaryMax || "",
        deadline: initialData?.deadline || getTomorrowISODate(),
        requireAssessment: initialData?.requireAssessment || false,
        status: (initialData?.status as "Active" | "Draft") || "Active",
      });
      setError("");
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const update = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (error && (key === "title" || key === "description")) {
      setError("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError("Job Title is required");
      return;
    }
    if (!formData.description.trim()) {
      setError("Job Description is required");
      return;
    }

    if (initialData && onJobUpdated) {
      onJobUpdated({
        ...initialData,
        title: formData.title.trim(),
        department: formData.department,
        jobType: formData.jobType,
        employmentType: formData.jobType,
        location: formData.location.trim() || "Remote",
        workMode: formData.workMode,
        experience: formData.experienceLevel,
        experienceLevel: formData.experienceLevel,
        education: formData.education,
        salaryMin: formData.salaryMin.trim(),
        salaryMax: formData.salaryMax.trim(),
        deadline: formData.deadline.trim() || getTomorrowISODate(),
        requireAssessment: formData.requireAssessment,
        status: formData.status,
        description: formData.description.trim(),
        skills: formData.skills,
        requiredSkills: formData.skills,
      });
      onClose();
      return;
    }

    if (onJobCreated) {
      onJobCreated({
        id: `job-${Date.now()}`,
        title: formData.title.trim(),
        department: formData.department,
        jobType: formData.jobType,
        employmentType: formData.jobType,
        location: formData.location.trim() || "Remote",
        workMode: formData.workMode,
        experience: formData.experienceLevel,
        experienceLevel: formData.experienceLevel,
        education: formData.education,
        salaryMin: formData.salaryMin.trim(),
        salaryMax: formData.salaryMax.trim(),
        postedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        postedRelative: "Just now",
        deadline: formData.deadline.trim() || getTomorrowISODate(),
        requireAssessment: formData.requireAssessment,
        status: formData.status,
        createdAt: new Date().toISOString(),
        applicantCount: 0,
        applicants: 0,
        shortlisted: 0,
        screening: 0,
        rejected: 0,
        description: formData.description.trim(),
        responsibilities: [],
        requiredSkills: formData.skills,
        preferredSkills: [],
        qualifications: [],
        skills: formData.skills,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-[#E6E0D6] rounded-2xl shadow-xl flex flex-col my-auto max-h-[92vh] overflow-hidden">
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-[#E6E0D6] flex items-center justify-between bg-[#FAF8F5]/60">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal tracking-tight">
              {initialData ? "Edit Job" : "Create a new job"}
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              {initialData
                ? "Update job details and requirements."
                : "Add an opportunity to your company's job listings."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#78716C] hover:text-charcoal hover:bg-[#EAE5DF] transition-colors cursor-pointer"
          >
            <X className="size-4 sm:size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4 sm:space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              Job Title <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Full Stack Developer"
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E6E0D6] rounded-lg text-xs sm:text-sm text-charcoal placeholder-[#A8A199] outline-none focus:bg-white focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all shadow-3xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <SelectField
              label="Department"
              value={formData.department}
              options={DEPARTMENTS}
              onChange={(v) => update("department", v)}
            />
            <SelectField
              label="Job Type"
              value={formData.jobType}
              options={JOB_TYPES}
              onChange={(v) => update("jobType", v)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="e.g. Bengaluru, India"
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E6E0D6] rounded-lg text-xs sm:text-sm text-charcoal placeholder-[#A8A199] outline-none focus:bg-white focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all shadow-3xs"
              />
            </div>
            <SelectField
              label="Work Mode"
              value={formData.workMode}
              options={WORK_MODES}
              onChange={(v) => update("workMode", v)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              Job Description <span className="text-terracotta">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={formData.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe the role, key responsibilities, and required qualifications..."
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E6E0D6] rounded-lg text-xs sm:text-sm text-charcoal placeholder-[#A8A199] outline-none focus:bg-white focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all resize-none shadow-3xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              Required Skills
            </label>
            <SkillsInput
              skills={formData.skills}
              onChange={(newSkills) => update("skills", newSkills)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <SelectField
              label="Experience Level"
              value={formData.experienceLevel}
              options={EXPERIENCE_LEVELS}
              onChange={(v) => update("experienceLevel", v)}
            />
            <SelectField
              label="Education"
              value={formData.education}
              options={EDUCATION_LEVELS}
              onChange={(v) => update("education", v)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <SalaryRangeInput
              salaryMin={formData.salaryMin}
              salaryMax={formData.salaryMax}
              onMinChange={(v) => update("salaryMin", v)}
              onMaxChange={(v) => update("salaryMax", v)}
            />

            <div>
              <label htmlFor="deadline" className="block text-xs font-semibold text-charcoal mb-1.5">
                Application Deadline
              </label>
              <DatePicker
                id="deadline"
                block
                oneTap
                ranges={[]}
                placement="topEnd"
                preventOverflow={true}
                limitEndYear={10}
                limitStartYear={0}
                format="dd/MM/yyyy"
                placeholder="DD/MM/YYYY"
                container={() => document.body}
                calendarDefaultDate={formData.deadline ? new Date(formData.deadline) : new Date(Date.now() + 86400000)}
                value={formData.deadline ? new Date(formData.deadline) : null}
                cleanable={false}
                editable={true}
                onChange={(date: Date | null) => {
                  if (date) {
                    const today = new Date();
                    today.setHours(23, 59, 59, 999);
                    if (date.getTime() <= today.getTime()) {
                      return;
                    }
                    const yyyy = date.getFullYear();
                    const mm = String(date.getMonth() + 1).padStart(2, "0");
                    const dd = String(date.getDate()).padStart(2, "0");
                    update("deadline", `${yyyy}-${mm}-${dd}`);
                  } else {
                    update("deadline", "");
                  }
                }}
                shouldDisableDate={(date) => {
                  const today = new Date();
                  today.setHours(23, 59, 59, 999);
                  return date.getTime() <= today.getTime();
                }}
                className="custom-dob-picker"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#E6E0D6] space-y-3">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1.5">
                Assessment
              </label>
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-[#E6E0D6] bg-[#FAF8F5] cursor-pointer hover:border-terracotta/40 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.requireAssessment}
                  onChange={(e) => update("requireAssessment", e.target.checked)}
                  className="mt-0.5 size-4 rounded text-terracotta focus:ring-terracotta border-[#E6E0D6] accent-terracotta cursor-pointer"
                />
                <div className="flex-1 text-xs">
                  <span className="font-semibold text-charcoal flex items-center gap-1.5">
                    Require assessment for shortlisted candidates
                  </span>
                  <p className="text-[#78716C] mt-0.5 text-[11px]">
                    Applicants who match your criteria will be prompted to complete a standardized technical MCQ test.
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1.5">
                Job Status
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-medium text-charcoal cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="Active"
                    checked={formData.status === "Active"}
                    onChange={() => update("status", "Active")}
                    className="accent-terracotta"
                  />
                  <span>Publish immediately (Active)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-[#78716C] cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="Draft"
                    checked={formData.status === "Draft"}
                    onChange={() => update("status", "Draft")}
                    className="accent-terracotta"
                  />
                  <span>Save as Draft</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E6E0D6] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#E6E0D6] text-xs font-semibold text-charcoal hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-terracotta text-xs font-semibold text-white hover:bg-terracotta-dark shadow-2xs transition-colors cursor-pointer"
            >
              {initialData ? "Save Changes" : formData.status === "Active" ? "Publish Job" : "Save Draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
