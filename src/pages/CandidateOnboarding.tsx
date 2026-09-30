import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { useUser } from "@context/UserContext"
import { AlertCircle, Loader2, ArrowRight, User, Mail, UploadCloud, CheckCircle2, Phone, MapPin } from "lucide-react"
import { AuthLayout } from "@components/auth-layout"
import { DatePicker } from "rsuite"
import "rsuite/DatePicker/styles/index.css"
import { validateName, validateDateOfBirth, validateIndianPhone, normalizeIndianPhone, validateLocation } from "../utils/validation"

export default function CandidateOnboarding() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const { user: auth0User, isLoading } = useAuth0();
  const { profile, updateCandidate, uploadResume } = useUser();

  const initialName = profile?.name || auth0User?.name || "";
  const nameParts = initialName.trim().split(/\s+/);
  const initialFirst = nameParts[0] || "";
  const initialLast = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [phone, setPhone] = useState(profile?.phone || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [dob, setDob] = useState<string>(profile?.dob || "");
  const [resumeName, setResumeName] = useState(profile?.resumeName || "");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const FIELD_ORDER = ["firstName", "lastName", "phone", "location", "dob", "resume"];

  const handleFileChange = (file: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx", "doc"].includes(ext)) {
      setFieldErrors((prev) => ({ ...prev, resume: "Please upload a PDF or DOC/DOCX file." }));
      return;
    }
    if (file.size === 0) {
      setFieldErrors((prev) => ({ ...prev, resume: "The selected file is empty." }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors((prev) => ({ ...prev, resume: "File size must be under 10MB." }));
      return;
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.resume;
      return next;
    });
    setResumeName(file.name);
    setResumeFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const errors: Record<string, string> = {};

    const firstVal = validateName(firstName, "First name");
    if (!firstVal.isValid) {
      errors.firstName = firstVal.error || "Please enter a valid first name";
    }

    const lastVal = validateName(lastName, "Last name");
    if (!lastVal.isValid) {
      errors.lastName = lastVal.error || "Please enter a valid last name";
    }

    const phoneVal = validateIndianPhone(phone, true);
    if (!phoneVal.isValid) {
      errors.phone = phoneVal.error || "Please enter a valid phone number";
    }

    const locVal = validateLocation(location, "Location", true);
    if (!locVal.isValid) {
      errors.location = locVal.error || "Please enter your location";
    }

    const dobVal = validateDateOfBirth(dob);
    if (!dobVal.isValid) {
      errors.dob = dobVal.error || "Please enter a valid date of birth";
    }

    if (!resumeName && !resumeFile) {
      errors.resume = "Please upload your resume to continue.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstError = FIELD_ORDER.find((k) => errors[k]);
      if (firstError) {
        setTimeout(() => {
          const el = fieldRefs.current[firstError];
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            const focusable = el.querySelector<HTMLElement>("input, select, textarea, button") || (el instanceof HTMLElement ? el : null);
            if (focusable && typeof focusable.focus === "function") {
              focusable.focus({ preventScroll: true });
            }
          }
        }, 50);
      }
      return;
    }

    try {
      setSubmitting(true);
      let finalResumeName = resumeName;
      if (resumeFile) {
        const uploaded = await uploadResume(resumeFile);
        if (!uploaded) {
          throw new Error("Failed to process resume");
        }
        finalResumeName = resumeFile.name;
        if (typeof window !== "undefined") {
          sessionStorage.setItem("smarthire_resume_just_uploaded", "true");
        }
      }
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const normalizedPhone = normalizeIndianPhone(phone);
      await updateCandidate(
        {
          name: fullName,
          phone: normalizedPhone,
          location: location.trim(),
          dob: dob,
          resumeName: finalResumeName,
        },
        { is_onboarding_completion: true, is_profile_update: true }
      );
      navigate("/dashboard?tab=profile", { replace: true });
    } catch (err: any) {
      const backendDetail = err?.response?.data?.detail;
      if (typeof backendDetail === "string") {
        setServerError(backendDetail);
      } else {
        setServerError("Failed to save candidate profile and process resume. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <div className="min-h-screen w-full bg-cream flex flex-col items-center justify-center p-6 select-none font-sans text-charcoal">
        <div className="w-full max-w-sm rounded-2xl border border-[#E6E0D6] bg-white p-8 shadow-xs flex flex-col items-center text-center space-y-4">
          <div className="size-10 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold text-charcoal">
              Processing your resume
            </h3>
            <p className="text-xs text-[#78716C] leading-relaxed">
              Extracting your professional background and structuring your profile...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-cream flex items-center justify-center font-sans text-charcoal">
        <Loader2 className="size-6 animate-spin text-terracotta" />
      </div>
    );
  }

  return (
    <AuthLayout
      heroBadge="CANDIDATE ONBOARDING"
      heroWords={["Learn", "Excel", "Achieve"]}
      heroDescription="Unlock verified placements and tailored skill assessment benchmarks."
    >
      <div className="w-full max-w-md">
        <div className="mb-8">
          <span className="text-[10px] font-mono font-semibold tracking-widest text-[#8C827A] uppercase">
            CANDIDATE ONBOARDING
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal tracking-tight mt-1.5">
            Complete your profile
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-2 leading-relaxed">
            Add your details and upload your resume for automated AI role matching.
          </p>
        </div>

        {serverError && (
          <div className="mb-6 flex items-start gap-2 rounded-md border border-red-200 bg-red-50/80 p-3 text-xs text-red-700">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <p>{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="rounded-md border border-[#E6E0D6] bg-white/70 p-3 flex items-center gap-2 text-xs text-[#78716C]">
            <Mail className="size-3.5 text-terracotta" />
            <span>{profile?.email || auth0User?.email}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div ref={(el) => { fieldRefs.current.firstName = el; }}>
              <label htmlFor="firstName" className="block text-xs font-semibold text-charcoal mb-1.5">
                First name <span className="text-terracotta">*</span>
              </label>
              <div className="relative">
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (fieldErrors.firstName) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.firstName;
                        return next;
                      });
                    }
                  }}
                  placeholder="Rahul"
                  className={`w-full rounded-md border ${fieldErrors.firstName ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} bg-white px-3.5 py-2.5 pl-9 text-sm text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:ring-1`}
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
              </div>
              {fieldErrors.firstName && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.firstName}</p>
              )}
            </div>

            <div ref={(el) => { fieldRefs.current.lastName = el; }}>
              <label htmlFor="lastName" className="block text-xs font-semibold text-charcoal mb-1.5">
                Last name <span className="text-terracotta">*</span>
              </label>
              <div className="relative">
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (fieldErrors.lastName) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.lastName;
                        return next;
                      });
                    }
                  }}
                  placeholder="Mehra"
                  className={`w-full rounded-md border ${fieldErrors.lastName ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} bg-white px-3.5 py-2.5 pl-9 text-sm text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:ring-1`}
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
              </div>
              {fieldErrors.lastName && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div ref={(el) => { fieldRefs.current.phone = el; }}>
              <label htmlFor="phone" className="block text-xs font-semibold text-charcoal mb-1.5">
                Phone number <span className="text-terracotta">*</span>
              </label>
              <div className="relative">
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.phone;
                        return next;
                      });
                    }
                  }}
                  onBlur={() => {
                    if (phone.trim()) {
                      setPhone(normalizeIndianPhone(phone));
                    }
                  }}
                  placeholder="+91 98765 43210"
                  className={`w-full rounded-md border ${fieldErrors.phone ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} bg-white px-3.5 py-2.5 pl-9 text-sm text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:ring-1`}
                />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
              </div>
              {fieldErrors.phone && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.phone}</p>
              )}
            </div>

            <div ref={(el) => { fieldRefs.current.location = el; }}>
              <label htmlFor="location" className="block text-xs font-semibold text-charcoal mb-1.5">
                Location <span className="text-terracotta">*</span>
              </label>
              <div className="relative">
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (fieldErrors.location) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.location;
                        return next;
                      });
                    }
                  }}
                  placeholder="e.g. Kochi, Kerala, India"
                  className={`w-full rounded-md border ${fieldErrors.location ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} bg-white px-3.5 py-2.5 pl-9 text-sm text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:ring-1`}
                />
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
              </div>
              {fieldErrors.location && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.location}</p>
              )}
            </div>
          </div>

          <div ref={(el) => { fieldRefs.current.dob = el; }}>
            <label htmlFor="dob" className="block text-xs font-semibold text-charcoal mb-1.5">
              Date of birth <span className="text-terracotta">*</span>
            </label>
            <DatePicker
              id="dob"
              block
              oneTap
              ranges={[]}
              limitEndYear={1}
              limitStartYear={100}
              calendarDefaultDate={dob ? new Date(dob) : new Date(2000, 0, 1)}
              value={dob ? new Date(dob) : null}
              onChange={(date: Date | null) => {
                if (fieldErrors.dob) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.dob;
                    return next;
                  });
                }
                if (date) {
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, "0");
                  const dd = String(date.getDate()).padStart(2, "0");
                  setDob(`${yyyy}-${mm}-${dd}`);
                } else {
                  setDob("");
                }
              }}
              shouldDisableDate={(date) => {
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                return date.getTime() > today.getTime();
              }}
              placeholder="DD/MM/YYYY"
              format="dd/MM/yyyy"
              className="custom-dob-picker"
            />
            {fieldErrors.dob && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.dob}</p>
            )}
          </div>

          <div ref={(el) => { fieldRefs.current.resume = el; }}>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              Resume / CV <span className="text-terracotta">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`group relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center cursor-pointer transition-all ${dragActive
                  ? "border-terracotta bg-[#FAF2EE]"
                  : fieldErrors.resume
                    ? "border-red-400 bg-red-50/30"
                    : resumeName
                      ? "border-emerald-400 bg-emerald-50/40"
                      : "border-[#E6E0D6] bg-white hover:border-stone-400 hover:bg-stone-50/50"
                }`}
            >
              {resumeName ? (
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-charcoal line-clamp-1">{resumeName}</p>
                    <p className="text-[11px] text-emerald-700">Upload Successful &bull; Click to replace</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="size-9 rounded-full bg-cream-muted flex items-center justify-center text-terracotta group-hover:scale-105 transition-transform">
                    <UploadCloud className="size-5" />
                  </div>
                  <div className="text-xs text-charcoal font-medium">
                    <span className="text-terracotta font-semibold underline underline-offset-2">Upload your resume</span> or drag and drop
                  </div>
                  <p className="text-[11px] text-[#A8A199]">PDF, DOCX, or DOC up to 10MB</p>
                </div>
              )}
            </div>
            {fieldErrors.resume && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.resume}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-terracotta py-3 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-terracotta-dark active:bg-[#652D18] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin text-white" />
            ) : (
              <>
                <span>Complete profile & continue</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}

