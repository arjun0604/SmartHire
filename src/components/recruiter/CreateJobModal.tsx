import { useState, useEffect, useRef } from "react"
import { X, Sliders, CheckCircle2, AlertCircle } from "lucide-react"
import { DatePicker } from "rsuite"
import "rsuite/DatePicker/styles/index.css"
import type { Job, MatchingWeights } from "../../data/jobs"
import {
  DEPARTMENTS,
  JOB_TYPES,
  WORK_MODES,
  EXPERIENCE_LEVELS,
  EDUCATION_LEVELS,
  getDefaultDeadlineISODate,
} from "../../constants/jobOptions"
import { SelectField } from "../common/SelectField"
import { SkillsInput } from "../common/SkillsInput"
import { SalaryRangeInput } from "../common/SalaryRangeInput"
import { BulletListInput } from "../common/BulletListInput"
import {
  validateJobTitle,
  validateLocation,
  validateSalaryRange,
  validateDeadline,
  validateMeaningfulText,
} from "../../utils/validation"

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: (job: Omit<Job, "company" | "matchScore">) => void;
  initialData?: Job | null;
  onJobUpdated?: (job: Job) => void;
}

const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  required_skills: 40,
  preferred_skills: 15,
  experience: 20,
  education: 10,
  location_work_mode: 10,
  employment_status: 5,
};

function getCleanNumeric(val?: string | number | null): string {
  if (val === undefined || val === null) return "";
  const s = String(val).trim();
  return s.replace(/[^0-9]/g, "");
}

function createFormData(initialData?: Job | null) {
  const defaultSkills = initialData?.requiredSkills?.length
    ? initialData.requiredSkills
    : initialData?.skills || [];

  return {
    title: initialData?.title || "",
    department: initialData?.department || DEPARTMENTS[0],
    jobType: initialData?.jobType || initialData?.employmentType || JOB_TYPES[0],
    location: initialData?.location || "Bengaluru, India",
    workMode: initialData?.workMode || WORK_MODES[0],
    description: initialData?.description || "",
    responsibilities: initialData?.responsibilities || [],
    requiredSkills: defaultSkills,
    preferredSkills: initialData?.preferredSkills || [],
    qualifications: initialData?.qualifications || [],
    preferredQualifications: initialData?.preferredQualifications || [],
    experienceLevel: initialData?.experienceLevel || initialData?.experience || EXPERIENCE_LEVELS[1],
    education: initialData?.education || EDUCATION_LEVELS[0],
    salaryMin: getCleanNumeric(initialData?.salaryMin ?? (initialData as Record<string, unknown> | undefined)?.salary_min as string),
    salaryMax: getCleanNumeric(initialData?.salaryMax ?? (initialData as Record<string, unknown> | undefined)?.salary_max as string),
    deadline: initialData?.deadline || getDefaultDeadlineISODate(5),
    requireAssessment: Boolean(initialData?.requireAssessment),
    status: (initialData?.status as "Active" | "Draft") || "Active",
    matchingWeights: initialData?.matchingWeights || initialData?.matching_weights || { ...DEFAULT_MATCHING_WEIGHTS },
    additionalRequirements: initialData?.additionalRequirements || initialData?.additional_requirements || "",
  };
}

export function CreateJobModal({
  isOpen,
  onClose,
  onJobCreated,
  initialData,
  onJobUpdated,
}: CreateJobModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState(() => createFormData(initialData));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormData(createFormData(initialData));
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const update = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "workMode") {
        if (value === "Remote" && (!prev.location || prev.location === "Bengaluru, India")) {
          next.location = "Remote";
        } else if (value !== "Remote" && prev.location.trim().toLowerCase() === "remote") {
          next.location = "";
        }
      }
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      if (key === "salaryMin" || key === "salaryMax") {
        delete next.salary;
      }
      if (key === "requiredSkills" || key === "preferredSkills") {
        delete next.requiredSkills;
        delete next.preferredSkills;
      }
      if (key === "qualifications" || key === "preferredQualifications") {
        delete next.qualifications;
        delete next.preferredQualifications;
      }
      return next;
    });
  };

  const updateWeight = (key: keyof MatchingWeights, val: number) => {
    setFormData((prev) => ({
      ...prev,
      matchingWeights: {
        ...prev.matchingWeights,
        [key]: val,
      },
    }));
  };

  const totalWeight = Object.values(formData.matchingWeights).reduce((a, b) => a + b, 0);

  const FIELD_ORDER = [
    "title",
    "department",
    "jobType",
    "location",
    "workMode",
    "experienceLevel",
    "education",
    "salary",
    "deadline",
    "description",
    "responsibilities",
    "requiredSkills",
    "preferredSkills",
    "qualifications",
    "preferredQualifications",
  ];

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    const titleVal = validateJobTitle(formData.title);
    if (!titleVal.isValid) {
      newErrors.title = titleVal.error || "Job Title is invalid";
    }

    if (!formData.department || !DEPARTMENTS.includes(formData.department)) {
      newErrors.department = "Please select a valid department";
    }

    if (!formData.jobType || !JOB_TYPES.includes(formData.jobType)) {
      newErrors.jobType = "Please select a valid job type";
    }

    if (!formData.workMode || !WORK_MODES.includes(formData.workMode)) {
      newErrors.workMode = "Please select a valid work mode";
    }

    const trimmedLocation = formData.location.trim();
    if (formData.workMode !== "Remote") {
      if (!trimmedLocation || trimmedLocation.toLowerCase() === "remote") {
        newErrors.location = "Please enter a specific city/office location for On-site or Hybrid jobs";
      } else {
        const locVal = validateLocation(formData.location);
        if (!locVal.isValid) {
          newErrors.location = locVal.error || "Please enter a valid location";
        }
      }
    }

    if (!formData.experienceLevel || !EXPERIENCE_LEVELS.includes(formData.experienceLevel)) {
      newErrors.experienceLevel = "Please select an experience level";
    }

    if (!formData.education || !EDUCATION_LEVELS.includes(formData.education)) {
      newErrors.education = "Please select an education level";
    }

    const salaryVal = validateSalaryRange(formData.salaryMin, formData.salaryMax);
    if (!salaryVal.isValid) {
      newErrors.salary = salaryVal.error || "Please provide a valid salary range";
    }

    const deadlineVal = validateDeadline(formData.deadline, initialData?.deadline);
    if (!deadlineVal.isValid) {
      newErrors.deadline = deadlineVal.error || "Please select a valid deadline";
    }

    const descVal = validateMeaningfulText(formData.description, 30, 10000);
    if (!descVal.isValid) {
      newErrors.description = descVal.error || "Job Description must contain meaningful content";
    }

    if (!formData.responsibilities || formData.responsibilities.length === 0) {
      newErrors.responsibilities = "Please add at least one job responsibility";
    }

    if (!formData.requiredSkills || formData.requiredSkills.length === 0) {
      newErrors.requiredSkills = "At least one required skill must be added";
    }

    if (formData.requiredSkills && formData.preferredSkills && formData.preferredSkills.length > 0) {
      const reqLower = new Set(formData.requiredSkills.map((s) => s.trim().toLowerCase()));
      const duplicateSkill = formData.preferredSkills.find((s) => reqLower.has(s.trim().toLowerCase()));
      if (duplicateSkill) {
        newErrors.preferredSkills = `"${duplicateSkill}" is already listed in required skills`;
      }
    }

    if (!formData.qualifications || formData.qualifications.length === 0) {
      newErrors.qualifications = "Please add at least one required qualification";
    }

    if (formData.qualifications && formData.preferredQualifications && formData.preferredQualifications.length > 0) {
      const qualLower = new Set(formData.qualifications.map((q) => q.trim().toLowerCase()));
      const duplicateQual = formData.preferredQualifications.find((q) => qualLower.has(q.trim().toLowerCase()));
      if (duplicateQual) {
        newErrors.preferredQualifications = `"${duplicateQual}" is already listed in required qualifications`;
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = FIELD_ORDER.find((key) => newErrors[key]);
      if (firstErrorField) {
        setTimeout(() => {
          const targetEl = fieldRefs.current[firstErrorField];
          if (targetEl && formRef.current) {
            const container = formRef.current;
            const containerRect = container.getBoundingClientRect();
            const elRect = targetEl.getBoundingClientRect();
            const scrollOffset = elRect.top - containerRect.top + container.scrollTop - 24;
            container.scrollTo({ top: Math.max(0, scrollOffset), behavior: "smooth" });

            const focusable = targetEl.querySelector<HTMLElement>("input, select, textarea, button") || (targetEl instanceof HTMLElement ? targetEl : null);
            if (focusable && typeof focusable.focus === "function") {
              focusable.focus({ preventScroll: true });
            }
          }
        }, 50);
      }
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep1()) {
      setStep(1);
      return;
    }

    if (totalWeight !== 100) {
      setStep(2);
      return;
    }

    const trimmedTitle = formData.title.trim();
    const trimmedLocation = formData.location.trim();
    const resolvedLocation = formData.workMode === "Remote" ? (trimmedLocation || "Remote") : trimmedLocation;
    const trimmedDeadline = formData.deadline.trim();
    const trimmedDescription = formData.description.trim();
    const minSalaryStr = formData.salaryMin ? formData.salaryMin : "";
    const maxSalaryStr = formData.salaryMax ? formData.salaryMax : "";

    if (initialData && onJobUpdated) {
      onJobUpdated({
        ...initialData,
        title: trimmedTitle,
        department: formData.department,
        jobType: formData.jobType,
        employmentType: formData.jobType,
        location: resolvedLocation,
        workMode: formData.workMode,
        experience: formData.experienceLevel,
        experienceLevel: formData.experienceLevel,
        education: formData.education,
        salaryMin: minSalaryStr,
        salaryMax: maxSalaryStr,
        deadline: trimmedDeadline,
        requireAssessment: formData.requireAssessment,
        status: formData.status,
        description: trimmedDescription,
        responsibilities: formData.responsibilities,
        qualifications: formData.qualifications,
        preferredQualifications: formData.preferredQualifications,
        requiredSkills: formData.requiredSkills,
        preferredSkills: formData.preferredSkills,
        skills: formData.requiredSkills,
        matching_weights: formData.matchingWeights,
        matchingWeights: formData.matchingWeights,
        additional_requirements: formData.additionalRequirements,
        additionalRequirements: formData.additionalRequirements,
      });
      onClose();
      return;
    }

    if (onJobCreated) {
      onJobCreated({
        id: `job-${Date.now()}`,
        title: trimmedTitle,
        department: formData.department,
        jobType: formData.jobType,
        employmentType: formData.jobType,
        location: resolvedLocation,
        workMode: formData.workMode,
        experience: formData.experienceLevel,
        experienceLevel: formData.experienceLevel,
        education: formData.education,
        salaryMin: minSalaryStr,
        salaryMax: maxSalaryStr,
        postedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        postedRelative: "Just now",
        deadline: trimmedDeadline,
        requireAssessment: formData.requireAssessment,
        status: formData.status,
        createdAt: new Date().toISOString(),
        applicantCount: 0,
        applicants: 0,
        shortlisted: 0,
        screening: 0,
        rejected: 0,
        description: trimmedDescription,
        responsibilities: formData.responsibilities,
        qualifications: formData.qualifications,
        preferredQualifications: formData.preferredQualifications,
        requiredSkills: formData.requiredSkills,
        preferredSkills: formData.preferredSkills,
        skills: formData.requiredSkills,
        matching_weights: formData.matchingWeights,
        matchingWeights: formData.matchingWeights,
        additional_requirements: formData.additionalRequirements,
        additionalRequirements: formData.additionalRequirements,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white border border-[#E6E0D6] rounded-2xl shadow-xl flex flex-col my-auto max-h-[92vh] overflow-hidden">
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-[#E6E0D6] flex items-center justify-between bg-cream/60">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal tracking-tight">
                {initialData ? "Edit Job" : "Create a new job"}
              </h2>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`px-2.5 py-0.5 rounded-full transition-colors ${
                    step === 1
                      ? "bg-terracotta text-white"
                      : "bg-[#EAE5DF] text-charcoal hover:bg-[#DDD7CF]"
                  }`}
                >
                  1. Details
                </button>
                <span className="text-[#A8A199]">•</span>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setStep(2);
                  }}
                  className={`px-2.5 py-0.5 rounded-full transition-colors ${
                    step === 2
                      ? "bg-terracotta text-white"
                      : "bg-[#EAE5DF] text-charcoal hover:bg-[#DDD7CF]"
                  }`}
                >
                  2. Matching Rules
                </button>
              </div>
            </div>
            <p className="text-xs text-[#78716C] mt-1">
              {step === 1
                ? "Specify job details, requirements, qualifications, and role information."
                : "Configure deterministic ATS scoring weights and additional criteria."}
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

        <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {step === 1 ? (
            <>
              <div className="space-y-4">
                <div ref={(el) => { fieldRefs.current.title = el; }}>
                  <label className="block text-xs font-semibold text-charcoal mb-1.5">
                    Job Title <span className="text-terracotta">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="e.g. Full Stack Developer"
                    className={`w-full px-3.5 py-2.5 bg-cream border ${errors.title ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} rounded-lg text-xs sm:text-sm text-charcoal placeholder-[#A8A199] outline-none focus:bg-white focus:ring-1 transition-all shadow-3xs`}
                  />
                  {errors.title && (
                    <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.title}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div ref={(el) => { fieldRefs.current.department = el; }}>
                    <SelectField
                      label="Department"
                      value={formData.department}
                      options={DEPARTMENTS}
                      onChange={(v) => update("department", v)}
                    />
                    {errors.department && (
                      <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.department}</p>
                    )}
                  </div>
                  <div ref={(el) => { fieldRefs.current.jobType = el; }}>
                    <SelectField
                      label="Job Type"
                      value={formData.jobType}
                      options={JOB_TYPES}
                      onChange={(v) => update("jobType", v)}
                    />
                    {errors.jobType && (
                      <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.jobType}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div ref={(el) => { fieldRefs.current.location = el; }}>
                    <label className="block text-xs font-semibold text-charcoal mb-1.5">
                      Location {formData.workMode !== "Remote" && <span className="text-terracotta">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => update("location", e.target.value)}
                      placeholder={formData.workMode === "Remote" ? "Remote (or specific country/region)" : "e.g. Bengaluru, India"}
                      className={`w-full px-3.5 py-2.5 bg-cream border ${errors.location ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} rounded-lg text-xs sm:text-sm text-charcoal placeholder-[#A8A199] outline-none focus:bg-white focus:ring-1 transition-all shadow-3xs`}
                    />
                    {errors.location && (
                      <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.location}</p>
                    )}
                  </div>
                  <div ref={(el) => { fieldRefs.current.workMode = el; }}>
                    <SelectField
                      label="Work Mode"
                      value={formData.workMode}
                      options={WORK_MODES}
                      onChange={(v) => update("workMode", v)}
                    />
                    {errors.workMode && (
                      <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.workMode}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E6E0D6]/80 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div ref={(el) => { fieldRefs.current.experienceLevel = el; }}>
                    <SelectField
                      label="Experience Level"
                      value={formData.experienceLevel}
                      options={EXPERIENCE_LEVELS}
                      onChange={(v) => update("experienceLevel", v)}
                    />
                    {errors.experienceLevel && (
                      <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.experienceLevel}</p>
                    )}
                  </div>
                  <div ref={(el) => { fieldRefs.current.education = el; }}>
                    <SelectField
                      label="Education"
                      value={formData.education}
                      options={EDUCATION_LEVELS}
                      onChange={(v) => update("education", v)}
                    />
                    {errors.education && (
                      <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.education}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div ref={(el) => { fieldRefs.current.salary = el; }}>
                    <SalaryRangeInput
                      salaryMin={formData.salaryMin}
                      salaryMax={formData.salaryMax}
                      onMinChange={(v) => update("salaryMin", v)}
                      onMaxChange={(v) => update("salaryMax", v)}
                    />
                    {errors.salary && (
                      <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.salary}</p>
                    )}
                  </div>

                  <div ref={(el) => { fieldRefs.current.deadline = el; }}>
                    <label htmlFor="deadline" className="block text-xs font-semibold text-charcoal mb-1.5">
                      Application Deadline <span className="text-terracotta">*</span>
                    </label>
                    <DatePicker
                      oneTap
                      cleanable={false}
                      value={formData.deadline ? new Date(`${formData.deadline}T00:00:00`) : null}
                      onChange={(date) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, "0");
                          const d = String(date.getDate()).padStart(2, "0");
                          update("deadline", `${y}-${m}-${d}`);
                        } else {
                          update("deadline", "");
                        }
                      }}
                      shouldDisableDate={(date) => {
                        if (!date) return false;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const checkDate = new Date(date);
                        checkDate.setHours(0, 0, 0, 0);
                        return checkDate < today;
                      }}
                      format="MMM dd, yyyy"
                      placeholder="Select deadline"
                      block
                      className="custom-rsuite-datepicker"
                    />
                    {errors.deadline && (
                      <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.deadline}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E6E0D6]/80 space-y-4">
                <div ref={(el) => { fieldRefs.current.description = el; }}>
                  <label className="block text-xs font-semibold text-charcoal mb-1.5">
                    Job Description <span className="text-terracotta">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Provide a compelling overview of the role, team, and company mission..."
                    className={`w-full px-3.5 py-2.5 bg-cream border ${errors.description ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} rounded-lg text-xs sm:text-sm text-charcoal placeholder-[#A8A199] outline-none focus:bg-white focus:ring-1 transition-all resize-none shadow-3xs`}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.description}</p>
                  )}
                </div>

                <div ref={(el) => { fieldRefs.current.responsibilities = el; }}>
                  <BulletListInput
                    label="Responsibilities"
                    items={formData.responsibilities}
                    onChange={(items) => update("responsibilities", items)}
                    placeholder="e.g. Architect and maintain high-performance backend microservices"
                    error={errors.responsibilities}
                  />
                </div>

                <div ref={(el) => { fieldRefs.current.qualifications = el; }}>
                  <BulletListInput
                    label="Basic / Required Qualifications"
                    items={formData.qualifications}
                    onChange={(items) => update("qualifications", items)}
                    placeholder="e.g. 3+ years of professional backend engineering experience"
                    error={errors.qualifications}
                  />
                </div>

                <div ref={(el) => { fieldRefs.current.preferredQualifications = el; }}>
                  <BulletListInput
                    label="Preferred Qualifications (Optional)"
                    items={formData.preferredQualifications}
                    onChange={(items) => update("preferredQualifications", items)}
                    placeholder="e.g. Experience contributing to open source projects"
                    error={errors.preferredQualifications}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div ref={(el) => { fieldRefs.current.requiredSkills = el; }}>
                    <div>
                      <label className="block text-xs font-semibold text-charcoal mb-1.5">
                        Required Skills
                      </label>
                      <SkillsInput
                        skills={formData.requiredSkills}
                        onChange={(skills) => update("requiredSkills", skills)}
                        error={errors.requiredSkills}
                      />
                    </div>
                  </div>

                  <div ref={(el) => { fieldRefs.current.preferredSkills = el; }}>
                    <div>
                      <label className="block text-xs font-semibold text-charcoal mb-1.5">
                        Preferred Skills (Optional)
                      </label>
                      <SkillsInput
                        skills={formData.preferredSkills}
                        onChange={(skills) => update("preferredSkills", skills)}
                        error={errors.preferredSkills}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E6E0D6]/80 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1.5">
                    Assessment
                  </label>
                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-[#E6E0D6] bg-cream cursor-pointer hover:border-terracotta/40 transition-colors">
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

              <div className="pt-4 border-t border-[#E6E0D6] flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-[#E6E0D6] text-xs font-semibold text-charcoal hover:bg-cream transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) {
                      setStep(2);
                    }
                  }}
                  className="px-5 py-2 rounded-lg bg-terracotta text-xs font-semibold text-white hover:bg-terracotta-dark shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  Next: Matching Preferences →
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-3">
                <Sliders className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-blue-900">
                    Configure ATS Matching Weights
                  </h4>
                  <p className="text-blue-800/80 mt-0.5 leading-relaxed">
                    Set the deterministic importance of each evaluation category for this role.
                    All category weights must sum to exactly 100%. If any criterion is unavailable for a candidate (e.g. location unprovided), remaining active weights automatically re-normalize to 100%.
                  </p>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
                  totalWeight === 100
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  {totalWeight === 100 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  )}
                  <div>
                    <div className="text-xs font-bold">
                      Total Weight: {totalWeight}%
                    </div>
                    <div className="text-[11px]">
                      {totalWeight === 100
                        ? "Weights are perfectly balanced at 100%."
                        : totalWeight > 100
                        ? `Weights exceed 100% by ${totalWeight - 100}%. Please adjust.`
                        : `Weights are under 100% by ${100 - totalWeight}%. Please adjust.`}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      matchingWeights: { ...DEFAULT_MATCHING_WEIGHTS },
                    }))
                  }
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#E6E0D6] text-charcoal hover:bg-cream transition-colors cursor-pointer"
                >
                  Reset to Defaults
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-[#E6E0D6] bg-cream/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-charcoal">Required Skills</span>
                      <p className="text-[11px] text-[#78716C]">Must-have technical competencies</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.matchingWeights.required_skills}
                        onChange={(e) =>
                          updateWeight(
                            "required_skills",
                            Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                          )
                        }
                        className="w-14 px-2 py-1 text-center font-bold text-xs rounded border border-[#E6E0D6] bg-white focus:outline-none focus:ring-1 focus:ring-terracotta"
                      />
                      <span className="text-xs font-bold text-[#78716C]">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={formData.matchingWeights.required_skills}
                    onChange={(e) => updateWeight("required_skills", parseInt(e.target.value) || 0)}
                    className="w-full accent-terracotta cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-[#E6E0D6] bg-cream/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-charcoal">Preferred Skills</span>
                      <p className="text-[11px] text-[#78716C]">Bonus or nice-to-have skills</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.matchingWeights.preferred_skills}
                        onChange={(e) =>
                          updateWeight(
                            "preferred_skills",
                            Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                          )
                        }
                        className="w-14 px-2 py-1 text-center font-bold text-xs rounded border border-[#E6E0D6] bg-white focus:outline-none focus:ring-1 focus:ring-terracotta"
                      />
                      <span className="text-xs font-bold text-[#78716C]">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={formData.matchingWeights.preferred_skills}
                    onChange={(e) => updateWeight("preferred_skills", parseInt(e.target.value) || 0)}
                    className="w-full accent-terracotta cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-[#E6E0D6] bg-cream/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-charcoal">Work Experience</span>
                      <p className="text-[11px] text-[#78716C]">Years of relevant professional experience</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.matchingWeights.experience}
                        onChange={(e) =>
                          updateWeight(
                            "experience",
                            Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                          )
                        }
                        className="w-14 px-2 py-1 text-center font-bold text-xs rounded border border-[#E6E0D6] bg-white focus:outline-none focus:ring-1 focus:ring-terracotta"
                      />
                      <span className="text-xs font-bold text-[#78716C]">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={formData.matchingWeights.experience}
                    onChange={(e) => updateWeight("experience", parseInt(e.target.value) || 0)}
                    className="w-full accent-terracotta cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-[#E6E0D6] bg-cream/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-charcoal">Education</span>
                      <p className="text-[11px] text-[#78716C]">Degree requirement or equivalent</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.matchingWeights.education}
                        onChange={(e) =>
                          updateWeight(
                            "education",
                            Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                          )
                        }
                        className="w-14 px-2 py-1 text-center font-bold text-xs rounded border border-[#E6E0D6] bg-white focus:outline-none focus:ring-1 focus:ring-terracotta"
                      />
                      <span className="text-xs font-bold text-[#78716C]">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={formData.matchingWeights.education}
                    onChange={(e) => updateWeight("education", parseInt(e.target.value) || 0)}
                    className="w-full accent-terracotta cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-[#E6E0D6] bg-cream/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-charcoal">Location &amp; Work Mode</span>
                      <p className="text-[11px] text-[#78716C]">Proximity, relocation, or remote fit</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.matchingWeights.location_work_mode}
                        onChange={(e) =>
                          updateWeight(
                            "location_work_mode",
                            Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                          )
                        }
                        className="w-14 px-2 py-1 text-center font-bold text-xs rounded border border-[#E6E0D6] bg-white focus:outline-none focus:ring-1 focus:ring-terracotta"
                      />
                      <span className="text-xs font-bold text-[#78716C]">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={formData.matchingWeights.location_work_mode}
                    onChange={(e) =>
                      updateWeight("location_work_mode", parseInt(e.target.value) || 0)
                    }
                    className="w-full accent-terracotta cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-[#E6E0D6] bg-cream/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-charcoal">Employment Status</span>
                      <p className="text-[11px] text-[#78716C]">Current employment or immediate joining</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.matchingWeights.employment_status}
                        onChange={(e) =>
                          updateWeight(
                            "employment_status",
                            Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                          )
                        }
                        className="w-14 px-2 py-1 text-center font-bold text-xs rounded border border-[#E6E0D6] bg-white focus:outline-none focus:ring-1 focus:ring-terracotta"
                      />
                      <span className="text-xs font-bold text-[#78716C]">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={formData.matchingWeights.employment_status}
                    onChange={(e) => updateWeight("employment_status", parseInt(e.target.value) || 0)}
                    className="w-full accent-terracotta cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold text-charcoal">
                  Additional Requirements / Candidate Conditions (Optional)
                </label>
                <textarea
                  rows={3}
                  value={formData.additionalRequirements}
                  onChange={(e) => update("additionalRequirements", e.target.value)}
                  placeholder="e.g. Candidates with distributed systems background or open-source contributions preferred."
                  className="w-full px-3.5 py-2.5 bg-cream border border-[#E6E0D6] rounded-lg text-xs sm:text-sm text-charcoal placeholder-[#A8A199] outline-none focus:bg-white focus:ring-1 focus:ring-terracotta focus:border-terracotta transition-all resize-none shadow-3xs"
                />
                <p className="text-[11px] text-[#78716C]">
                  Saved with this job profile for future criteria and recruiter reference.
                </p>
              </div>

              <div className="pt-4 border-t border-[#E6E0D6] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg border border-[#E6E0D6] text-xs font-semibold text-charcoal hover:bg-cream transition-colors cursor-pointer"
                >
                  ← Back to Details
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-[#E6E0D6] text-xs font-semibold text-charcoal hover:bg-cream transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={totalWeight !== 100}
                    className={`px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer ${
                      totalWeight === 100
                        ? "bg-terracotta hover:bg-terracotta-dark"
                        : "bg-terracotta/40 cursor-not-allowed"
                    }`}
                  >
                    {initialData ? "Save Changes" : formData.status === "Active" ? "Publish Job" : "Save Draft"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
