import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { useUser } from "@context/UserContext"
import {
  AlertCircle,
  Loader2,
  ArrowRight,
  Building2,
  User,
  Mail,
  Briefcase,
  Users,
  MapPin,
  Calendar,
  Globe,
  Upload,
  Trash2,
  ChevronDown,
} from "lucide-react"
import { AuthLayout } from "@components/auth-layout"
import { uploadCompanyLogoApi } from "@utils/api"
import {
  validateName,
  validateCompanyName,
  validateLocation,
  validateMeaningfulText,
  validateFoundedYear,
  validateUrl,
} from "../utils/validation"

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

export default function RecruiterOnboarding() {
  const navigate = useNavigate();
  const { user: auth0User, isLoading } = useAuth0();
  const { profile, updateRecruiter } = useUser();
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const [fullName, setFullName] = useState(profile?.name || auth0User?.name || "");
  const [company, setCompany] = useState(profile?.company && profile.company !== "My Company" ? profile.company : "");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState(COMPANY_SIZES[2]);
  const [headquarters, setHeadquarters] = useState("");
  const [description, setDescription] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const FIELD_ORDER = [
    "fullName",
    "company",
    "industry",
    "companySize",
    "headquarters",
    "description",
    "logo",
    "foundedYear",
    "website",
    "linkedin",
  ];

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["png", "jpg", "jpeg", "webp", "svg"];
    if (!file.type.startsWith("image/") && (!ext || !validExtensions.includes(ext))) {
      setFieldErrors((prev) => ({ ...prev, logo: "Please upload a valid image file (PNG, JPG, WEBP, or SVG)." }));
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    if (file.size === 0) {
      setFieldErrors((prev) => ({ ...prev, logo: "The selected logo file is empty." }));
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((prev) => ({ ...prev, logo: "Company logo size must be less than 5MB." }));
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.logo;
      return next;
    });
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    if (logoInputRef.current) logoInputRef.current.value = "";
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.logo;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const errors: Record<string, string> = {};

    const nameVal = validateName(fullName, "Full name");
    if (!nameVal.isValid) {
      errors.fullName = nameVal.error || "Please enter a valid full name";
    }

    const compVal = validateCompanyName(company);
    if (!compVal.isValid) {
      errors.company = compVal.error || "Please enter a valid company name";
    }

    const indVal = validateMeaningfulText(industry, 2, 50, "Industry");
    if (!indVal.isValid) {
      errors.industry = indVal.error || "Please enter a valid industry";
    }

    if (!companySize.trim() || !COMPANY_SIZES.includes(companySize)) {
      errors.companySize = "Please select a valid company size";
    }

    const hqVal = validateLocation(headquarters);
    if (!hqVal.isValid) {
      errors.headquarters = hqVal.error || "Please enter a valid headquarters location";
    }

    const descVal = validateMeaningfulText(description, 20, 2000, "Company description");
    if (!descVal.isValid) {
      errors.description = descVal.error || "Please enter a meaningful company description (at least 20 characters)";
    }

    if (foundedYear.trim()) {
      const yearVal = validateFoundedYear(foundedYear);
      if (!yearVal.isValid) {
        errors.foundedYear = yearVal.error || "Please enter a valid founded year";
      }
    }

    if (website.trim()) {
      const webVal = validateUrl(website, "Website");
      if (!webVal.isValid) {
        errors.website = webVal.error || "Please enter a valid website URL";
      }
    }

    if (linkedin.trim()) {
      const liVal = validateUrl(linkedin, "LinkedIn URL");
      if (!liVal.isValid) {
        errors.linkedin = liVal.error || "Please enter a valid LinkedIn URL";
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

    try {
      setSubmitting(true);
      const parsedYear = foundedYear.trim() ? parseInt(foundedYear.trim(), 10) : null;
      const validYear = parsedYear && !isNaN(parsedYear) ? parsedYear : null;

      await updateRecruiter({
        name: fullName.trim(),
        company: company.trim(),
        industry: industry.trim(),
        companySize: companySize.trim(),
        headquarters: headquarters.trim(),
        description: description.trim(),
        foundedYear: validYear,
        website: website.trim() || null,
        linkedin: linkedin.trim() || null,
      });

      if (logoFile) {
        try {
          await uploadCompanyLogoApi(logoFile);
        } catch {
        }
      }

      navigate("/dashboard", { replace: true });
    } catch {
      setServerError("Failed to save workspace details. Please try again.");
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
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <span className="text-[10px] font-mono font-semibold tracking-widest text-[#8C827A] uppercase">
            WORKSPACE SETUP
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight mt-1">
            Set up your recruiter profile
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1.5 leading-relaxed">
            Provide your details and essential company information to initialize your recruitment workspace.
          </p>
        </div>

        {serverError && (
          <div className="mb-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50/80 p-3 text-xs text-red-700 animate-in fade-in duration-150">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <p>{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="rounded-md border border-[#E6E0D6] bg-white/70 p-2.5 flex items-center gap-2 text-xs text-[#78716C]">
            <Mail className="size-3.5 text-terracotta" />
            <span>{profile?.email || auth0User?.email}</span>
          </div>

          <div ref={(el) => { fieldRefs.current.fullName = el; }}>
            <label htmlFor="fullName" className="block text-xs font-semibold text-charcoal mb-1">
              Full name <span className="text-terracotta">*</span>
            </label>
            <div className="relative">
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.fullName;
                      return next;
                    });
                  }
                }}
                placeholder="e.g. Maya Chen"
                className={`w-full rounded-md border ${fieldErrors.fullName ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} bg-white px-3.5 py-2 pl-9 text-xs sm:text-sm text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:ring-1`}
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
            </div>
            {fieldErrors.fullName && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.fullName}</p>
            )}
          </div>

          <div className="pt-2 border-t border-[#E6E0D6]">
            <span className="block text-[11px] font-mono font-semibold tracking-wider text-terracotta uppercase mb-3">
              Company Information
            </span>

            <div className="space-y-3.5">
              <div ref={(el) => { fieldRefs.current.company = el; }}>
                <label htmlFor="companyName" className="block text-xs font-semibold text-charcoal mb-1">
                  Company name <span className="text-terracotta">*</span>
                </label>
                <div className="relative">
                  <input
                    id="companyName"
                    type="text"
                    value={company}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      if (fieldErrors.company) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.company;
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. Acme Technologies"
                    className={`w-full rounded-md border ${fieldErrors.company ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} bg-white px-3.5 py-2 pl-9 text-xs sm:text-sm text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:ring-1`}
                  />
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
                </div>
                {fieldErrors.company && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.company}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div ref={(el) => { fieldRefs.current.industry = el; }}>
                  <label htmlFor="industry" className="block text-xs font-semibold text-charcoal mb-1">
                    Industry <span className="text-terracotta">*</span>
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
                      placeholder="e.g. Technology & Software"
                      className={`w-full rounded-md border ${fieldErrors.industry ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} bg-white px-3.5 py-2 pl-9 text-xs sm:text-sm text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:ring-1`}
                    />
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
                  </div>
                  {fieldErrors.industry && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.industry}</p>
                  )}
                </div>

                <div ref={(el) => { fieldRefs.current.companySize = el; }}>
                  <label htmlFor="companySize" className="block text-xs font-semibold text-charcoal mb-1">
                    Company size <span className="text-terracotta">*</span>
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
                      className={`w-full appearance-none rounded-md border ${fieldErrors.companySize ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} bg-white px-3.5 py-2 pl-9 pr-8 text-xs sm:text-sm text-charcoal outline-none transition-all focus:ring-1 cursor-pointer`}
                    >
                      {COMPANY_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199] pointer-events-none" />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199] pointer-events-none" />
                  </div>
                  {fieldErrors.companySize && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.companySize}</p>
                  )}
                </div>
              </div>

              <div ref={(el) => { fieldRefs.current.headquarters = el; }}>
                <label htmlFor="headquarters" className="block text-xs font-semibold text-charcoal mb-1">
                  Headquarters location <span className="text-terracotta">*</span>
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
                    placeholder="e.g. Bengaluru, India or San Francisco, CA"
                    className={`w-full rounded-md border ${fieldErrors.headquarters ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} bg-white px-3.5 py-2 pl-9 text-xs sm:text-sm text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:ring-1`}
                  />
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
                </div>
                {fieldErrors.headquarters && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.headquarters}</p>
                )}
              </div>

              <div ref={(el) => { fieldRefs.current.description = el; }}>
                <label htmlFor="description" className="block text-xs font-semibold text-charcoal mb-1">
                  Company description <span className="text-terracotta">*</span>
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
                  placeholder="Describe your organization's mission, values, work culture, and products..."
                  className={`w-full rounded-md border ${fieldErrors.description ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} bg-white px-3.5 py-2 text-xs sm:text-sm text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:ring-1 resize-none leading-relaxed`}
                />
                {fieldErrors.description && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E6E0D6]">
            <span className="block text-[11px] font-mono font-semibold tracking-wider text-[#8C827A] uppercase mb-3">
              Optional Details
            </span>

            <div className="space-y-3">
              <div ref={(el) => { fieldRefs.current.logo = el; }}>
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-lg border border-[#E6E0D6] bg-cream flex items-center justify-center overflow-hidden shrink-0">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Preview"
                        onError={() => setLogoPreview("")}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Building2 className="size-6 text-[#A8A199]" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoSelect}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#E6E0D6] bg-white px-2.5 py-1.5 text-xs font-medium text-charcoal hover:bg-cream transition-colors cursor-pointer"
                    >
                      <Upload className="size-3 text-terracotta" />
                      <span>{logoPreview ? "Change Logo" : "Upload Logo"}</span>
                    </button>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3 text-red-600" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
                {fieldErrors.logo && (
                  <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.logo}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div ref={(el) => { fieldRefs.current.foundedYear = el; }}>
                  <label htmlFor="foundedYear" className="block text-xs font-semibold text-charcoal mb-1">
                    Founded year
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
                      placeholder="e.g. 2020"
                      className={`w-full rounded-md border ${fieldErrors.foundedYear ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} bg-white px-3 py-1.5 pl-8 text-xs text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:ring-1`}
                    />
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
                  </div>
                  {fieldErrors.foundedYear && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.foundedYear}</p>
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
                      placeholder="https://company.com"
                      className={`w-full rounded-md border ${fieldErrors.website ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} bg-white px-3 py-1.5 pl-8 text-xs text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:ring-1`}
                    />
                    <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
                  </div>
                  {fieldErrors.website && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.website}</p>
                  )}
                </div>

                <div ref={(el) => { fieldRefs.current.linkedin = el; }}>
                  <label htmlFor="linkedin" className="block text-xs font-semibold text-charcoal mb-1">
                    LinkedIn
                  </label>
                  <div className="relative">
                    <input
                      id="linkedin"
                      type="url"
                      value={linkedin}
                      onChange={(e) => {
                        setLinkedin(e.target.value);
                        if (fieldErrors.linkedin) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.linkedin;
                            return next;
                          });
                        }
                      }}
                      placeholder="https://linkedin.com/..."
                      className={`w-full rounded-md border ${fieldErrors.linkedin ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"} bg-white px-3 py-1.5 pl-8 text-xs text-charcoal placeholder:text-[#A8A199] outline-none transition-all focus:ring-1`}
                    />
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6c0-.88-.72-1.6-1.6-1.6Z"/>
                    </svg>
                  </div>
                  {fieldErrors.linkedin && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.linkedin}</p>
                  )}
                </div>
              </div>
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