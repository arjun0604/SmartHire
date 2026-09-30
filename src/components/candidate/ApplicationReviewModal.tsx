import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2, FileText, Send, X, Upload, AlertCircle, ChevronDown, Check, Loader2, XCircle, RotateCcw, HelpCircle, ArrowUpRight } from "lucide-react"
import { useAppDispatch } from "../../store"
import type { Job } from "../../store/slices/jobsSlice"
import { createApplicationThunk } from "../../store/slices/applicationsSlice"
import { useUser } from "../../context/UserContext"
import {
  validateName,
  validateEmail,
  validateIndianPhone,
  validateLocation,
  validateMeaningfulText,
} from "../../utils/validation"

interface ApplicationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onSubmitted?: (jobId: string) => void;
}

function createApplicationId(jobId: string) {
  return `APP-${jobId.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function ApplicationReviewModal({
  isOpen,
  onClose,
  job,
  onSubmitted,
}: ApplicationReviewModalProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { profile, uploadResume, updateCandidate } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState<"review" | "submitted" | "error">("review");
  const [applicationId] = useState(() => job ? createApplicationId(job.id) : "");
  const [createdAppId, setCreatedAppId] = useState<string | null>(null);
  const [submissionErrorMessage, setSubmissionErrorMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState(profile?.name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [location, setLocation] = useState(profile?.location || "");

  const [currentJobTitle, setCurrentJobTitle] = useState("");
  const [experienceYears, setExperienceYears] = useState("3–5 years");
  const [education, setEducation] = useState("Bachelor's Degree");

  const [resumeName, setResumeName] = useState(profile?.resumeName || "");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [whyInterested, setWhyInterested] = useState("");
  const [relevantExperience, setRelevantExperience] = useState("");
  const [isCurrentlyEmployed, setIsCurrentlyEmployed] = useState<"yes" | "no">("yes");

  const [additionalNotes, setAdditionalNotes] = useState("");

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const clearFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  useEffect(() => {
    if (profile) {
      if (profile.name) setFullName(profile.name);
      if (profile.email) setEmail(profile.email);
      if (profile.phone) setPhone(profile.phone);
      if (profile.location) setLocation(profile.location);
      if (profile.resumeName) setResumeName(profile.resumeName);
    }
  }, [profile]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !job) return null;

  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx", "doc"].includes(ext)) {
      setFieldErrors((prev) => ({ ...prev, resume: "Please upload a PDF or DOC/DOCX file." }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size === 0) {
      setFieldErrors((prev) => ({ ...prev, resume: "The selected file is empty." }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors((prev) => ({ ...prev, resume: "Resume file size must be less than 10MB." }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setResumeName(file.name);
    setResumeFile(file);
    clearFieldError("resume");
  };

  const FIELD_ORDER = [
    "fullName",
    "email",
    "phone",
    "location",
    "currentJobTitle",
    "resume",
    "whyInterested",
    "relevantExperience",
    "confirmation",
  ];

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const nameVal = validateName(fullName, "Full Name");
    if (!nameVal.isValid) {
      errors.fullName = nameVal.error || "Please enter a valid full name";
    }

    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      errors.email = emailVal.error || "Please enter a valid email address";
    }

    const phoneVal = validateIndianPhone(phone);
    if (!phoneVal.isValid) {
      errors.phone = phoneVal.error || "Please enter a valid Indian mobile number";
    }

    const locVal = validateLocation(location);
    if (!locVal.isValid) {
      errors.location = locVal.error || "Please enter a valid location";
    }

    if (!resumeName) {
      errors.resume = "Resume document is required.";
    }

    if (isCurrentlyEmployed === "yes") {
      if (!currentJobTitle || !currentJobTitle.trim()) {
        errors.currentJobTitle = "Please enter your current job title.";
      }
    }

    const whyVal = validateMeaningfulText(whyInterested, 20, 2000, "Reason for interest");
    if (!whyVal.isValid) {
      errors.whyInterested = whyVal.error || "Please explain why you are interested in this position (at least 20 characters).";
    }

    const expVal = validateMeaningfulText(relevantExperience, 20, 2000, "Relevant experience");
    if (!expVal.isValid) {
      errors.relevantExperience = expVal.error || "Please highlight your relevant experience (at least 20 characters).";
    }

    if (!isConfirmed) {
      errors.confirmation = "You must confirm that the provided information is accurate and complete.";
    }

    setFieldErrors(errors);

    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const firstErrorField = FIELD_ORDER.find((key) => errors[key]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (profile && (phone !== profile.phone || location !== profile.location)) {
        await updateCandidate({
          name: fullName || profile.name,
          phone: phone,
          location: location,
        });
      }
      let currentResumeId = profile?.resumeId;
      if (resumeFile && profile?.candidateId) {
        const uploaded = await uploadResume(resumeFile);
        if (uploaded?.id) {
          currentResumeId = uploaded.id;
        }
      }
      const createdApp = await dispatch(
        createApplicationThunk({
          job_id: job.id,
          candidate_id: profile?.candidateId || undefined,
          resume_id: currentResumeId || undefined,
          current_job_title: isCurrentlyEmployed === "yes" ? currentJobTitle.trim() : "",
          years_experience: experienceYears,
          highest_education: education,
          why_interested: whyInterested,
          relevant_experience: relevantExperience,
          is_currently_employed: isCurrentlyEmployed === "yes",
          additional_information: additionalNotes,
        })
      ).unwrap();
      if (createdApp?.id) {
        setCreatedAppId(createdApp.id);
      }
      if (onSubmitted) {
        onSubmitted(job.id);
      }
      setStep("submitted");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Failed to submit application. Please try again.";
      setSubmitError(msg);
      setSubmissionErrorMessage(msg);
      setStep("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setStep("review");
    setFieldErrors({});
    setSubmitError(null);
    setSubmissionErrorMessage(null);
    setIsSubmitting(false);
    setCurrentJobTitle("");
    setIsCurrentlyEmployed("yes");
    onClose();
  };

  const skillsList = job.requiredSkills && job.requiredSkills.length > 0
    ? job.requiredSkills
    : job.skills || ["React", "TypeScript", "Node.js", "System Design"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-charcoal/55 backdrop-blur-xs overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white border border-[#E6E0D6] rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden my-auto">
        {step === "review" ? (
          <div className="flex flex-col h-full max-h-[88vh]">
            <div className="px-6 py-4.5 sm:px-8 sm:py-5 border-b border-[#F0ECE4] flex items-start justify-between bg-white shrink-0">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
                  Review Your Application
                </h2>
                <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm text-[#78716C] mt-1">
                  <span>Applying for</span>
                  <span className="font-semibold text-charcoal">{job.title}</span>
                  <span>at</span>
                  <span className="font-semibold text-charcoal">{job.company}</span>
                  <span>&bull;</span>
                  <span className="font-medium text-charcoal">{job.location}</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cream border border-[#E6E0D6] text-charcoal">
                    {job.workMode}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-full p-2 text-[#8E877D] hover:text-charcoal hover:bg-cream transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Close review modal"
              >
                <X className="size-5" />
              </button>
            </div>

            <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleResumeFileChange}
                accept=".pdf,.doc,.docx"
                className="hidden"
              />

              {submitError && (
                <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-xs flex items-center justify-between gap-2 text-red-800 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="size-4 text-red-600 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmitError(null)}
                    className="text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}

              <section className="space-y-4">
                <div className="border-b border-[#F0ECE4] pb-2">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                    Applicant Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div ref={(el) => { fieldRefs.current.fullName = el; }} className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        clearFieldError("fullName");
                      }}
                      placeholder="e.g. Arjun Nair"
                      className={`w-full h-10 px-3.5 bg-white border ${fieldErrors.fullName ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} rounded-xl text-xs text-charcoal outline-none transition-colors shadow-3xs`}
                    />
                    {fieldErrors.fullName && (
                      <p className="text-xs text-red-600 font-medium">{fieldErrors.fullName}</p>
                    )}
                  </div>

                  <div ref={(el) => { fieldRefs.current.email = el; }} className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError("email");
                      }}
                      placeholder="name@domain.com"
                      className={`w-full h-10 px-3.5 bg-white border ${fieldErrors.email ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} rounded-xl text-xs text-charcoal outline-none transition-colors shadow-3xs`}
                    />
                    {fieldErrors.email && (
                      <p className="text-xs text-red-600 font-medium">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div ref={(el) => { fieldRefs.current.phone = el; }} className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        clearFieldError("phone");
                      }}
                      placeholder="+91 98765 43210"
                      className={`w-full h-10 px-3.5 bg-white border ${fieldErrors.phone ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} rounded-xl text-xs text-charcoal outline-none transition-colors shadow-3xs`}
                    />
                    {fieldErrors.phone && (
                      <p className="text-xs text-red-600 font-medium">{fieldErrors.phone}</p>
                    )}
                  </div>

                  <div ref={(el) => { fieldRefs.current.location = el; }} className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      Current Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        clearFieldError("location");
                      }}
                      placeholder="e.g. Bengaluru, India"
                      className={`w-full h-10 px-3.5 bg-white border ${fieldErrors.location ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} rounded-xl text-xs text-charcoal outline-none transition-colors shadow-3xs`}
                    />
                    {fieldErrors.location && (
                      <p className="text-xs text-red-600 font-medium">{fieldErrors.location}</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="border-b border-[#F0ECE4] pb-2">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                    Professional Information
                  </h3>
                </div>

                <div className="rounded-xl border border-[#E6E0D6] bg-cream/60 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-charcoal">
                      Are you currently employed? <span className="text-red-500">*</span>
                    </span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs text-charcoal cursor-pointer">
                        <input
                          type="radio"
                          name="employed"
                          checked={isCurrentlyEmployed === "yes"}
                          onChange={() => {
                            setIsCurrentlyEmployed("yes");
                          }}
                          className="accent-terracotta"
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-charcoal cursor-pointer">
                        <input
                          type="radio"
                          name="employed"
                          checked={isCurrentlyEmployed === "no"}
                          onChange={() => {
                            setIsCurrentlyEmployed("no");
                            setCurrentJobTitle("");
                            clearFieldError("currentJobTitle");
                          }}
                          className="accent-terracotta"
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {isCurrentlyEmployed === "yes" && (
                    <div
                      ref={(el) => { fieldRefs.current.currentJobTitle = el; }}
                      className="space-y-1.5 sm:col-span-2"
                    >
                      <label className="text-xs font-semibold text-charcoal block">
                        Current Job <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={currentJobTitle}
                        onChange={(e) => {
                          setCurrentJobTitle(e.target.value);
                          clearFieldError("currentJobTitle");
                        }}
                        placeholder="e.g. Senior Frontend Engineer"
                        className={`w-full h-10 px-3.5 bg-white border ${fieldErrors.currentJobTitle ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} rounded-xl text-xs text-charcoal outline-none transition-colors shadow-3xs`}
                      />
                      {fieldErrors.currentJobTitle && (
                        <p className="text-xs text-red-600 font-medium">{fieldErrors.currentJobTitle}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      Years of Professional Experience <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        className="w-full h-10 px-3.5 pr-9 bg-white border border-[#E6E0D6] rounded-xl text-xs text-charcoal outline-none focus:border-terracotta transition-colors appearance-none cursor-pointer shadow-3xs"
                      >
                        <option value="< 1 year">&lt; 1 year</option>
                        <option value="1–2 years">1–2 years</option>
                        <option value="3–5 years">3–5 years</option>
                        <option value="5–8 years">5–8 years</option>
                        <option value="8+ years">8+ years</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#8E877D] pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      Highest Education <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                        className="w-full h-10 px-3.5 pr-9 bg-white border border-[#E6E0D6] rounded-xl text-xs text-charcoal outline-none focus:border-terracotta transition-colors appearance-none cursor-pointer shadow-3xs"
                      >
                        <option value="Bachelor's Degree">Bachelor's Degree</option>
                        <option value="Master's Degree">Master's Degree</option>
                        <option value="Associate Degree">Associate Degree</option>
                        <option value="Doctorate / Ph.D.">Doctorate / Ph.D.</option>
                        <option value="High School Diploma">High School Diploma</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#8E877D] pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="text-xs font-semibold text-charcoal block mb-2">
                    Relevant Skills
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {skillsList.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-lg bg-cream border border-[#E6E0D6] text-xs font-medium text-charcoal"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              <section ref={(el) => { fieldRefs.current.resume = el; }} className="space-y-4">
                <div className="border-b border-[#F0ECE4] pb-2">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                    Resume Document
                  </h3>
                </div>

                {resumeName ? (
                  <div className={`rounded-xl border ${fieldErrors.resume ? "border-red-400 bg-red-50/20" : "border-[#E6E0D6] bg-white"} p-4 flex items-center justify-between gap-4 shadow-3xs hover:border-terracotta/40 transition-colors`}>
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="size-11 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-charcoal truncate font-mono">
                          {resumeName}
                        </p>
                        <p className="text-[11px] text-[#8E877D] mt-0.5">
                          Profile Resume Document &bull; PDF / DOCX
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Check className="size-3" />
                        <span>Uploaded</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-terracotta hover:underline px-2 py-1 cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-xl border ${fieldErrors.resume ? "border-red-400 bg-red-50/40" : "border-amber-200 bg-amber-50/50"} p-4 text-xs`}>
                    <div className="flex items-start gap-3">
                      <AlertCircle className={`size-5 ${fieldErrors.resume ? "text-red-600" : "text-amber-700"} shrink-0 mt-0.5`} />
                      <div className="flex-1">
                        <span className={`font-semibold ${fieldErrors.resume ? "text-red-900" : "text-amber-900"} block text-sm`}>Resume Required</span>
                        <p className="text-[#78716C] text-xs mt-1">
                          Upload your resume to continue with this application. Supported formats: PDF, DOC, DOCX.
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs font-semibold text-charcoal hover:bg-cream cursor-pointer shadow-3xs"
                        >
                          <Upload className="size-3.5 text-terracotta" />
                          <span>Upload Resume</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {fieldErrors.resume && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.resume}</p>
                )}
              </section>

              <section className="space-y-4">
                <div className="border-b border-[#F0ECE4] pb-2">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                    Application Questions
                  </h3>
                </div>

                <div className="space-y-4">
                  <div ref={(el) => { fieldRefs.current.whyInterested = el; }} className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      Why are you interested in this position? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={whyInterested}
                      onChange={(e) => {
                        setWhyInterested(e.target.value);
                        clearFieldError("whyInterested");
                      }}
                      placeholder="Briefly explain why this role interests you and why you believe you would be a good fit."
                      className={`w-full p-3 bg-white border ${fieldErrors.whyInterested ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} rounded-xl text-xs text-charcoal outline-none transition-colors shadow-3xs leading-relaxed`}
                    />
                    {fieldErrors.whyInterested && (
                      <p className="text-xs text-red-600 font-medium">{fieldErrors.whyInterested}</p>
                    )}
                  </div>

                  <div ref={(el) => { fieldRefs.current.relevantExperience = el; }} className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      What makes your experience relevant to this role? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={relevantExperience}
                      onChange={(e) => {
                        setRelevantExperience(e.target.value);
                        clearFieldError("relevantExperience");
                      }}
                      placeholder="Highlight the experience, projects, or skills most relevant to this position."
                      className={`w-full p-3 bg-white border ${fieldErrors.relevantExperience ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} rounded-xl text-xs text-charcoal outline-none transition-colors shadow-3xs leading-relaxed`}
                    />
                    {fieldErrors.relevantExperience && (
                      <p className="text-xs text-red-600 font-medium">{fieldErrors.relevantExperience}</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="border-b border-[#F0ECE4] pb-2 flex items-center justify-between">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                    Additional Information
                  </h3>
                  <span className="text-[11px] text-[#8E877D]">Optional</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-charcoal block">
                    Is there anything else you would like the recruiter to know?
                  </label>
                  <textarea
                    rows={2}
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Share any additional portfolio links, achievements, or notes for the hiring team."
                    className="w-full p-3 bg-white border border-[#E6E0D6] rounded-xl text-xs text-charcoal outline-none focus:border-terracotta transition-colors shadow-3xs leading-relaxed"
                  />
                </div>
              </section>

              <section className="space-y-3 pt-2">
                <div className="rounded-xl border border-[#E6E0D6] bg-cream/60 p-3.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8E877D] block mb-2">
                    Application Summary
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[#8E877D] text-[11px] block">Position</span>
                      <span className="font-semibold text-charcoal truncate block mt-0.5">{job.title}</span>
                    </div>
                    <div>
                      <span className="text-[#8E877D] text-[11px] block">Company</span>
                      <span className="font-semibold text-charcoal truncate block mt-0.5">{job.company}</span>
                    </div>
                    <div>
                      <span className="text-[#8E877D] text-[11px] block">Location & Mode</span>
                      <span className="font-semibold text-charcoal truncate block mt-0.5">{job.location} ({job.workMode})</span>
                    </div>
                    <div>
                      <span className="text-[#8E877D] text-[11px] block">Resume</span>
                      <span className="font-mono font-semibold text-charcoal truncate block mt-0.5">{resumeName}</span>
                    </div>
                  </div>
                </div>

                <div ref={(el) => { fieldRefs.current.confirmation = el; }} className="space-y-1.5">
                  <div className={`p-3.5 rounded-xl border ${fieldErrors.confirmation ? "border-red-400 bg-red-50/30" : "border-[#E6E0D6] bg-white"}`}>
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isConfirmed}
                        onChange={(e) => {
                          setIsConfirmed(e.target.checked);
                          clearFieldError("confirmation");
                        }}
                        className="mt-0.5 size-4 accent-terracotta rounded cursor-pointer shrink-0"
                      />
                      <span className="text-xs text-[#57534E] leading-relaxed">
                        I confirm that the information provided in this application is accurate and complete.
                      </span>
                    </label>
                  </div>
                  {fieldErrors.confirmation && (
                    <p className="text-xs text-red-600 font-medium">{fieldErrors.confirmation}</p>
                  )}
                </div>
              </section>
            </form>

            <div className="px-6 py-4 sm:px-8 sm:py-4.5 border-t border-[#F0ECE4] bg-cream/60 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-[#E6E0D6] bg-white text-xs font-semibold text-charcoal hover:bg-cream transition-colors cursor-pointer shadow-3xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              {Object.keys(fieldErrors).length > 0 && !isSubmitting && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium animate-in fade-in duration-150">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>Please check required fields above</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-terracotta text-xs font-semibold text-white hover:bg-terracotta-dark shadow-2xs transition-all flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    <span>Submit Application</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : step === "error" ? (
          <div className="p-8 sm:p-12 text-center space-y-5 my-auto">
            <div className="size-16 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
              <XCircle className="size-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
                Application Submission Failed
              </h2>
              <p className="text-xs sm:text-sm text-[#78716C] max-w-md mx-auto leading-relaxed">
                We couldn&apos;t submit your application for <span className="font-semibold text-charcoal">{job.title}</span> at <span className="font-semibold text-charcoal">{job.company}</span>.
              </p>
            </div>

            <div className="w-full max-w-md mx-auto rounded-xl border border-red-200 bg-red-50/70 p-4 text-left space-y-1 text-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-700 font-bold block">
                Error Details
              </span>
              <p className="text-red-900 font-medium leading-relaxed break-words">
                {submissionErrorMessage || "An unexpected error occurred while submitting your application. Please check your connection and try again."}
              </p>
            </div>

            <div className="pt-4 border-t border-[#F0ECE4] flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep("review");
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-terracotta text-xs font-semibold text-white hover:bg-terracotta-dark transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <RotateCcw className="size-3.5" />
                <span>Review &amp; Try Again</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E6E0D6] bg-white text-xs font-semibold text-charcoal hover:bg-cream transition-colors cursor-pointer shadow-3xs"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 sm:p-12 text-center space-y-5 my-auto">
            <div className="size-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="size-8" />
            </div>

            <div className="space-y-1">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
                Application Submitted
              </h2>
              <p className="text-xs sm:text-sm text-[#78716C] max-w-md mx-auto leading-relaxed">
                Your application for <span className="font-semibold text-charcoal">{job.title}</span> at <span className="font-semibold text-charcoal">{job.company}</span> has been submitted successfully.
              </p>
            </div>

            <div className="inline-flex items-center gap-3 px-4 py-2 bg-cream border border-[#E6E0D6] rounded-xl text-xs">
              <div className="text-left">
                <span className="text-[#8E877D] text-[10px] block uppercase font-mono tracking-wider">Application ID</span>
                <span className="font-mono font-bold text-charcoal">{applicationId}</span>
              </div>
              <div className="h-6 w-px bg-[#E6E0D6]" />
              <div className="text-left">
                <span className="text-[#8E877D] text-[10px] block uppercase font-mono tracking-wider">Status</span>
                <span className="font-semibold text-emerald-700">Application Submitted</span>
              </div>
            </div>

            {job.require_assessment && (
              <div className="w-full max-w-md mx-auto rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-left space-y-2.5">
                <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                  <HelpCircle className="size-4 text-amber-700" />
                  <span>Assessment Required</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  This position requires completing a short MCQ assessment. You can take it right now or anytime from your applications page.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    navigate(`/candidate/jobs/${job.id}/assessment`);
                  }}
                  className="w-full py-2 px-3 bg-terracotta hover:bg-terracotta-dark text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>Start Assessment Now</span>
                  <ArrowUpRight className="size-3.5" />
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-[#F0ECE4] flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const targetId = createdAppId;
                  handleClose();
                  if (targetId) {
                    navigate(`/candidate/applications/${targetId}`, {
                      state: {
                        from: "job-details",
                        fromLabel: `Back to ${job.title}`,
                        fromPath: `/candidate/jobs/${job.id}`,
                        jobId: job.id,
                      },
                    });
                  } else {
                    navigate("/dashboard?tab=applications");
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-terracotta text-xs font-semibold text-white hover:bg-terracotta-dark transition-colors cursor-pointer shadow-2xs"
              >
                View Submitted Application
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  navigate("/dashboard?tab=applications");
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E6E0D6] bg-white text-xs font-semibold text-charcoal hover:bg-cream transition-colors cursor-pointer shadow-3xs"
              >
                View My Applications
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  navigate("/dashboard?tab=jobs");
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E6E0D6] bg-white text-xs font-semibold text-charcoal hover:bg-cream transition-colors cursor-pointer shadow-3xs"
              >
                Back to Jobs
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
