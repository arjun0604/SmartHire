import { useState } from "react"
import { Building2, Mail, Globe, MapPin } from "lucide-react"
import { useUser } from "@context/UserContext"
import { updateRecruiterProfile } from "@utils/auth-sync"

export function RecruiterCompanyProfile() {
  const { profile, refreshUser } = useUser();

  const [companyName, setCompanyName] = useState(profile?.company || "Meridian Labs");
  const [recruiterName, setRecruiterName] = useState(profile?.name || "Recruiter");
  const [industry, setIndustry] = useState("Technology & AI");
  const [website, setWebsite] = useState("https://meridianlabs.ai");
  const [location, setLocation] = useState("San Francisco, CA");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleUpdateCompanyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    updateRecruiterProfile(profile.id, recruiterName.trim() || profile.name, companyName.trim() || "Company");
    refreshUser();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-2xl w-full bg-white rounded-xl border border-[#E6E0D6] p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-6 overflow-hidden">
      <div>
        <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">Company Workspace Details</h2>
        <p className="text-xs text-[#78716C] mt-1">Configure your organization's recruiting profile and workspace branding.</p>
      </div>

      {savedSuccess && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-700 font-medium">
          Workspace details saved successfully.
        </div>
      )}

      <form onSubmit={handleUpdateCompanyProfile} className="space-y-4">
        <div>
          <label htmlFor="companyName" className="block text-xs font-semibold text-charcoal mb-1.5">
            Company name
          </label>
          <div className="relative">
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-md border border-[#E6E0D6] bg-white px-3.5 py-2 pl-9 text-xs text-charcoal outline-none focus:border-terracotta"
            />
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
          </div>
        </div>

        <div>
          <label htmlFor="recruiterName" className="block text-xs font-semibold text-charcoal mb-1.5">
            Lead recruiter name
          </label>
          <div className="relative">
            <input
              id="recruiterName"
              type="text"
              value={recruiterName}
              onChange={(e) => setRecruiterName(e.target.value)}
              className="w-full rounded-md border border-[#E6E0D6] bg-white px-3.5 py-2 pl-9 text-xs text-charcoal outline-none focus:border-terracotta"
            />
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
          </div>
        </div>

        <div>
          <label htmlFor="industry" className="block text-xs font-semibold text-charcoal mb-1.5">
            Industry domain
          </label>
          <input
            id="industry"
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full rounded-md border border-[#E6E0D6] bg-white px-3.5 py-2 text-xs text-charcoal outline-none focus:border-terracotta"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <label htmlFor="website" className="block text-xs font-semibold text-charcoal mb-1.5">
              Website
            </label>
            <div className="relative">
              <input
                id="website"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-md border border-[#E6E0D6] bg-white px-3.5 py-2 pl-9 text-xs text-charcoal outline-none focus:border-terracotta"
              />
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-xs font-semibold text-charcoal mb-1.5">
              Headquarters
            </label>
            <div className="relative">
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-md border border-[#E6E0D6] bg-white px-3.5 py-2 pl-9 text-xs text-charcoal outline-none focus:border-terracotta"
              />
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-terracotta px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer w-full sm:w-auto"
          >
            Save Workspace Details
          </button>
        </div>
      </form>
    </div>
  );
}
