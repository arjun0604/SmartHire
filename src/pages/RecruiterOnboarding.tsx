import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { updateRecruiterProfile } from "@utils/auth-sync"
import { useUser } from "@context/UserContext"
import { AlertCircle, Loader2, ArrowRight, Building2, User, Mail } from "lucide-react"
import { AuthLayout } from "@components/auth-layout"

export default function RecruiterOnboarding() {
  const navigate = useNavigate();
  const { user: auth0User, isLoading } = useAuth0();
  const { profile, refreshUser } = useUser();

  const [fullName, setFullName] = useState(profile?.name || auth0User?.name || "");
  const [company, setCompany] = useState(profile?.company || "");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }
    if (!company.trim()) {
      setErrorMsg("Company name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      const activeId = profile?.id || auth0User?.sub || `rec_${Date.now()}`;
      updateRecruiterProfile(activeId, fullName.trim(), company.trim());
      refreshUser();
      navigate("/dashboard", { replace: true });
    } catch {
      setErrorMsg("Failed to save workspace details. Please try again.");
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
      heroBadge="RECRUITER WORKSPACE"
      heroWords={["Build", "Scale", "Succeed"]}
      heroDescription="Create high-performing teams with AI-driven matching and assessments."
      footerText="SMARTHIRE • ONBOARDING"
    >
      <div className="w-full max-w-md">
        <div className="mb-8">
          <span className="text-[10px] font-mono font-semibold tracking-widest text-[#8C827A] uppercase">
            WORKSPACE SETUP
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal tracking-tight mt-1.5">
            Set up your recruiter profile
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-2 leading-relaxed">
            Provide your details and company name to initialize your recruitment workspace.
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

          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-charcoal mb-1.5">
              Full name
            </label>
            <div className="relative">
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Maya Chen"
                className="w-full rounded-md border border-[#E6E0D6] bg-white px-3.5 py-2.5 pl-9 text-sm text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:border-terracotta focus:ring-1 focus:ring-terracotta"
                required
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
            </div>
          </div>

          <div>
            <label htmlFor="companyName" className="block text-xs font-semibold text-charcoal mb-1.5">
              Company name
            </label>
            <div className="relative">
              <input
                id="companyName"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Meridian Labs"
                className="w-full rounded-md border border-[#E6E0D6] bg-white px-3.5 py-2.5 pl-9 text-sm text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:border-terracotta focus:ring-1 focus:ring-terracotta"
                required
              />
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-terracotta py-3 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-terracotta-dark active:bg-[#652D18] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin text-white" />
            ) : (
              <>
                <span>Complete workspace setup</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}