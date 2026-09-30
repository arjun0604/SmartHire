import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { useParams, useNavigate, useLocation, Link } from "react-router-dom"
import {
  ArrowLeft,
  Search,
  Building2,
  MapPin,
  Briefcase,
  ChevronRight,
  ChevronDown,
  UserCheck,
  UserX,
  AlertCircle,
  X,
  RotateCcw,
  Users,
  BarChart3,
  Settings,
} from "lucide-react"
import { useAppDispatch, useAppSelector } from "../store"
import { fetchJobByIdThunk } from "../store/slices/jobsSlice"
import { fetchJobApplicationsThunk, updateApplicationStatusThunk } from "../store/slices/applicationsSlice"
import { useUser } from "../context/UserContext"
import { AppSidebar } from "../components/app-sidebar"
import { SidebarInset, SidebarProvider } from "../components/ui/sidebar"
import { SiteHeader } from "../components/site-header"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { Skeleton } from "../components/ui/skeleton"
import {
  formatDisplayDate,
  getApplicationStatusBadgeClass,
  getInitials,
} from "../utils/formatters"
import {
  fetchJobAssessmentStatusApi,
  getRecruiterStatusActions,
  type Application,
  type AssessmentStatus,
  type StatusActionConfig,
} from "../utils/api"

export default function JobCandidatesPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { profile, isLoading: isUserLoading } = useUser();

  const navState = location.state as {
    from?: string;
    fromLabel?: string;
    fromPath?: string;
  } | null;

  const backDestination = useMemo(() => {
    if (navState?.fromLabel && navState?.fromPath) {
      return { label: navState.fromLabel, path: navState.fromPath };
    }
    if (navState?.from === "overview") {
      return { label: "Back to Overview", path: "/dashboard?tab=overview" };
    }
    if (navState?.from === "job-details" && navState?.fromPath) {
      return { label: "Back to Job Details", path: navState.fromPath };
    }
    if (navState?.from === "postings") {
      return { label: "Back to Job Postings", path: "/dashboard?tab=postings" };
    }
    return { label: "Back to Candidates", path: "/dashboard?tab=candidates" };
  }, [navState]);

  const recruiterJobs = useAppSelector((state) => state.jobs.recruiterJobs) || [];
  const allJobs = useAppSelector((state) => state.jobs.jobs) || [];
  const allJobApplications = useAppSelector((state) => state.applications.jobApplications) || [];

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [matchRangeFilter, setMatchRangeFilter] = useState<string>("all");
  const [experienceFilter, setExperienceFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("match-desc");

  const [activeMenu, setActiveMenu] = useState<{
    app: Application;
    top: number;
    bottom: number;
    left: number;
    isDropUp: boolean;
  } | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const [rejectingApp, setRejectingApp] = useState<Application | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [assessmentLifecycleStatus, setAssessmentLifecycleStatus] = useState<AssessmentStatus | null>(null);

  const job = useMemo(() => {
    if (!jobId) return null;
    return recruiterJobs.find((j) => j.id === jobId) || allJobs.find((j) => j.id === jobId) || null;
  }, [recruiterJobs, allJobs, jobId]);

  const currentAssessmentStatus = useMemo(() => {
    if (assessmentLifecycleStatus) return assessmentLifecycleStatus;
    const j = job as (typeof job & { assessment_status?: AssessmentStatus; assessmentStatus?: AssessmentStatus }) | null;
    return j?.assessment_status || j?.assessmentStatus || "NOT_STARTED";
  }, [assessmentLifecycleStatus, job]);

  const isAssessmentStarted = useMemo(() => {
    return (
      currentAssessmentStatus === "ACTIVE" ||
      currentAssessmentStatus === "STARTED" ||
      currentAssessmentStatus === "CLOSED"
    );
  }, [currentAssessmentStatus]);

  const applications = useMemo(() => {
    if (!jobId) return [];
    return allJobApplications.filter((a) => a.job_id === jobId);
  }, [allJobApplications, jobId]);

  const loadData = useCallback(async () => {
    if (!jobId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [, , assessmentStatusRes] = await Promise.all([
        dispatch(fetchJobByIdThunk(jobId)).unwrap(),
        dispatch(fetchJobApplicationsThunk(jobId)).unwrap(),
        fetchJobAssessmentStatusApi(jobId).catch(() => null),
      ]);
      if (assessmentStatusRes?.status) {
        setAssessmentLifecycleStatus(assessmentStatusRes.status);
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const res = (err as { response?: { status?: number; data?: { detail?: string } } }).response;
        if (res?.status === 403) {
          setErrorMessage("Access denied: You do not have permission to view candidates for this job opening.");
        } else if (res?.status === 404) {
          setErrorMessage("Job opening not found.");
        } else {
          setErrorMessage(res?.data?.detail || "Failed to load candidates for this job opening.");
        }
      } else {
        setErrorMessage("Failed to load candidates for this job opening.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, jobId]);

  useEffect(() => {
    if (!isUserLoading && profile?.role === "recruiter") {
      loadData();
    }
  }, [isUserLoading, profile?.role, loadData]);

  useEffect(() => {
    if (!activeMenu) return;
    const handleClose = () => setActiveMenu(null);
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.("[data-action-trigger]")) {
        return;
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, [activeMenu]);

  const totalApplications = applications.length;
  const newApplications = useMemo(
    () => applications.filter((a) => a.status === "Applied").length,
    [applications]
  );
  const shortlistedApplications = useMemo(
    () => applications.filter((a) => a.status === "Shortlisted").length,
    [applications]
  );

  const validScores = useMemo(() => {
    return applications
      .map((a) => a.overall_score)
      .filter((s): s is number => typeof s === "number" && !isNaN(s));
  }, [applications]);

  const averageMatch = useMemo(() => {
    if (validScores.length === 0) return null;
    return Math.round(validScores.reduce((acc, score) => acc + score, 0) / validScores.length);
  }, [validScores]);

  const uniqueExperienceOptions = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => {
      if (a.years_experience && a.years_experience.trim()) {
        set.add(a.years_experience.trim());
      }
    });
    return Array.from(set).sort();
  }, [applications]);

  const uniqueLocationOptions = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => {
      if (a.candidate_location && a.candidate_location.trim()) {
        set.add(a.candidate_location.trim());
      }
    });
    return Array.from(set).sort();
  }, [applications]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (app.candidate_name || "").toLowerCase().includes(q);
        const emailMatch = (app.candidate_email || "").toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }

      if (statusFilter !== "All" && app.status !== statusFilter) {
        return false;
      }

      const score = app.overall_score;
      if (matchRangeFilter === "80+") {
        if (score === null || score === undefined || isNaN(Number(score)) || score < 80) return false;
      } else if (matchRangeFilter === "60-79") {
        if (score === null || score === undefined || isNaN(Number(score)) || score < 60 || score >= 80) return false;
      } else if (matchRangeFilter === "<60") {
        if (score === null || score === undefined || isNaN(Number(score)) || score >= 60) return false;
      }

      if (experienceFilter !== "all") {
        if ((app.years_experience || "").trim() !== experienceFilter) return false;
      }

      if (locationFilter !== "all") {
        if ((app.candidate_location || "").trim() !== locationFilter) return false;
      }

      return true;
    });
  }, [applications, searchQuery, statusFilter, matchRangeFilter, experienceFilter, locationFilter]);

  const sortedApplications = useMemo(() => {
    return [...filteredApplications].sort((a, b) => {
      const aScore = typeof a.overall_score === "number" && !isNaN(a.overall_score) ? a.overall_score : null;
      const bScore = typeof b.overall_score === "number" && !isNaN(b.overall_score) ? b.overall_score : null;

      if (sortBy === "match-desc") {
        if (aScore === null && bScore === null) return 0;
        if (aScore === null) return 1;
        if (bScore === null) return -1;
        return bScore - aScore;
      }
      if (sortBy === "match-asc") {
        if (aScore === null && bScore === null) return 0;
        if (aScore === null) return 1;
        if (bScore === null) return -1;
        return aScore - bScore;
      }
      if (sortBy === "date-desc") {
        return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
      }
      if (sortBy === "date-asc") {
        return new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime();
      }
      if (sortBy === "name-asc") {
        return (a.candidate_name || "").localeCompare(b.candidate_name || "");
      }
      if (sortBy === "name-desc") {
        return (b.candidate_name || "").localeCompare(a.candidate_name || "");
      }
      return 0;
    });
  }, [filteredApplications, sortBy]);

  const isFiltered =
    searchQuery.trim() !== "" ||
    statusFilter !== "All" ||
    matchRangeFilter !== "all" ||
    experienceFilter !== "all" ||
    locationFilter !== "all" ||
    sortBy !== "match-desc";

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setMatchRangeFilter("all");
    setExperienceFilter("all");
    setLocationFilter("all");
    setSortBy("match-desc");
  };

  const handleToggleActionMenu = (e: React.MouseEvent<HTMLButtonElement>, app: Application) => {
    e.stopPropagation();
    if (activeMenu?.app.id === app.id) {
      setActiveMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuEstimatedHeight = 140;
    const spaceBelow = window.innerHeight - rect.bottom;
    const isDropUp = spaceBelow < menuEstimatedHeight && rect.top > menuEstimatedHeight;

    setActiveMenu({
      app,
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      left: Math.max(8, rect.right - 176),
      isDropUp,
    });
  };

  const handleStatusChange = async (app: Application, targetStatus: string) => {
    setActiveMenu(null);
    if (targetStatus === "Rejected") {
      setRejectingApp(app);
      setRejectionReason("");
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await dispatch(
        updateApplicationStatusThunk({
          applicationId: app.id,
          status: targetStatus,
          reason: null,
        })
      ).unwrap();
    } catch {
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!rejectingApp) return;
    setIsUpdatingStatus(true);
    try {
      await dispatch(
        updateApplicationStatusThunk({
          applicationId: rejectingApp.id,
          status: "Rejected",
          reason: rejectionReason.trim() || null,
        })
      ).unwrap();
      setRejectingApp(null);
      setRejectionReason("");
    } catch {
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const navigateToApplication = (applicationId: string) => {
    if (!jobId) return;
    navigate(`/candidates/job/${jobId}/application/${applicationId}`, {
      state: {
        from: "job-candidates",
        fromLabel: "Back to Job Candidates",
        fromPath: `/candidates/job/${jobId}`,
        jobId,
        parentFrom: navState?.from,
        parentFromLabel: navState?.fromLabel,
        parentFromPath: navState?.fromPath,
      },
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar activeTab="candidates" />
      <SidebarInset className="bg-cream/40 min-h-screen">
        <SiteHeader title="Candidates" />

        <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:py-8 lg:pl-28 lg:pr-8 w-full min-w-0">
          <div className="border-b border-[#E6E0D6] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => navigate(backDestination.path)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#78716C] hover:text-charcoal transition-colors cursor-pointer group"
                >
                  <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                  <span>{backDestination.label}</span>
                </button>
                {job?.status && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {job.status}
                  </span>
                )}
              </div>
              <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-charcoal tracking-tight truncate">
                {job?.title || "Job Candidates"}
              </h1>
              <div className="flex items-center gap-3 text-xs text-[#78716C] flex-wrap">
                <span className="inline-flex items-center gap-1 font-medium text-charcoal">
                  <Building2 className="size-3.5 text-[#8E877D]" />
                  <Link
                    to={(job?.company_id || (job as any)?.companyId) ? `/company/${job?.company_id || (job as any)?.companyId}` : "/recruiter/company"}
                    className="hover:text-terracotta hover:underline transition-colors"
                  >
                    {job?.company || "Company"}
                  </Link>
                </span>
                {(job?.location || job?.workMode) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5 text-[#8E877D]" />
                    <span>
                      {[job?.location, job?.workMode].filter(Boolean).join(" • ")}
                    </span>
                  </span>
                )}
                {job?.employmentType && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="size-3.5 text-[#8E877D]" />
                    <span>{job.employmentType}</span>
                  </span>
                )}
              </div>
            </div>

            {jobId && (
              isAssessmentStarted ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/recruiter/jobs/${jobId}/assessment/results`, {
                      state: {
                        from: "job-candidates",
                        fromLabel: "Back to Job Candidates",
                        fromPath: `/candidates/job/${jobId}`,
                      },
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-charcoal text-xs font-semibold shadow-3xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <BarChart3 className="size-3.5 text-terracotta" />
                  <span>Assessment Results</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/recruiter/jobs/${jobId}/questions`, {
                      state: {
                        from: "job-candidates",
                        fromLabel: "Back to Job Candidates",
                        fromPath: `/candidates/job/${jobId}`,
                      },
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-charcoal text-xs font-semibold shadow-3xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Settings className="size-3.5 text-terracotta" />
                  <span>Configure Assessment</span>
                </button>
              )
            )}
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-2xl border border-[#E6E0D6] bg-white p-4.5 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-2.5 w-28" />
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-[#E6E0D6] bg-white p-4 space-y-3">
                <div className="flex flex-wrap gap-3">
                  <Skeleton className="h-9 flex-1 min-w-[200px] rounded-xl" />
                  <Skeleton className="h-9 w-32 rounded-xl" />
                  <Skeleton className="h-9 w-32 rounded-xl" />
                  <Skeleton className="h-9 w-32 rounded-xl" />
                </div>
              </div>

              <div className="rounded-2xl border border-[#E6E0D6] bg-white overflow-hidden">
                <div className="p-4 border-b border-[#E6E0D6]">
                  <Skeleton className="h-5 w-40" />
                </div>
                <div className="divide-y divide-[#F0ECE4]">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-8 w-20 rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-6 flex items-start gap-3">
              <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-charcoal">Unable to Load Job Candidates</h3>
                <p className="text-xs text-[#78716C]">{errorMessage}</p>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => loadData()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(backDestination.path)}
                    className="text-xs font-semibold text-[#78716C] hover:text-charcoal transition-colors cursor-pointer"
                  >
                    <span>{backDestination.label}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="rounded-2xl border border-[#E6E0D6] bg-white p-4.5 shadow-2xs transition-shadow hover:shadow-xs">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#78716C] block">
                    Applications
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
                      {totalApplications}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8E877D] mt-1 block">
                    Total candidates received
                  </span>
                </div>

                <div className="rounded-2xl border border-[#E6E0D6] bg-white p-4.5 shadow-2xs transition-shadow hover:shadow-xs">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#78716C] block">
                    New
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
                      {newApplications}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8E877D] mt-1 block">
                    Awaiting initial review
                  </span>
                </div>

                <div className="rounded-2xl border border-[#E6E0D6] bg-white p-4.5 shadow-2xs transition-shadow hover:shadow-xs">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#78716C] block">
                    Average Match
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
                      {averageMatch !== null ? `${averageMatch}%` : "—"}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8E877D] mt-1 block">
                    {validScores.length > 0 ? `From ${validScores.length} scored candidates` : "No valid scores yet"}
                  </span>
                </div>

                <div className="rounded-2xl border border-[#E6E0D6] bg-white p-4.5 shadow-2xs transition-shadow hover:shadow-xs">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#78716C] block">
                    Shortlisted
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
                      {shortlistedApplications}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8E877D] mt-1 block">
                    Moved to next round
                  </span>
                </div>
              </div>

              {totalApplications === 0 ? (
                <div className="rounded-2xl border border-[#E6E0D6] bg-white p-12 text-center shadow-2xs space-y-3">
                  <div className="mx-auto size-12 rounded-full bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-center text-[#8E877D]">
                    <Users className="size-6 text-[#78716C]" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-charcoal">No Applications Yet</h3>
                  <p className="text-xs text-[#78716C] max-w-md mx-auto">
                    This position has not received any applications yet. When candidates apply, their match reports, profile details, and recruitment workflow actions will appear here.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => navigate(backDestination.path)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E0D6] px-4 py-2 text-xs font-semibold text-charcoal hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>{backDestination.label}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#E6E0D6] bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8E877D]" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search candidates by name or email..."
                          className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] text-xs text-charcoal placeholder:text-[#A8A199] focus:outline-none focus:ring-1 focus:ring-terracotta focus:bg-white transition-all"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E877D] hover:text-charcoal cursor-pointer"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] p-0.5 text-xs font-medium">
                          {(["All", "Applied", "Screening", "Shortlisted", "Rejected"] as const).map((status) => {
                            const isSelected = statusFilter === status;
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => setStatusFilter(status)}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${isSelected
                                    ? "bg-white text-charcoal font-semibold shadow-3xs"
                                    : "text-[#78716C] hover:text-charcoal"
                                  }`}
                              >
                                {status}
                              </button>
                            );
                          })}
                        </div>

                        {isFiltered && (
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-terracotta hover:text-terracotta-dark transition-colors cursor-pointer"
                          >
                            <RotateCcw className="size-3" />
                            <span>Reset</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#F0ECE4]">
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#8E877D] mb-1">
                          Match Range
                        </label>
                        <select
                          value={matchRangeFilter}
                          onChange={(e) => setMatchRangeFilter(e.target.value)}
                          className="w-full rounded-lg border border-[#E6E0D6] bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-terracotta cursor-pointer"
                        >
                          <option value="all">All Matches</option>
                          <option value="80+">80% and above</option>
                          <option value="60-79">60% to 79%</option>
                          <option value="<60">Below 60%</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#8E877D] mb-1">
                          Experience
                        </label>
                        <select
                          value={experienceFilter}
                          onChange={(e) => setExperienceFilter(e.target.value)}
                          className="w-full rounded-lg border border-[#E6E0D6] bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-terracotta cursor-pointer"
                        >
                          <option value="all">All Experience</option>
                          {uniqueExperienceOptions.map((exp) => (
                            <option key={exp} value={exp}>
                              {exp}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#8E877D] mb-1">
                          Location
                        </label>
                        <select
                          value={locationFilter}
                          onChange={(e) => setLocationFilter(e.target.value)}
                          className="w-full rounded-lg border border-[#E6E0D6] bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-terracotta cursor-pointer"
                        >
                          <option value="all">All Locations</option>
                          {uniqueLocationOptions.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#8E877D] mb-1">
                          Sort By
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full rounded-lg border border-[#E6E0D6] bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-terracotta cursor-pointer"
                        >
                          <option value="match-desc">Match: High to Low</option>
                          <option value="match-asc">Match: Low to High</option>
                          <option value="date-desc">Applied: Newest First</option>
                          <option value="date-asc">Applied: Oldest First</option>
                          <option value="name-asc">Candidate: A to Z</option>
                          <option value="name-desc">Candidate: Z to A</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {sortedApplications.length === 0 ? (
                    <div className="rounded-2xl border border-[#E6E0D6] bg-white p-10 text-center shadow-2xs space-y-2">
                      <p className="font-serif text-base font-bold text-charcoal">No matching candidates</p>
                      <p className="text-xs text-[#78716C] max-w-sm mx-auto">
                        No candidates match the active filter criteria. Try adjusting your search query or reset filters.
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E0D6] px-3.5 py-1.5 text-xs font-semibold text-charcoal hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                        >
                          <RotateCcw className="size-3" />
                          <span>Reset Filters</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#E6E0D6] bg-white shadow-2xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#E6E0D6] bg-[#FAF8F5] text-[11px] font-mono font-semibold uppercase tracking-wider text-[#78716C]">
                              <th className="py-3 px-4 sm:px-5">Candidate</th>
                              <th className="py-3 px-4">Match</th>
                              <th className="py-3 px-4">Assessment</th>
                              <th className="py-3 px-4">Experience</th>
                              <th className="py-3 px-4">Location</th>
                              <th className="py-3 px-4">Applied</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 sm:px-5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F0ECE4]">
                            {sortedApplications.map((app) => {
                              const score = app.overall_score;
                              const hasScore = typeof score === "number" && !isNaN(score);
                              const statusActions = getRecruiterStatusActions(app.status);

                              return (
                                <tr
                                  key={app.id}
                                  className="hover:bg-[#FAF8F5]/80 transition-colors group"
                                >
                                  <td className="py-3 px-4 sm:px-5">
                                    <div
                                      onClick={() => navigateToApplication(app.id)}
                                      className="flex items-center gap-3 cursor-pointer"
                                    >
                                      <Avatar className="size-9 border border-[#E6E0D6] shrink-0">
                                        <AvatarFallback className="bg-sand/30 font-serif text-xs font-semibold text-charcoal">
                                          {getInitials(app.candidate_name || "Candidate")}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <div className="font-semibold text-charcoal text-xs sm:text-sm group-hover:text-terracotta transition-colors truncate">
                                          {app.candidate_name || "Unnamed Candidate"}
                                        </div>
                                        <div className="text-[11px] text-[#78716C] truncate max-w-[200px] sm:max-w-xs">
                                          {app.candidate_email || app.current_job_title || "No email provided"}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="py-3 px-4 whitespace-nowrap">
                                    {hasScore ? (
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${score >= 80
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                            : score >= 60
                                              ? "bg-amber-50 text-amber-800 border-amber-200"
                                              : "bg-stone-100 text-stone-700 border-stone-200"
                                          }`}
                                      >
                                        {Math.round(score)}%
                                      </span>
                                    ) : (
                                      <span className="text-xs font-medium text-[#A8A199]">—</span>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 whitespace-nowrap">
                                    {app.require_assessment ? (
                                      !isAssessmentStarted ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            navigate(`/recruiter/jobs/${jobId}/questions`, {
                                              state: {
                                                from: "job-candidates",
                                                fromLabel: "Back to Job Candidates",
                                                fromPath: `/candidates/job/${jobId}`,
                                              },
                                            })
                                          }
                                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200 transition-colors cursor-pointer"
                                          title="Configure Assessment"
                                        >
                                          Configure Assessment
                                        </button>
                                      ) : app.assessment_status === "Completed" ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            navigate(`/recruiter/jobs/${jobId}/assessment/results`, {
                                              state: {
                                                from: "job-candidates",
                                                fromLabel: "Back to Job Candidates",
                                                fromPath: `/candidates/job/${jobId}`,
                                              },
                                            })
                                          }
                                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer"
                                          title="View Assessment Results"
                                        >
                                          {app.assessment_score}/{app.assessment_total_questions} ({app.assessment_percentage}%)
                                        </button>
                                      ) : app.assessment_status === "In Progress" ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            navigate(`/recruiter/jobs/${jobId}/assessment/results`, {
                                              state: {
                                                from: "job-candidates",
                                                fromLabel: "Back to Job Candidates",
                                                fromPath: `/candidates/job/${jobId}`,
                                              },
                                            })
                                          }
                                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                                          title="View Assessment Results"
                                        >
                                          In Progress
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            navigate(`/recruiter/jobs/${jobId}/assessment/results`, {
                                              state: {
                                                from: "job-candidates",
                                                fromLabel: "Back to Job Candidates",
                                                fromPath: `/candidates/job/${jobId}`,
                                              },
                                            })
                                          }
                                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200 transition-colors cursor-pointer"
                                          title="View Assessment Results"
                                        >
                                          Not Started
                                        </button>
                                      )
                                    ) : (
                                      <span className="text-xs font-medium text-[#A8A199]">—</span>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 whitespace-nowrap text-charcoal font-medium">
                                    {app.years_experience || "—"}
                                  </td>

                                  <td className="py-3 px-4 text-[#78716C] max-w-[160px] truncate">
                                    {app.candidate_location || "—"}
                                  </td>

                                  <td className="py-3 px-4 whitespace-nowrap text-[#78716C]">
                                    {formatDisplayDate(app.applied_at)}
                                  </td>

                                  <td className="py-3 px-4 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${getApplicationStatusBadgeClass(
                                        app.status
                                      )}`}
                                    >
                                      {app.status}
                                    </span>
                                  </td>

                                  <td className="py-3 px-4 sm:px-5 whitespace-nowrap text-right">
                                    <div className="inline-flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => navigateToApplication(app.id)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-[#E6E0D6] bg-white px-2.5 py-1.5 text-xs font-medium text-charcoal hover:bg-[#FAF8F5] transition-colors cursor-pointer shadow-3xs"
                                      >
                                        <span>Review</span>
                                        <ChevronRight className="size-3.5 text-[#8E877D]" />
                                      </button>

                                      {statusActions.length > 0 && (
                                        <button
                                          type="button"
                                          data-action-trigger={app.id}
                                          onClick={(e) => handleToggleActionMenu(e, app)}
                                          className="inline-flex items-center gap-1 rounded-lg border border-[#E6E0D6] bg-white px-2 py-1.5 text-xs font-medium text-[#78716C] hover:text-charcoal hover:bg-[#FAF8F5] transition-colors cursor-pointer shadow-3xs"
                                        >
                                          <span>Action</span>
                                          <ChevronDown
                                            className={`size-3 text-[#8E877D] transition-transform ${
                                              activeMenu?.app.id === app.id ? "rotate-180" : ""
                                            }`}
                                          />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="border-t border-[#E6E0D6] bg-[#FAF8F5] px-4 py-2.5 flex items-center justify-between text-xs text-[#78716C]">
                        <span>
                          Showing <span className="font-semibold text-charcoal">{sortedApplications.length}</span> of{" "}
                          <span className="font-semibold text-charcoal">{totalApplications}</span> applicants
                        </span>
                        {isFiltered && (
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="font-semibold text-terracotta hover:text-terracotta-dark transition-colors cursor-pointer"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </SidebarInset>

      {rejectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E6E0D6] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-charcoal">Reject Application</h3>
                <p className="text-xs text-[#78716C] mt-1">
                  Rejecting {rejectingApp.candidate_name || "this candidate"} is permanent. You can optionally include a rejection reason.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRejectingApp(null);
                  setRejectionReason("");
                }}
                className="rounded-full p-1.5 text-[#8E877D] hover:text-charcoal hover:bg-[#FAF8F5] cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="rejectionReasonInput" className="text-xs font-semibold text-charcoal block">
                Rejection Reason (Optional)
              </label>
              <textarea
                id="rejectionReasonInput"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Seeking candidate with more senior experience in distributed systems..."
                className="w-full rounded-xl border border-[#E6E0D6] p-3 text-xs text-charcoal placeholder:text-[#A8A199] focus:outline-none focus:ring-1 focus:ring-terracotta resize-none bg-[#FAF8F5]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingApp(null);
                  setRejectionReason("");
                }}
                disabled={isUpdatingStatus}
                className="rounded-lg border border-[#E6E0D6] px-3.5 py-2 text-xs font-medium text-charcoal hover:bg-[#FAF8F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={isUpdatingStatus}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer"
              >
                {isUpdatingStatus ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeMenu && typeof document !== "undefined" && createPortal(
        <div
          ref={actionMenuRef}
          style={{
            position: "fixed",
            top: activeMenu.isDropUp ? "auto" : `${activeMenu.top}px`,
            bottom: activeMenu.isDropUp ? `${activeMenu.bottom}px` : "auto",
            left: `${activeMenu.left}px`,
            zIndex: 9999,
          }}
          className="w-44 rounded-xl border border-[#E6E0D6] bg-white p-1 shadow-xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {getRecruiterStatusActions(activeMenu.app.status).map((action: StatusActionConfig) => {
            const isDanger = action.variant === "danger";
            return (
              <button
                key={action.targetStatus}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange(activeMenu.app, action.targetStatus);
                  setActiveMenu(null);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
                  isDanger
                    ? "text-rose-700 hover:bg-rose-50"
                    : "text-charcoal hover:bg-[#FAF8F5]"
                }`}
              >
                {isDanger ? (
                  <UserX className="size-3.5 text-rose-500 shrink-0" />
                ) : (
                  <UserCheck className="size-3.5 text-emerald-600 shrink-0" />
                )}
                <span className="truncate">{action.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </SidebarProvider>
  );
}
