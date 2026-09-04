import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2, FileText, Send, X, Upload, AlertCircle, ChevronDown, Check } from "lucide-react"
import { useAppDispatch } from "../../store"
import { applyToJob, type Job } from "../../store/slices/jobsSlice"
import { useUser } from "../../context/UserContext"

interface ApplicationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onSubmitted?: (jobId: string) => void;
}

export function ApplicationReviewModal({
  isOpen,
  onClose,
  job,
  onSubmitted,
}: ApplicationReviewModalProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { profile } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"review" | "submitted">("review");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [location, setLocation] = useState("Bengaluru, India");

  const [currentJobTitle, setCurrentJobTitle] = useState("Software Engineer");
  const [experienceYears, setExperienceYears] = useState("3–5 years");
  const [education, setEducation] = useState("Bachelor's Degree");

  const [resumeName, setResumeName] = useState("Candidate_Resume_Staff.pdf");

  const [whyInterested, setWhyInterested] = useState("");
  const [relevantExperience, setRelevantExperience] = useState("");
  const [isCurrentlyEmployed, setIsCurrentlyEmployed] = useState<"yes" | "no">("yes");
  const [currentNoticePeriod, setCurrentNoticePeriod] = useState("30 days");

  const [isLegallyAuthorized, setIsLegallyAuthorized] = useState<"yes" | "no">("yes");
  const [isWorkArrangementConfirmed, setIsWorkArrangementConfirmed] = useState<"yes" | "no">("yes");

  const [additionalNotes, setAdditionalNotes] = useState("");

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      if (profile.name) setFullName(profile.name);
      if (profile.email) setEmail(profile.email);
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
    if (file) {
      setResumeName(file.name);
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!fullName.trim()) errors.push("Full Name is required.");
    if (!email.trim() || !email.includes("@")) errors.push("A valid Email Address is required.");
    if (!phone.trim()) errors.push("Phone Number is required.");
    if (!location.trim()) errors.push("Location is required.");
    if (!resumeName) errors.push("Resume document is required.");
    if (!whyInterested.trim()) errors.push("Please explain why you are interested in this position.");
    if (!relevantExperience.trim()) errors.push("Please highlight your relevant experience.");
    if (isLegallyAuthorized !== "yes") errors.push("You must be legally authorized to work in this location.");
    if (!isConfirmed) errors.push("You must confirm that the provided information is accurate and complete.");

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    dispatch(applyToJob(job.id));
    if (onSubmitted) {
      onSubmitted(job.id);
    }
    setStep("submitted");
  };

  const handleClose = () => {
    setStep("review");
    setValidationErrors([]);
    onClose();
  };

  const applicationId = `APP-${job.id.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const skillsList = job.requiredSkills && job.requiredSkills.length > 0
    ? job.requiredSkills
    : job.skills || ["React", "TypeScript", "Node.js", "System Design"];

  const isOnsiteOrHybrid = job.workMode && job.workMode.toLowerCase() !== "remote";

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
                <p className="text-xs sm:text-sm text-[#78716C] mt-1">
                  Applying for <span className="font-semibold text-charcoal">{job.title}</span> at <span className="font-semibold text-charcoal">{job.company}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-2 text-[#8E877D] hover:text-charcoal hover:bg-[#FAF8F5] transition-colors cursor-pointer shrink-0"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleResumeFileChange}
                accept=".pdf,.doc,.docx"
                className="hidden"
              />

              {validationErrors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-xs space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 font-semibold text-red-800">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>Please complete all required fields before submitting:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-red-700 pl-1">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <section className="space-y-4">
                <div className="border-b border-[#F0ECE4] pb-2">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                    Applicant Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Arjun Nair"
                      className="w-full h-10 px-3.5 bg-white border border-[#E6E0D6] rounded-xl text-xs text-charcoal outline-none focus:border-terracotta transition-colors shadow-3xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="w-full h-10 px-3.5 bg-white border border-[#E6E0D6] rounded-xl text-xs text-charcoal outline-none focus:border-terracotta transition-colors shadow-3xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full h-10 px-3.5 bg-white border border-[#E6E0D6] rounded-xl text-xs text-charcoal outline-none focus:border-terracotta transition-colors shadow-3xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      Current Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Bengaluru, India"
                      className="w-full h-10 px-3.5 bg-white border border-[#E6E0D6] rounded-xl text-xs text-charcoal outline-none focus:border-terracotta transition-colors shadow-3xs"
                      required
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="border-b border-[#F0ECE4] pb-2">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                    Professional Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      Current / Most Recent Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentJobTitle}
                      onChange={(e) => setCurrentJobTitle(e.target.value)}
                      placeholder="e.g. Senior Frontend Engineer"
                      className="w-full h-10 px-3.5 bg-white border border-[#E6E0D6] rounded-xl text-xs text-charcoal outline-none focus:border-terracotta transition-colors shadow-3xs"
                      required
                    />
                  </div>

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

                  <div className="space-y-1.5 sm:col-span-2">
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
                        className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-medium text-charcoal"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="border-b border-[#F0ECE4] pb-2">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                    Resume Document
                  </h3>
                </div>

                {resumeName ? (
                  <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 flex items-center justify-between gap-4 shadow-3xs hover:border-terracotta/40 transition-colors">
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
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="size-5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-semibold text-amber-900 block text-sm">Resume Required</span>
                        <p className="text-[#78716C] text-xs mt-1">
                          Upload your resume to continue with this application. Supported formats: PDF, DOC, DOCX.
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs font-semibold text-charcoal hover:bg-[#FAF8F5] cursor-pointer shadow-3xs"
                        >
                          <Upload className="size-3.5 text-terracotta" />
                          <span>Upload Resume</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="border-b border-[#F0ECE4] pb-2">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                    Application Questions
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      Why are you interested in this position? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={whyInterested}
                      onChange={(e) => setWhyInterested(e.target.value)}
                      placeholder="Briefly explain why this role interests you and why you believe you would be a good fit."
                      className="w-full p-3 bg-white border border-[#E6E0D6] rounded-xl text-xs text-charcoal outline-none focus:border-terracotta transition-colors shadow-3xs leading-relaxed"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal block">
                      What makes your experience relevant to this role? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={relevantExperience}
                      onChange={(e) => setRelevantExperience(e.target.value)}
                      placeholder="Highlight the experience, projects, or skills most relevant to this position."
                      className="w-full p-3 bg-white border border-[#E6E0D6] rounded-xl text-xs text-charcoal outline-none focus:border-terracotta transition-colors shadow-3xs leading-relaxed"
                      required
                    />
                  </div>

                  <div className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5]/60 p-4 space-y-3">
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
                            onChange={() => setIsCurrentlyEmployed("yes")}
                            className="accent-terracotta"
                          />
                          <span>Yes</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-charcoal cursor-pointer">
                          <input
                            type="radio"
                            name="employed"
                            checked={isCurrentlyEmployed === "no"}
                            onChange={() => setIsCurrentlyEmployed("no")}
                            className="accent-terracotta"
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </div>

                    {isCurrentlyEmployed === "yes" && (
                      <div className="pt-2 border-t border-[#E6E0D6]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-xs text-[#78716C]">
                          What is your current notice period?
                        </span>
                        <div className="relative w-full sm:w-48">
                          <select
                            value={currentNoticePeriod}
                            onChange={(e) => setCurrentNoticePeriod(e.target.value)}
                            className="w-full h-9 px-3 pr-8 bg-white border border-[#E6E0D6] rounded-lg text-xs text-charcoal outline-none focus:border-terracotta appearance-none cursor-pointer"
                          >
                            <option value="Immediate">Immediate</option>
                            <option value="15 days">15 days</option>
                            <option value="30 days">30 days</option>
                            <option value="60 days">60 days</option>
                            <option value="90 days">90 days</option>
                            <option value="Other">Other</option>
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#8E877D] pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="border-b border-[#F0ECE4] pb-2">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                    Work Eligibility
                  </h3>
                </div>

                <div className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5]/60 p-4 space-y-4">
                  <div>
                    <span className="text-xs text-[#78716C] block">
                      This position is based in: <strong className="text-charcoal font-semibold">{job.location}</strong> ({job.workMode})
                    </span>
                  </div>

                  <div className="pt-3 border-t border-[#E6E0D6]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-charcoal">
                      Are you legally authorized to work in this location? <span className="text-red-500">*</span>
                    </span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs text-charcoal cursor-pointer">
                        <input
                          type="radio"
                          name="authorized"
                          checked={isLegallyAuthorized === "yes"}
                          onChange={() => setIsLegallyAuthorized("yes")}
                          className="accent-terracotta"
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-charcoal cursor-pointer">
                        <input
                          type="radio"
                          name="authorized"
                          checked={isLegallyAuthorized === "no"}
                          onChange={() => setIsLegallyAuthorized("no")}
                          className="accent-terracotta"
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>

                  {isOnsiteOrHybrid && (
                    <div className="pt-3 border-t border-[#E6E0D6]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-charcoal">
                        Are you willing to work in the required {job.workMode} arrangement? <span className="text-red-500">*</span>
                      </span>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-charcoal cursor-pointer">
                          <input
                            type="radio"
                            name="arrangement"
                            checked={isWorkArrangementConfirmed === "yes"}
                            onChange={() => setIsWorkArrangementConfirmed("yes")}
                            className="accent-terracotta"
                          />
                          <span>Yes</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-charcoal cursor-pointer">
                          <input
                            type="radio"
                            name="arrangement"
                            checked={isWorkArrangementConfirmed === "no"}
                            onChange={() => setIsWorkArrangementConfirmed("no")}
                            className="accent-terracotta"
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </div>
                  )}
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
                <div className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5]/60 p-3.5">
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
                      <span className="text-[#8E877D] text-[11px] block">Location</span>
                      <span className="font-semibold text-charcoal truncate block mt-0.5">{job.location}</span>
                    </div>
                    <div>
                      <span className="text-[#8E877D] text-[11px] block">Resume</span>
                      <span className="font-mono font-semibold text-charcoal truncate block mt-0.5">{resumeName}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E6E0D6] bg-white">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isConfirmed}
                      onChange={(e) => setIsConfirmed(e.target.checked)}
                      className="mt-0.5 size-4 accent-terracotta rounded cursor-pointer shrink-0"
                      required
                    />
                    <span className="text-xs text-[#57534E] leading-relaxed">
                      I confirm that the information provided in this application is accurate and complete.
                    </span>
                  </label>
                </div>
              </section>
            </form>

            <div className="px-6 py-4 sm:px-8 sm:py-4.5 border-t border-[#F0ECE4] bg-[#FAF8F5]/60 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl border border-[#E6E0D6] bg-white text-xs font-semibold text-charcoal hover:bg-[#FAF8F5] transition-colors cursor-pointer shadow-3xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl bg-terracotta text-xs font-semibold text-white hover:bg-terracotta-dark shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Send className="size-3.5" />
                <span>Submit Application</span>
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

            <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#FAF8F5] border border-[#E6E0D6] rounded-xl text-xs">
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

            <div className="pt-4 border-t border-[#F0ECE4] flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  navigate("/dashboard?tab=overview");
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E6E0D6] bg-white text-xs font-semibold text-charcoal hover:bg-[#FAF8F5] transition-colors cursor-pointer shadow-3xs"
              >
                View My Applications
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  navigate("/dashboard?tab=jobs");
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-terracotta text-xs font-semibold text-white hover:bg-terracotta-dark transition-colors cursor-pointer shadow-2xs"
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
