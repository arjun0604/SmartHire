import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  MapPin,
  Calendar,
  Globe,
  Loader2,
  Briefcase,
  Users,
} from "lucide-react"
import { SidebarProvider, SidebarInset } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { SiteHeader } from "../components/site-header"
import { useUser } from "../context/UserContext"
import { fetchCompanyByIdApi, getBackendUrl, type CompanyDetails } from "../utils/api"
import { getInitials } from "../utils/formatters"

export default function CandidateCompanyDetails() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { profile } = useUser();
  const isRecruiter = profile?.role === "recruiter";

  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLogoLoadFailed(false);
    async function loadCompany() {
      if (!companyId) {
        setError("Invalid company identifier.");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchCompanyByIdApi(companyId);
        if (isMounted) {
          setCompany(data);
        }
      } catch {
        if (isMounted) {
          setError("Company not found or has no active listings.");
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
  }, [companyId]);

  const backRoute = isRecruiter ? "/recruiter/jobs" : "/candidate/jobs";
  const sidebarTab = isRecruiter ? "postings" : "jobs";

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar activeTab={sidebarTab} />
        <SidebarInset className="bg-cream/40 min-h-screen">
          <SiteHeader title="Company Details" />
          <div className="flex flex-1 items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-8 border-3 text-terracotta animate-spin" />
              <p className="text-xs text-[#8E877D] font-medium">Loading company details...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (error || !company) {
    return (
      <SidebarProvider>
        <AppSidebar activeTab={sidebarTab} />
        <SidebarInset className="bg-cream/40 min-h-screen">
          <SiteHeader title="Company Details" />
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center min-h-[60vh]">
            <div className="size-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-3">
              <Building2 className="size-6" />
            </div>
            <h2 className="font-serif text-xl font-bold text-charcoal mb-1">Company Not Found</h2>
            <p className="text-xs text-[#78716C] max-w-sm mb-4">
              {error || "The requested company could not be found or has no accessible active job listings."}
            </p>
            <button
              type="button"
              onClick={() => navigate(backRoute)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E0D6] bg-white px-3.5 py-2 text-xs font-semibold text-charcoal hover:bg-cream transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Job Postings</span>
            </button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const activeJobs = company.active_jobs || [];

  return (
    <SidebarProvider>
      <AppSidebar activeTab={sidebarTab} />
      <SidebarInset className="bg-cream/40 min-h-screen">
        <SiteHeader title="Company Details" />

        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:py-8 lg:pl-28 lg:pr-8 w-full min-w-0">
          <div>
            <button
              type="button"
              onClick={() => navigate(backRoute)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#78716C] hover:text-charcoal transition-colors cursor-pointer mb-4 group"
            >
              <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Job Postings</span>
            </button>

            <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-7 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                <div className="flex items-start gap-4">
                  {company.logo_url && !logoLoadFailed ? (
                    <img
                      src={getBackendUrl(company.logo_url)}
                      alt={company.name}
                      onError={() => setLogoLoadFailed(true)}
                      className="size-16 sm:size-20 rounded-2xl border border-[#E6E0D6] bg-cream object-contain p-1 shrink-0"
                    />
                  ) : (
                    <div className="size-16 sm:size-20 rounded-2xl bg-cream border border-[#E6E0D6] flex items-center justify-center text-xl font-bold font-serif text-charcoal shrink-0">
                      {getInitials(company.name)}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {company.industry && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-cream border border-[#E6E0D6] text-charcoal">
                          <Briefcase className="size-3 text-[#8E877D]" />
                          <span>{company.industry}</span>
                        </span>
                      )}
                      {company.company_size && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-cream border border-[#E6E0D6] text-charcoal">
                          <Users className="size-3 text-[#8E877D]" />
                          <span>{company.company_size}</span>
                        </span>
                      )}
                    </div>

                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
                      {company.name}
                    </h1>

                    <div className="flex items-center gap-3 sm:gap-4 text-xs text-[#78716C] mt-2 flex-wrap">
                      {company.headquarters && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5 text-[#8E877D]" />
                          <span>{company.headquarters}</span>
                        </span>
                      )}
                      {company.founded_year && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5 text-[#8E877D]" />
                          <span>Founded {company.founded_year}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E0D6] bg-white px-3 py-1.5 text-xs font-semibold text-charcoal hover:bg-cream transition-colors shadow-3xs"
                    >
                      <Globe className="size-3.5 text-[#8E877D]" />
                      <span>Website</span>
                      <ArrowUpRight className="size-3 text-[#8E877D]" />
                    </a>
                  )}
                  {company.linkedin && (
                    <a
                      href={company.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E0D6] bg-white px-3 py-1.5 text-xs font-semibold text-charcoal hover:bg-cream transition-colors shadow-3xs"
                    >
                      <svg className="size-3.5 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6c0-.88-.72-1.6-1.6-1.6Z"/>
                      </svg>
                      <span>LinkedIn</span>
                      <ArrowUpRight className="size-3 text-[#8E877D]" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0 mt-6">
              <div className="lg:col-span-8 space-y-6">
                <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                  <h2 className="font-sans text-base font-bold text-charcoal mb-3 pb-3 border-b border-[#F0ECE4]">
                    About {company.name}
                  </h2>
                  <p className="text-sm text-[#44403C] leading-relaxed whitespace-pre-line">
                    {company.description || "No description provided for this company."}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F0ECE4]">
                    <div>
                      <h2 className="font-sans text-base font-bold text-charcoal">
                        Open Positions
                      </h2>
                      <p className="text-xs text-[#78716C] mt-0.5">
                        Explore active job opportunities available at {company.name}.
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-terracotta/10 text-terracotta border border-terracotta/20">
                      {activeJobs.length} {activeJobs.length === 1 ? "Opening" : "Openings"}
                    </span>
                  </div>

                  {activeJobs.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-xs text-[#8E877D]">There are currently no open positions listed for this company.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeJobs.map((job) => {
                        const jobPath = isRecruiter ? `/recruiter/jobs/${job.id}` : `/candidate/jobs/${job.id}`;
                        return (
                          <div
                            key={job.id}
                            className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs hover:border-terracotta/40 hover:shadow-xs transition-all flex flex-col justify-between gap-4"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[10.5px] font-mono font-semibold text-terracotta uppercase tracking-wider">
                                  {job.department} &bull; {job.work_mode}
                                </span>
                                <span className="text-[11px] text-[#8E877D]">
                                  {job.posted_date || "Recently"}
                                </span>
                              </div>

                              <h3 className="font-serif text-base font-bold text-charcoal leading-snug">
                                <Link to={jobPath} className="hover:text-terracotta transition-colors">
                                  {job.title}
                                </Link>
                              </h3>

                              <p className="text-xs text-[#78716C] mt-1 flex items-center gap-1.5 flex-wrap">
                                <span>{job.location}</span>
                                <span>&bull;</span>
                                <span>{job.employment_type}</span>
                                <span>&bull;</span>
                                <span>{job.experience_level}</span>
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                              <span className="text-xs font-semibold text-charcoal">
                                {job.salary_min && job.salary_max
                                  ? `₹${job.salary_min} – ₹${job.salary_max}`
                                  : "Competitive"}
                              </span>
                              <Link
                                to={jobPath}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-terracotta hover:text-terracotta-dark transition-colors"
                              >
                                <span>View Job</span>
                                <ArrowUpRight className="size-3.5" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                  <h2 className="font-sans text-base font-bold text-charcoal mb-4 pb-3 border-b border-[#F0ECE4]">
                    Company Overview
                  </h2>

                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#8E877D]">Industry</span>
                      <span className="font-semibold text-charcoal text-right">
                        {company.industry || "Not specified"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F0ECE4]">
                      <span className="text-[#8E877D]">Company Size</span>
                      <span className="font-semibold text-charcoal text-right">
                        {company.company_size || "Not specified"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F0ECE4]">
                      <span className="text-[#8E877D]">Headquarters</span>
                      <span className="font-semibold text-charcoal text-right">
                        {company.headquarters || "Not specified"}
                      </span>
                    </div>

                    {company.founded_year && (
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F0ECE4]">
                        <span className="text-[#8E877D]">Founded Year</span>
                        <span className="font-semibold text-charcoal text-right">
                          {company.founded_year}
                        </span>
                      </div>
                    )}

                    {company.website && (
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F0ECE4]">
                        <span className="text-[#8E877D]">Website</span>
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-terracotta hover:underline truncate max-w-[170px] inline-flex items-center gap-1"
                        >
                          <span className="truncate">{company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                          <ArrowUpRight className="size-3 shrink-0" />
                        </a>
                      </div>
                    )}

                    {company.linkedin && (
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F0ECE4]">
                        <span className="text-[#8E877D]">LinkedIn</span>
                        <a
                          href={company.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#0A66C2] hover:underline truncate max-w-[170px] inline-flex items-center gap-1"
                        >
                          <span>View Profile</span>
                          <ArrowUpRight className="size-3 shrink-0" />
                        </a>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F0ECE4]">
                      <span className="text-[#8E877D]">Active Postings</span>
                      <span className="font-semibold text-charcoal text-right">
                        {activeJobs.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
