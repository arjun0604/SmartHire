import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { updateCandidateProfile } from "@utils/auth-sync"
import { useUser } from "@context/UserContext"
import { AlertCircle, Loader2, ArrowRight, User, Mail, UploadCloud, CheckCircle2 } from "lucide-react"
import { AuthLayout } from "@components/auth-layout"
import { DatePicker } from "rsuite"

export default function CandidateOnboarding() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user: auth0User, isLoading } = useAuth0();
  const { profile, refreshUser } = useUser();

  const initialName = profile?.name || auth0User?.name || "";
  const nameParts = initialName.trim().split(/\s+/);
  const initialFirst = nameParts[0] || "";
  const initialLast = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [dob, setDob] = useState<string>(profile?.dob || "");
  const [resumeName, setResumeName] = useState(profile?.resumeName || "");
  const [resumeText, setResumeText] = useState(profile?.resumeText || "");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (file: File) => {
    if (!file) return;
    setResumeName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setResumeText(text || file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setErrorMsg("First name is required.");
      return;
    }
    if (!lastName.trim()) {
      setErrorMsg("Last name is required.");
      return;
    }
    if (!dob) {
      setErrorMsg("Date of birth is required.");
      return;
    }
    const birthDate = new Date(dob);
    const today = new Date();
    if (isNaN(birthDate.getTime()) || birthDate >= today) {
      setErrorMsg("Please enter a valid past date of birth.");
      return;
    }
    if (!resumeName) {
      setErrorMsg("Please upload your resume to continue.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const activeId = profile?.id || auth0User?.sub || `cand_${Date.now()}`;
      updateCandidateProfile(activeId, {
        name: fullName,
        dob: dob,
        resumeName: resumeName,
        resumeText: resumeText || resumeName,
      });
      refreshUser();
      navigate("/dashboard", { replace: true });
    } catch {
      setErrorMsg("Failed to save candidate profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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

        {errorMsg && (
          <div className="mb-6 flex items-start gap-2 rounded-md border border-red-200 bg-red-50/80 p-3 text-xs text-red-700">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-[#E6E0D6] bg-white/70 p-3 flex items-center gap-2 text-xs text-[#78716C]">
            <Mail className="size-3.5 text-terracotta" />
            <span>{profile?.email || auth0User?.email}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-xs font-semibold text-charcoal mb-1.5">
                First name
              </label>
              <div className="relative">
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Rahul"
                  className="w-full rounded-md border border-[#E6E0D6] bg-white px-3.5 py-2.5 pl-9 text-sm text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:border-terracotta focus:ring-1 focus:ring-terracotta"
                  required
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
              </div>
            </div>

            <div>
              <label htmlFor="lastName" className="block text-xs font-semibold text-charcoal mb-1.5">
                Last name
              </label>
              <div className="relative">
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Mehra"
                  className="w-full rounded-md border border-[#E6E0D6] bg-white px-3.5 py-2.5 pl-9 text-sm text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:border-terracotta focus:ring-1 focus:ring-terracotta"
                  required
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="dob" className="block text-xs font-semibold text-charcoal mb-1.5">
              Date of birth
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
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              Resume / CV
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
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
              className={`group relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-terracotta bg-[#FAF2EE]"
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
                    <p className="text-[11px] text-emerald-700">Ready for AI Matching &bull; Click to replace</p>
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
                  <p className="text-[11px] text-[#A8A199]">PDF, DOCX, or TXT up to 10MB</p>
                </div>
              )}
            </div>
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

