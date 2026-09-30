import * as React from "react"
import { Building2, Globe, MapPin, Briefcase, Users, Calendar, Upload, Trash2, CheckCircle2, Loader2, AlertCircle, ChevronDown } from "lucide-react"
import { fetchMyCompanyApi, updateMyCompanyApi, uploadCompanyLogoApi, getBackendUrl } from "../../utils/api"
import {
  validateCompanyName,
  validateMeaningfulText,
  validateFoundedYear,
  validateLocation,
  validateUrl,
} from "../../utils/validation"

const COMPANY_SIZES = [
  "1–10 employees",
  "11–50 employees",
  "51–200 employees",
  "201–500 employees",
  "501–1,000 employees",
  "1,001–5,000 employees",
  "5,001–10,000 employees",
  "10,001+ employees",
];

export function RecruiterCompanyProfile() {
  const [companyName, setCompanyName] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [headquarters, setHeadquarters] = React.useState("");
  const [companySize, setCompanySize] = React.useState("51–200 employees");
  const [foundedYear, setFoundedYear] = React.useState("");
  const [companyLinkedin, setCompanyLinkedin] = React.useState("");

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [logoLoadFailed, setLogoLoadFailed] = React.useState(false);

  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const fieldRefs = React.useRef<Record<string, HTMLElement | null>>({});

  const FIELD_ORDER = [
    "companyName",
    "industry",
    "companySize",
    "foundedYear",
    "description",
    "headquarters",
    "website",
    "companyLinkedin",
  ];

  React.useEffect(() => {
    let isMounted = true;
    async function loadCompany() {
      try {
        setIsLoading(true);
        const data = await fetchMyCompanyApi();
        if (isMounted) {
          setCompanyName(data.name || "");
          setLogoUrl(data.logo_url || "");
          setIndustry(data.industry || "");
          setWebsite(data.website || "");
          setDescription(data.description || "");
          setHeadquarters(data.headquarters || "");
          setCompanySize(data.company_size || "51–200 employees");
          setFoundedYear(data.founded_year ? String(data.founded_year) : "");
          setCompanyLinkedin(data.linkedin || "");
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Failed to load company profile from database.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadCompany();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["png", "jpg", "jpeg", "webp", "svg"];
    if (!file.type.startsWith("image/") && (!ext || !validExtensions.includes(ext))) {
      setErrorMessage("Please upload a valid image file (PNG, JPG, WEBP, or SVG).");
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    if (file.size === 0) {
      setErrorMessage("The selected logo file is empty.");
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Company logo image size must be less than 5MB.");
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    setErrorMessage(null);
    try {
      const res = await uploadCompanyLogoApi(file);
      setLogoUrl(res.logo_url);
      setLogoLoadFailed(false);
    } catch {
      setErrorMessage("Failed to upload company logo. Please try again.");
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleUpdateCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSavedSuccess(false);

    const errors: Record<string, string> = {};

    const nameVal = validateCompanyName(companyName);
    if (!nameVal.isValid) {
      errors.companyName = nameVal.error || "Please enter a valid company name";
    }

    if (industry.trim()) {
      const indVal = validateMeaningfulText(industry, 2, 50, "Industry");
      if (!indVal.isValid) {
        errors.industry = indVal.error || "Please enter a valid industry";
      }
    }

    if (companySize.trim() && !COMPANY_SIZES.includes(companySize)) {
      errors.companySize = "Please select a valid company size";
    }

    if (foundedYear.trim()) {
      const yearVal = validateFoundedYear(foundedYear);
      if (!yearVal.isValid) {
        errors.foundedYear = yearVal.error || "Please enter a valid founded year";
      }
    }

    if (description.trim()) {
      const descVal = validateMeaningfulText(description, 20, 2000, "Company description");
      if (!descVal.isValid) {
        errors.description = descVal.error || "Please enter a meaningful description (at least 20 characters)";
      }
    }

    if (headquarters.trim()) {
      const hqVal = validateLocation(headquarters, "Headquarters");
      if (!hqVal.isValid) {
        errors.headquarters = hqVal.error || "Please enter a valid headquarters location";
      }
    }

    if (website.trim()) {
      const webVal = validateUrl(website, "Website");
      if (!webVal.isValid) {
        errors.website = webVal.error || "Please enter a valid website URL";
      }
    }

    if (companyLinkedin.trim()) {
      const liVal = validateUrl(companyLinkedin, "LinkedIn URL");
      if (!liVal.isValid) {
        errors.companyLinkedin = liVal.error || "Please enter a valid LinkedIn URL";
      }
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

    setIsSaving(true);

    try {
      const parsedYear = foundedYear.trim() ? parseInt(foundedYear.trim(), 10) : null;
      const validYear = parsedYear && !isNaN(parsedYear) ? parsedYear : null;

      const updated = await updateMyCompanyApi({
        name: companyName.trim(),
        logo_url: logoUrl || null,
        industry: industry.trim() || null,
        company_size: companySize.trim() || null,
        headquarters: headquarters.trim() || null,
        description: description.trim() || null,
        founded_year: validYear,
        website: website.trim() || null,
        linkedin: companyLinkedin.trim() || null,
      });

      setCompanyName(updated.name);
      setLogoUrl(updated.logo_url || "");
      setIndustry(updated.industry || "");
      setCompanySize(updated.company_size || "51–200 employees");
      setHeadquarters(updated.headquarters || "");
      setDescription(updated.description || "");
      setFoundedYear(updated.founded_year ? String(updated.founded_year) : "");
      setWebsite(updated.website || "");
      setCompanyLinkedin(updated.linkedin || "");

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch {
      setErrorMessage("Failed to save company profile to database. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-6 animate-spin text-terracotta" />
          <span className="text-xs text-[#8E877D]">Loading company profile...</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleUpdateCompanyProfile} noValidate className="w-full min-w-0 space-y-3.5 sm:space-y-4">
      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3.5 py-2 text-xs font-medium text-emerald-800 animate-in fade-in-0 duration-150">
          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
          <span>Company profile updated successfully.</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/90 px-3.5 py-2 text-xs font-medium text-red-800 animate-in fade-in-0 duration-150">
          <AlertCircle className="size-3.5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="rounded-xl border border-[#E6E0D6] bg-white p-3.5 sm:p-5 shadow-2xs space-y-3.5">
        <div className="border-b border-[#F0ECE4] pb-2">
          <h2 className="font-serif text-sm sm:text-base font-bold text-charcoal">Company Information</h2>
          <p className="text-[11px] text-[#78716C] mt-0.5">Core organizational details and public employer branding.</p>
        </div>

        <div className="flex items-center gap-3.5 pb-0.5">
          <div className="relative shrink-0">
            <div className="size-15 sm:size-16 rounded-xl border-2 border-[#E6E0D6] bg-cream flex items-center justify-center overflow-hidden shadow-xs">
              {logoUrl && !logoLoadFailed ? (
                <img
                  src={getBackendUrl(logoUrl)}
                  alt={companyName || "Logo"}
                  onError={() => setLogoLoadFailed(true)}
                  className="size-full object-cover"
                />
              ) : (
                <Building2 className="size-7 sm:size-8 text-[#A8A199]" />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoChange}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E0D6] bg-white px-2.5 py-1 text-xs font-medium text-charcoal shadow-3xs transition-colors hover:border-terracotta/40 hover:bg-cream cursor-pointer"
              >
                <Upload className="size-3 text-terracotta" />
                <span>{logoUrl ? "Replace Logo" : "Upload Logo"}</span>
              </button>

              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/50 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100/60 cursor-pointer"
                >
                  <Trash2 className="size-3 text-red-600" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <span className="text-[10px] text-[#A8A199]">Square PNG, JPG, or WEBP &lt; 5MB</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-0.5">
          <div ref={(el) => { fieldRefs.current.companyName = el; }}>
            <label htmlFor="companyName" className="block text-xs font-semibold text-charcoal mb-1">
              Company Name <span className="text-terracotta">*</span>
            </label>
            <div className="relative">
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (fieldErrors.companyName) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.companyName;
                      return next;
                    });
                  }
                }}
                placeholder="e.g. Acme Technologies"
                className={`w-full rounded-lg border ${fieldErrors.companyName ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-3 py-1.5 pl-8.5 text-xs text-charcoal outline-none shadow-3xs transition-colors`}
              />
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
            </div>
            {fieldErrors.companyName && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.companyName}</p>
            )}
          </div>

          <div ref={(el) => { fieldRefs.current.industry = el; }}>
            <label htmlFor="industry" className="block text-xs font-semibold text-charcoal mb-1">
              Industry
            </label>
            <div className="relative">
              <input
                id="industry"
                type="text"
                value={industry}
                onChange={(e) => {
                  setIndustry(e.target.value);
                  if (fieldErrors.industry) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.industry;
                      return next;
                    });
                  }
                }}
                placeholder="e.g. Information Technology & Services"
                className={`w-full rounded-lg border ${fieldErrors.industry ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-3 py-1.5 pl-8.5 text-xs text-charcoal outline-none shadow-3xs transition-colors`}
              />
              <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
            </div>
            {fieldErrors.industry && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.industry}</p>
            )}
          </div>

          <div ref={(el) => { fieldRefs.current.companySize = el; }}>
            <label htmlFor="companySize" className="block text-xs font-semibold text-charcoal mb-1">
              Company Size
            </label>
            <div className="relative">
              <select
                id="companySize"
                value={companySize}
                onChange={(e) => {
                  setCompanySize(e.target.value);
                  if (fieldErrors.companySize) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.companySize;
                      return next;
                    });
                  }
                }}
                className={`w-full appearance-none rounded-lg border ${fieldErrors.companySize ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-3 py-1.5 pl-8.5 pr-8 text-xs text-charcoal outline-none shadow-3xs transition-colors cursor-pointer`}
              >
                {COMPANY_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199] pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199] pointer-events-none" />
            </div>
            {fieldErrors.companySize && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.companySize}</p>
            )}
          </div>

          <div ref={(el) => { fieldRefs.current.foundedYear = el; }}>
            <label htmlFor="foundedYear" className="block text-xs font-semibold text-charcoal mb-1">
              Founded Year
            </label>
            <div className="relative">
              <input
                id="foundedYear"
                type="text"
                value={foundedYear}
                onChange={(e) => {
                  setFoundedYear(e.target.value);
                  if (fieldErrors.foundedYear) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.foundedYear;
                      return next;
                    });
                  }
                }}
                placeholder="e.g. 2018"
                className={`w-full rounded-lg border ${fieldErrors.foundedYear ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-3 py-1.5 pl-8.5 text-xs text-charcoal outline-none shadow-3xs transition-colors`}
              />
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
            </div>
            {fieldErrors.foundedYear && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.foundedYear}</p>
            )}
          </div>

          <div ref={(el) => { fieldRefs.current.description = el; }} className="sm:col-span-2 lg:col-span-4">
            <label htmlFor="description" className="block text-xs font-semibold text-charcoal mb-1">
              Company Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.description;
                    return next;
                  });
                }
              }}
              placeholder="Describe your organization's mission, values, work culture, and products or services..."
              className={`w-full rounded-lg border ${fieldErrors.description ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-3 py-2 text-xs text-charcoal outline-none shadow-3xs transition-colors resize-none leading-relaxed`}
            />
            {fieldErrors.description && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="rounded-xl border border-[#E6E0D6] bg-white p-3.5 sm:p-5 shadow-2xs space-y-3">
          <div className="border-b border-[#F0ECE4] pb-2">
            <h2 className="font-serif text-sm sm:text-base font-bold text-charcoal">Headquarters</h2>
            <p className="text-[11px] text-[#78716C] mt-0.5">Primary office location and public web address.</p>
          </div>

          <div className="space-y-2.5 pt-0.5">
            <div ref={(el) => { fieldRefs.current.headquarters = el; }}>
              <label htmlFor="headquarters" className="block text-xs font-semibold text-charcoal mb-1">
                Headquarters Location
              </label>
              <div className="relative">
                <input
                  id="headquarters"
                  type="text"
                  value={headquarters}
                  onChange={(e) => {
                    setHeadquarters(e.target.value);
                    if (fieldErrors.headquarters) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.headquarters;
                        return next;
                      });
                    }
                  }}
                  placeholder="e.g. Mumbai, India or City, Country"
                  className={`w-full rounded-lg border ${fieldErrors.headquarters ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-3 py-1.5 pl-8.5 text-xs text-charcoal outline-none shadow-3xs transition-colors`}
                />
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
              </div>
              {fieldErrors.headquarters && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.headquarters}</p>
              )}
            </div>

            <div ref={(el) => { fieldRefs.current.website = el; }}>
              <label htmlFor="website" className="block text-xs font-semibold text-charcoal mb-1">
                Website
              </label>
              <div className="relative">
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value);
                    if (fieldErrors.website) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.website;
                        return next;
                      });
                    }
                  }}
                  placeholder="https://www.yourcompany.com"
                  className={`w-full rounded-lg border ${fieldErrors.website ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-3 py-1.5 pl-8.5 text-xs text-charcoal outline-none shadow-3xs transition-colors`}
                />
                <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
              </div>
              {fieldErrors.website && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.website}</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#E6E0D6] bg-white p-3.5 sm:p-5 shadow-2xs space-y-3">
          <div className="border-b border-[#F0ECE4] pb-2">
            <h2 className="font-serif text-sm sm:text-base font-bold text-charcoal">Company Links</h2>
            <p className="text-[11px] text-[#78716C] mt-0.5">Official professional presence for your organization.</p>
          </div>

          <div className="space-y-2.5 pt-0.5">
            <div ref={(el) => { fieldRefs.current.companyLinkedin = el; }}>
              <label htmlFor="companyLinkedin" className="block text-xs font-semibold text-charcoal mb-1">
                Company LinkedIn
              </label>
              <div className="relative">
                <input
                  id="companyLinkedin"
                  type="url"
                  value={companyLinkedin}
                  onChange={(e) => {
                    setCompanyLinkedin(e.target.value);
                    if (fieldErrors.companyLinkedin) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.companyLinkedin;
                        return next;
                      });
                    }
                  }}
                  placeholder="https://linkedin.com/company/yourcompany"
                  className={`w-full rounded-lg border ${fieldErrors.companyLinkedin ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-3 py-1.5 pl-8.5 text-xs text-charcoal outline-none shadow-3xs transition-colors`}
                />
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6c0-.88-.72-1.6-1.6-1.6Z"/>
                </svg>
              </div>
              {fieldErrors.companyLinkedin && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.companyLinkedin}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end pt-1">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-terracotta px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer disabled:opacity-60 shrink-0"
        >
          {isSaving ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Company Profile</span>
          )}
        </button>
      </div>
    </form>
  );
}
