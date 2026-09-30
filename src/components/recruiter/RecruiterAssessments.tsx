import { useState, useEffect, useMemo } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  Building2,
  MapPin,
  ArrowUpRight,
  Search,
  ClipboardCheck,
  Play,
  XCircle,
  RotateCcw,
} from "lucide-react"
import { useAppDispatch, useAppSelector } from "../../store"
import { fetchRecruiterJobsThunk } from "../../store/slices/jobsSlice"
import {
  fetchJobAssessmentStatusApi,
  activateJobAssessmentApi,
  closeJobAssessmentApi,
  type AssessmentStatus,
} from "../../utils/api"
import { Skeleton } from "../ui/skeleton"

interface JobAssessmentStats {
  count: number;
  status: AssessmentStatus;
  canActivate: boolean;
  canClose: boolean;
  isLoading: boolean;
  isActionLoading?: boolean;
  error?: string | null;
  validationMessage?: string | null;
}

function getStatusLabel(status: AssessmentStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "CONFIGURED":
      return "Configured";
    case "STARTED":
      return "Started";
    case "CLOSED":
      return "Closed";
    case "NOT_STARTED":
    default:
      return "Not Started";
  }
}

function getStatusBadgeClasses(status: AssessmentStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "CONFIGURED":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "STARTED":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "CLOSED":
      return "bg-stone-100 text-stone-700 border-stone-200";
    case "NOT_STARTED":
    default:
      return "bg-[#F5F2EB] text-[#78716C] border-[#E6E0D6]";
  }
}

export function RecruiterAssessments() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const recruiterJobs = useAppSelector((state) => state.jobs.recruiterJobs);
  const isRecruiterLoading = useAppSelector((state) => state.jobs.isRecruiterLoading);

  const [statsMap, setStatsMap] = useState<Record<string, JobAssessmentStats>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AssessmentStatus>("all");

  useEffect(() => {
    if (recruiterJobs.length === 0 && !isRecruiterLoading) {
      dispatch(fetchRecruiterJobsThunk());
    }
  }, [dispatch, recruiterJobs.length, isRecruiterLoading]);

  useEffect(() => {
    if (recruiterJobs.length === 0) return;

    let isSubscribed = true;

    async function loadStats() {
      const updates: Record<string, JobAssessmentStats> = {};

      await Promise.all(
        recruiterJobs.map(async (job) => {
          try {
            const data = await fetchJobAssessmentStatusApi(job.id);
            updates[job.id] = {
              count: data.question_count,
              status: data.status,
              canActivate: data.can_activate,
              canClose: data.can_close,
              isLoading: false,
              validationMessage: data.validation_message,
            };
          } catch (err: any) {
            updates[job.id] = {
              count: 0,
              status: "NOT_STARTED",
              canActivate: false,
              canClose: false,
              isLoading: false,
              error: err?.message || "Failed to load",
            };
          }
        })
      );

      if (isSubscribed) {
        setStatsMap(updates);
      }
    }

    loadStats();

    return () => {
      isSubscribed = false;
    };
  }, [recruiterJobs]);

  const filteredJobs = useMemo(() => {
    return recruiterJobs.filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        (job.company && job.company.toLowerCase().includes(q)) ||
        (job.location && job.location.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const jobStats = statsMap[job.id];
      const currentStatus: AssessmentStatus = jobStats?.status || "NOT_STARTED";

      if (statusFilter !== "all") {
        return currentStatus === statusFilter;
      }
      return true;
    });
  }, [recruiterJobs, searchQuery, statusFilter, statsMap]);

  const summary = useMemo(() => {
    let activeCount = 0;
    let configuredCount = 0;
    let notStartedCount = 0;
    let closedCount = 0;

    for (const job of recruiterJobs) {
      const s = statsMap[job.id];
      const st = s?.status || "NOT_STARTED";
      if (st === "ACTIVE" || st === "STARTED") {
        activeCount++;
      } else if (st === "CONFIGURED") {
        configuredCount++;
      } else if (st === "CLOSED") {
        closedCount++;
      } else {
        notStartedCount++;
      }
    }

    return {
      totalJobs: recruiterJobs.length,
      activeCount,
      configuredCount,
      notStartedCount,
      closedCount,
    };
  }, [recruiterJobs, statsMap]);

  function handleManage(jobId: string, jobTitle: string) {
    navigate(`/recruiter/jobs/${jobId}/questions`, {
      state: {
        from: "assessments",
        fromLabel: "Back to Assessments",
        fromPath: "/dashboard?tab=assessments",
        jobTitle,
      },
    });
  }

  async function handleActivate(jobId: string) {
    setStatsMap((prev) => ({
      ...prev,
      [jobId]: { ...prev[jobId], isActionLoading: true },
    }));

    try {
      const updated = await activateJobAssessmentApi(jobId);
      setStatsMap((prev) => ({
        ...prev,
        [jobId]: {
          ...prev[jobId],
          status: updated.status,
          count: updated.question_count,
          canActivate: updated.can_activate,
          canClose: updated.can_close,
          isActionLoading: false,
        },
      }));
    } catch {
      setStatsMap((prev) => ({
        ...prev,
        [jobId]: { ...prev[jobId], isActionLoading: false },
      }));
    }
  }

  async function handleClose(jobId: string) {
    setStatsMap((prev) => ({
      ...prev,
      [jobId]: { ...prev[jobId], isActionLoading: true },
    }));

    try {
      const updated = await closeJobAssessmentApi(jobId);
      setStatsMap((prev) => ({
        ...prev,
        [jobId]: {
          ...prev[jobId],
          status: updated.status,
          count: updated.question_count,
          canActivate: updated.can_activate,
          canClose: updated.can_close,
          isActionLoading: false,
        },
      }));
    } catch {
      setStatsMap((prev) => ({
        ...prev,
        [jobId]: { ...prev[jobId], isActionLoading: false },
      }));
    }
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-2xs">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#78716C] block">
            Total Roles
          </span>
          <span className="text-2xl sm:text-3xl font-serif font-bold text-charcoal mt-1 block">
            {summary.totalJobs}
          </span>
          <span className="text-xs text-[#78716C] mt-0.5 block truncate">
            Active job postings available for assessment
          </span>
        </div>

        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-2xs">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#78716C] block">
            Active Assessments
          </span>
          <span className="text-2xl sm:text-3xl font-serif font-bold text-emerald-800 mt-1 block">
            {summary.activeCount}
          </span>
          <span className="text-xs text-[#78716C] mt-0.5 block truncate">
            Screening assessments currently live for candidates
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#F0ECE4] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-terracotta font-semibold">
                Question Bank Directory
              </span>
            </div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal mt-0.5">
              Role Assessments
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Control the candidate screening lifecycle, manage questions, and activate assessments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-auto">
            <div className="inline-flex rounded-xl bg-cream/70 p-1 border border-[#E6E0D6] text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-white text-charcoal shadow-3xs"
                    : "text-[#78716C] hover:text-charcoal"
                }`}
              >
                All ({recruiterJobs.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === "ACTIVE"
                    ? "bg-white text-emerald-800 shadow-3xs font-semibold"
                    : "text-[#78716C] hover:text-charcoal"
                }`}
              >
                Active ({summary.activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("CONFIGURED")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === "CONFIGURED"
                    ? "bg-white text-amber-800 shadow-3xs font-semibold"
                    : "text-[#78716C] hover:text-charcoal"
                }`}
              >
                Configured ({summary.configuredCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("NOT_STARTED")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === "NOT_STARTED"
                    ? "bg-white text-charcoal shadow-3xs font-semibold"
                    : "text-[#78716C] hover:text-charcoal"
                }`}
              >
                Not Started ({summary.notStartedCount})
              </button>
              {summary.closedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("CLOSED")}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    statusFilter === "CLOSED"
                      ? "bg-white text-stone-700 shadow-3xs font-semibold"
                      : "text-[#78716C] hover:text-charcoal"
                  }`}
                >
                  Closed ({summary.closedCount})
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8E877D]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assessments by job title, department, or location..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] text-xs sm:text-sm text-charcoal placeholder-[#8E877D] focus:outline-hidden focus:border-terracotta focus:bg-white transition-colors"
          />
        </div>

        {isRecruiterLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="border border-[#E6E0D6] rounded-xl p-5 bg-white space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-6 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
                <div className="pt-3 border-t border-[#F0ECE4] flex items-center justify-between">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-8 w-32 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : recruiterJobs.length === 0 ? (
          <div className="py-12 px-4 text-center border border-dashed border-[#D6CEC2] rounded-2xl bg-cream/30 space-y-3">
            <div className="size-12 rounded-full bg-white border border-[#E6E0D6] shadow-2xs mx-auto flex items-center justify-center text-terracotta">
              <ClipboardCheck className="size-6" />
            </div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-charcoal">
              No Job Postings Found
            </h3>
            <p className="text-xs sm:text-sm text-[#78716C] max-w-md mx-auto leading-relaxed">
              Create a job posting to configure its automated MCQ assessment and question bank.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard?tab=postings")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-terracotta text-white text-xs font-semibold shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer"
              >
                <span>Go to Job Postings</span>
                <ArrowUpRight className="size-3.5" />
              </button>
            </div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <p className="text-xs sm:text-sm font-semibold text-charcoal">
              No matching job assessments found
            </p>
            <p className="text-xs text-[#78716C]">
              Try changing your search terms or filtering by a different status.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {filteredJobs.map((job) => {
              const jobStats = statsMap[job.id];
              const questionCount = jobStats?.count || 0;
              const status: AssessmentStatus = jobStats?.status || "NOT_STARTED";
              const isActionLoading = !!jobStats?.isActionLoading;

              return (
                <div
                  key={job.id}
                  onClick={() => handleManage(job.id, job.title)}
                  className="rounded-xl border border-[#E6E0D6] bg-white p-5 shadow-2xs hover:border-terracotta/40 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-terracotta shrink-0" />
                        <span className="text-[11px] font-mono text-[#78716C] uppercase">
                          Assessment Type: MCQ
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadgeClasses(
                          status
                        )}`}
                      >
                        {getStatusLabel(status)}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-charcoal leading-snug">
                        {job.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#78716C]">
                        {job.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="size-3.5 text-[#8E877D]" />
                            <Link
                              to={(job.company_id || (job as any).companyId) ? `/company/${job.company_id || (job as any).companyId}` : "/recruiter/company"}
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium text-[#78716C] hover:text-terracotta hover:underline transition-colors cursor-pointer"
                            >
                              {job.company}
                            </Link>
                          </span>
                        )}
                        {job.location && (
                          <>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3.5 text-[#8E877D]" />
                              <span>{job.location}</span>
                            </span>
                          </>
                        )}
                        {job.workMode && (
                          <>
                            <span>&bull;</span>
                            <span>{job.workMode}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-cream/40 border border-[#E6E0D6] text-xs flex items-center justify-between">
                      <span className="text-[#78716C]">Question Bank</span>
                      <span className="font-semibold text-charcoal">
                        {jobStats?.isLoading
                          ? "Loading..."
                          : questionCount > 0
                          ? `${questionCount} ${questionCount === 1 ? "question" : "questions"} configured`
                          : "No questions added yet"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#F0ECE4] flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-[#78716C]">
                      {status === "ACTIVE"
                        ? "Live for eligible candidates"
                        : status === "STARTED"
                        ? "Candidates in progress"
                        : status === "CLOSED"
                        ? "Assessment access closed"
                        : status === "CONFIGURED"
                        ? "Ready for activation"
                        : "Requires question configuration"}
                    </span>

                    <div className="flex items-center gap-2">
                      {status === "CONFIGURED" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivate(job.id);
                          }}
                          disabled={isActionLoading || !jobStats?.canActivate}
                          title={!jobStats?.canActivate ? (jobStats?.validationMessage || "Configuration required before activation") : undefined}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Play className="size-3.5" />
                          <span>{isActionLoading ? "..." : "Activate"}</span>
                        </button>
                      )}

                      {(status === "ACTIVE" || status === "STARTED") && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClose(job.id);
                          }}
                          disabled={isActionLoading}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-charcoal text-xs font-semibold shadow-3xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="size-3.5 text-stone-500" />
                          <span>{isActionLoading ? "..." : "Close"}</span>
                        </button>
                      )}

                      {status === "CLOSED" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivate(job.id);
                          }}
                          disabled={isActionLoading || !jobStats?.canActivate}
                          title={!jobStats?.canActivate ? (jobStats?.validationMessage || "Configuration required before reopening") : undefined}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-charcoal text-xs font-semibold shadow-3xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="size-3.5 text-terracotta" />
                          <span>{isActionLoading ? "..." : "Reopen"}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleManage(job.id, job.title);
                        }}
                        className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          status === "CONFIGURED"
                            ? "border border-[#E6E0D6] bg-white hover:bg-cream text-charcoal shadow-3xs"
                            : "bg-terracotta text-white shadow-2xs hover:bg-terracotta-dark"
                        }`}
                      >
                        <span>Manage Assessment</span>
                        <ArrowUpRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
