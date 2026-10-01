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
import {
  normalizeAssessmentStatus,
  getAssessmentStatusLabel,
  getAssessmentStatusBadgeClasses,
  getAssessmentStatusDotClasses,
  getAssessmentStatusDescription,
  ASSESSMENT_STATUS_FILTER_OPTIONS,
} from "../../utils/assessmentStatus"
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

export function RecruiterAssessments() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const recruiterJobs = useAppSelector((state) => state.jobs.recruiterJobs);
  const isRecruiterLoading = useAppSelector((state) => state.jobs.isRecruiterLoading);

  const [statsMap, setStatsMap] = useState<Record<string, JobAssessmentStats>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
    const list = recruiterJobs.filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        (job.company && job.company.toLowerCase().includes(q)) ||
        (job.location && job.location.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const jobStats = statsMap[job.id];
      const rawStatus = jobStats?.status || job.assessment_status || "NOT_STARTED";
      const normalized = normalizeAssessmentStatus(rawStatus, job.deadline);

      if (statusFilter !== "all") {
        if (statusFilter === "IN_PROGRESS") {
          return normalized === "IN_PROGRESS" || rawStatus === "ACTIVE" || rawStatus === "STARTED";
        }
        if (statusFilter === "SCHEDULED") {
          return normalized === "SCHEDULED" || rawStatus === "CONFIGURED";
        }
        if (statusFilter === "NOT_STARTED") {
          return normalized === "NOT_STARTED";
        }
        if (statusFilter === "COMPLETED") {
          return normalized === "COMPLETED";
        }
        if (statusFilter === "CLOSED") {
          return normalized === "CLOSED";
        }
        if (statusFilter === "EXPIRED") {
          return normalized === "EXPIRED";
        }
        return normalized === statusFilter || rawStatus === statusFilter;
      }
      return true;
    });

    return list.sort((a, b) => {
      const rawA = a.updated_at || a.updatedAt;
      const rawB = b.updated_at || b.updatedAt;

      const timeA = rawA ? new Date(rawA).getTime() : NaN;
      const timeB = rawB ? new Date(rawB).getTime() : NaN;

      const hasA = !isNaN(timeA);
      const hasB = !isNaN(timeB);

      if (hasA && hasB) {
        return timeB - timeA;
      }
      if (hasA && !hasB) return -1;
      if (!hasA && hasB) return 1;
      return 0;
    });
  }, [recruiterJobs, searchQuery, statusFilter, statsMap]);

  const summary = useMemo(() => {
    let inProgressCount = 0;
    let scheduledCount = 0;
    let notStartedCount = 0;
    let completedCount = 0;
    let closedCount = 0;
    let expiredCount = 0;

    for (const job of recruiterJobs) {
      const s = statsMap[job.id];
      const rawStatus = s?.status || job.assessment_status || "NOT_STARTED";
      const normalized = normalizeAssessmentStatus(rawStatus, job.deadline);

      if (normalized === "IN_PROGRESS") {
        inProgressCount++;
      } else if (normalized === "SCHEDULED") {
        scheduledCount++;
      } else if (normalized === "COMPLETED") {
        completedCount++;
      } else if (normalized === "CLOSED") {
        closedCount++;
      } else if (normalized === "EXPIRED") {
        expiredCount++;
      } else {
        notStartedCount++;
      }
    }

    return {
      totalJobs: recruiterJobs.length,
      inProgressCount,
      scheduledCount,
      notStartedCount,
      completedCount,
      closedCount,
      expiredCount,
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
            In Progress
          </span>
          <span className="text-2xl sm:text-3xl font-serif font-bold text-blue-700 mt-1 block">
            {summary.inProgressCount}
          </span>
          <span className="text-xs text-[#78716C] mt-0.5 block truncate">
            Screening assessments currently active for candidates
          </span>
        </div>

        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-2xs">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#78716C] block">
            Scheduled
          </span>
          <span className="text-2xl sm:text-3xl font-serif font-bold text-purple-700 mt-1 block">
            {summary.scheduledCount}
          </span>
          <span className="text-xs text-[#78716C] mt-0.5 block truncate">
            Configured assessments ready for activation
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

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <label
              htmlFor="assessment-status-filter"
              className="text-xs font-semibold text-[#78716C] whitespace-nowrap"
            >
              Status:
            </label>
            <select
              id="assessment-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-[#E6E0D6] bg-white text-charcoal shadow-3xs focus:outline-hidden focus:border-terracotta focus:ring-1 focus:ring-terracotta/20 cursor-pointer"
            >
              {ASSESSMENT_STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8E877D]" />
            <input
              type="text"
              aria-label="Search assessments"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assessments by job title, department, or location..."
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] text-xs sm:text-sm text-charcoal placeholder-[#8E877D] focus:outline-hidden focus:border-terracotta focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-charcoal cursor-pointer"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
            {ASSESSMENT_STATUS_FILTER_OPTIONS.map((opt) => {
              const count =
                opt.value === "all"
                  ? summary.totalJobs
                  : opt.value === "NOT_STARTED"
                  ? summary.notStartedCount
                  : opt.value === "IN_PROGRESS"
                  ? summary.inProgressCount
                  : opt.value === "SCHEDULED"
                  ? summary.scheduledCount
                  : opt.value === "COMPLETED"
                  ? summary.completedCount
                  : opt.value === "CLOSED"
                  ? summary.closedCount
                  : summary.expiredCount;

              const isSelected = statusFilter === opt.value;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                    isSelected
                      ? "bg-white text-charcoal shadow-3xs border border-[#E6E0D6] font-semibold"
                      : "text-[#78716C] hover:text-charcoal bg-cream/50 hover:bg-cream/80 border border-transparent"
                  }`}
                >
                  {opt.label} ({count})
                </button>
              );
            })}
          </div>
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
              const rawStatus = jobStats?.status || job.assessment_status || "NOT_STARTED";
              const normalized = normalizeAssessmentStatus(rawStatus, job.deadline);
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
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getAssessmentStatusBadgeClasses(
                          rawStatus,
                          job.deadline
                        )}`}
                      >
                        <span className={`size-1.5 rounded-full shrink-0 ${getAssessmentStatusDotClasses(rawStatus, job.deadline)}`} />
                        <span>{getAssessmentStatusLabel(rawStatus, job.deadline)}</span>
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
                      {getAssessmentStatusDescription(rawStatus, job.deadline)}
                    </span>

                    <div className="flex items-center gap-2">
                      {(normalized === "SCHEDULED" || rawStatus === "CONFIGURED") && (
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

                      {(normalized === "IN_PROGRESS" || rawStatus === "ACTIVE" || rawStatus === "STARTED") && (
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

                      {(normalized === "CLOSED" || rawStatus === "CLOSED") && (
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
                          normalized === "SCHEDULED" || rawStatus === "CONFIGURED"
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
