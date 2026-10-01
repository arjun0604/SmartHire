import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams, useLocation, useNavigate, Link } from "react-router-dom"
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Users,
  Eye,
  RefreshCw,
  X,
  FileQuestion,
  Sparkles,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { SidebarProvider, SidebarInset } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { SiteHeader } from "../components/site-header"
import { Skeleton } from "../components/ui/skeleton"
import { useAppDispatch, useAppSelector } from "../store"
import { fetchRecruiterJobsThunk } from "../store/slices/jobsSlice"
import {
  fetchJobAssessmentResultsApi,
  fetchCandidateAssessmentDetailResultApi,
  type RecruiterJobAssessmentResultsResponse,
  type RecruiterCandidateAssessmentItem,
  type RecruiterCandidateDetailResultResponse,
  type AssessmentResultsQueryParams,
} from "../utils/api"

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${mins}m ${rem}s`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getAttemptBadge(status?: string | null, badgeClassName?: string) {
  const norm = (status || "").toUpperCase();
  if (norm === "SUBMITTED" || norm === "COMPLETED") {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 max-w-full ${badgeClassName || ""}`}>
        <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
        <span className="truncate">Completed</span>
      </span>
    );
  }
  if (norm === "TIMED_OUT" || norm === "TIMED OUT" || norm === "EXPIRED") {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 max-w-full ${badgeClassName || ""}`}>
        <Clock className="size-3 text-amber-600 shrink-0" />
        <span className="truncate">Timed Out</span>
      </span>
    );
  }
  if (norm === "IN_PROGRESS" || norm === "IN PROGRESS") {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 max-w-full ${badgeClassName || ""}`}>
        <RefreshCw className="size-3 text-blue-600 animate-spin shrink-0" />
        <span className="truncate">In Progress</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200 max-w-full ${badgeClassName || ""}`}>
      <span className="truncate">Not Started</span>
    </span>
  );
}

export default function RecruiterAssessmentResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const recruiterJobs = useAppSelector((state) => state.jobs.recruiterJobs);
  const navState = (location.state as any) || {};

  const [data, setData] = useState<RecruiterJobAssessmentResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search, filter, and pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<RecruiterCandidateAssessmentItem | null>(null);
  const [detailData, setDetailData] = useState<RecruiterCandidateDetailResultResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Load recruiter jobs for role selector if not present
  useEffect(() => {
    if (recruiterJobs.length === 0) {
      dispatch(fetchRecruiterJobsThunk());
    }
  }, [dispatch, recruiterJobs.length]);

  // Debounce search input by 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, minScore, maxScore]);

  const hasActiveFilters = useMemo(() => {
    return (
      debouncedSearch.trim() !== "" ||
      statusFilter !== "all" ||
      minScore.trim() !== "" ||
      maxScore.trim() !== ""
    );
  }, [debouncedSearch, statusFilter, minScore, maxScore]);

  function handleResetFilters() {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setMinScore("");
    setMaxScore("");
    setPage(1);
  }

  const backDestination = useMemo(() => {
    if (navState.fromPath && navState.fromLabel) {
      return { path: navState.fromPath, label: navState.fromLabel };
    }
    if (jobId) {
      return { path: `/recruiter/jobs/${jobId}/questions`, label: "Back to Question Bank" };
    }
    return { path: "/dashboard?tab=assessments", label: "Back to Assessments" };
  }, [navState, jobId]);

  const loadResults = useCallback(async () => {
    if (!jobId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params: AssessmentResultsQueryParams = {
        page,
        limit,
      };
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (minScore.trim() && !isNaN(Number(minScore))) {
        params.min_score = Number(minScore);
      }
      if (maxScore.trim() && !isNaN(Number(maxScore))) {
        params.max_score = Number(maxScore);
      }

      const res = await fetchJobAssessmentResultsApi(jobId, params);
      setData(res);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || "Failed to load assessment results.");
    } finally {
      setIsLoading(false);
    }
  }, [jobId, debouncedSearch, statusFilter, minScore, maxScore, page, limit]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  async function handleOpenDetail(candidate: RecruiterCandidateAssessmentItem) {
    const attemptId = candidate.attempt_id || candidate.assessment_attempt_id;
    if (!jobId || !attemptId) return;
    setSelectedAttemptId(attemptId);
    setSelectedCandidate(candidate);
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await fetchCandidateAssessmentDetailResultApi(jobId, attemptId);
      setDetailData(detail);
    } catch (err: any) {
      setDetailError(err?.response?.data?.detail || "Failed to load candidate assessment breakdown.");
    } finally {
      setIsDetailLoading(false);
    }
  }

  function handleCloseDetail() {
    setSelectedAttemptId(null);
    setSelectedCandidate(null);
    setDetailData(null);
    setDetailError(null);
  }

  const modalStats = useMemo(() => {
    if (!detailData?.questions) {
      return { answered: 0, correct: 0, incorrect: 0, unanswered: 0 };
    }
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    for (const q of detailData.questions) {
      if (q.status === "Correct" || q.is_correct === true) {
        correct++;
      } else if (q.status === "Incorrect" || (q.is_correct === false && (q.candidate_selected_option || q.candidate_selected_text))) {
        incorrect++;
      } else {
        unanswered++;
      }
    }

    return {
      answered: detailData.questions.length - unanswered,
      correct,
      incorrect,
      unanswered,
    };
  }, [detailData]);

  const overviewMetrics = useMemo(() => {
    if (!data?.overview) return null;
    const totalEligible = data.overview.total_eligible ?? 0;
    const started = data.overview.started ?? data.overview.started_count ?? 0;
    const completed = data.overview.completed ?? data.overview.completed_count ?? 0;
    const notStarted = data.overview.not_started ?? data.overview.not_started_count ?? 0;

    const avg = data.overview.average_score;
    const hasAvg = completed > 0 && typeof avg === "number" && !isNaN(avg) && isFinite(avg);

    const compRate = data.overview.completion_rate ?? data.overview.completion_rate_percentage;
    const hasCompRate = typeof compRate === "number" && !isNaN(compRate) && isFinite(compRate);

    return {
      totalEligible,
      started,
      completed,
      notStarted,
      averageScoreDisplay: hasAvg ? `${avg % 1 === 0 ? avg.toFixed(0) : avg}` : "—",
      completionRateDisplay: hasCompRate ? `${compRate % 1 === 0 ? compRate.toFixed(0) : compRate}%` : (totalEligible > 0 ? "0%" : "—"),
    };
  }, [data]);

  const candidateCounts = useMemo(() => {
    if (!data?.candidates) return { started: 0, completed: 0, notStarted: 0 };
    let started = 0;
    let completed = 0;
    let notStarted = 0;

    for (const c of data.candidates) {
      const norm = (c.status || c.attempt_status || "").toUpperCase();
      if (norm === "SUBMITTED" || norm === "COMPLETED" || norm === "TIMED_OUT" || norm === "TIMED OUT") {
        started++;
        completed++;
      } else if (norm === "IN_PROGRESS" || norm === "IN PROGRESS" || c.attempt_id || c.assessment_attempt_id) {
        started++;
      } else {
        notStarted++;
      }
    }

    return { started, completed, notStarted };
  }, [data]);

  return (
    <SidebarProvider>
      <AppSidebar activeTab="assessments" />
      <SidebarInset className="bg-[#FAF8F5] min-h-screen">
        <SiteHeader />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Link
              to={backDestination.path}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#78716C] hover:text-charcoal transition-colors self-start"
            >
              <ArrowLeft className="size-4" />
              <span>{backDestination.label}</span>
            </Link>

            <button
              type="button"
              onClick={loadResults}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-xs font-semibold text-charcoal shadow-3xs transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 text-stone-500 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh Results</span>
            </button>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-2">
              <AlertCircle className="size-6 text-red-600 mx-auto" />
              <h3 className="font-serif text-sm font-bold text-red-900">Failed to load results</h3>
              <p className="text-xs text-red-700">{errorMessage}</p>
            </div>
          )}

          <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-terracotta font-semibold block mb-1">
                Assessment Results &bull; Analytics
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
                {data?.job_title || "Job"} Assessment Results
              </h1>
              <p className="text-xs text-[#78716C] mt-1">
                Review individual candidate performance, completion status, and grading analytics for candidates in the screening stage.
              </p>
            </div>

            {data && (
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="size-2 rounded-full bg-emerald-600" />
                  <span>Status: {data.assessment_status || "Active"}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF8F5] text-charcoal border border-[#E6E0D6]">
                  <FileQuestion className="size-3.5 text-[#8E877D]" />
                  <span>{data.total_questions} Questions</span>
                </span>
                {data.duration_minutes > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF8F5] text-charcoal border border-[#E6E0D6]">
                    <Clock className="size-3.5 text-[#8E877D]" />
                    <span>{data.duration_minutes} Mins</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl border border-[#E6E0D6] bg-white p-4 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-12" />
                </div>
              ))}
            </div>
          ) : overviewMetrics ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-medium text-[#78716C] block">Total Invited</span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-charcoal block">
                  {overviewMetrics.totalEligible}
                </span>
              </div>

              <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-medium text-[#78716C] block">Started</span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-blue-700 block">
                  {overviewMetrics.started}
                </span>
              </div>

              <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-medium text-[#78716C] block">Completed</span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-700 block">
                  {overviewMetrics.completed}
                </span>
              </div>

              <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-medium text-[#78716C] block">Not Started</span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-stone-600 block">
                  {overviewMetrics.notStarted}
                </span>
              </div>

              <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-medium text-[#78716C] block">Average Score</span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-charcoal block">
                  {overviewMetrics.averageScoreDisplay}
                </span>
              </div>

              <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-medium text-[#78716C] block">Completion Rate</span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-terracotta block">
                  {overviewMetrics.completionRateDisplay}
                </span>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-[#E6E0D6] bg-white shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#F0ECE4] flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-charcoal">Candidates</h3>
                <p className="text-xs text-[#78716C]">
                  Screening candidates eligible for this assessment and their attempt records.
                </p>
              </div>
              <span className="text-xs font-mono text-[#78716C]">
                {data?.total !== undefined ? `${data.total} candidate${data.total === 1 ? "" : "s"}` : `${data?.candidates.length || 0} candidate${data?.candidates.length === 1 ? "" : "s"}`}
              </span>
            </div>

            {/* Search and Filters Bar */}
            <div className="p-4 bg-[#FAF8F5]/80 border-b border-[#F0ECE4] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 flex-wrap">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="size-3.5 text-[#8E877D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate name or email..."
                    className="w-full pl-8.5 pr-8 py-1.5 text-xs rounded-lg border border-[#E6E0D6] bg-white text-charcoal placeholder:text-[#8E877D] shadow-3xs focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-charcoal cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E6E0D6] bg-white text-charcoal shadow-3xs focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="not_started">Not Started</option>
                    <option value="passed">Passed (≥ 60%)</option>
                    <option value="failed">Failed (&lt; 60%)</option>
                  </select>
                </div>

                {/* Min/Max Score % */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[#78716C]">Score %:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                    placeholder="Min %"
                    className="w-16 px-2 py-1.5 text-xs rounded-lg border border-[#E6E0D6] bg-white text-charcoal placeholder:text-[#8E877D] shadow-3xs focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta"
                  />
                  <span className="text-[#8E877D] text-xs">–</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    placeholder="Max %"
                    className="w-16 px-2 py-1.5 text-xs rounded-lg border border-[#E6E0D6] bg-white text-charcoal placeholder:text-[#8E877D] shadow-3xs focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta"
                  />
                </div>
              </div>

              {/* Assessment / Role Selection & Reset */}
              <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
                {recruiterJobs.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-[#78716C] hidden sm:inline">Role:</span>
                    <select
                      value={jobId}
                      onChange={(e) => navigate(`/recruiter/jobs/${e.target.value}/assessment/results`)}
                      className="max-w-[200px] truncate px-2.5 py-1.5 text-xs rounded-lg border border-[#E6E0D6] bg-white text-charcoal shadow-3xs focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta cursor-pointer"
                    >
                      {recruiterJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-charcoal text-xs font-semibold shadow-3xs transition-colors cursor-pointer"
                    title="Reset all filters"
                  >
                    <RotateCcw className="size-3 text-stone-500" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : !data?.candidates || data.candidates.length === 0 ? (
              hasActiveFilters ? (
                <div className="p-12 text-center space-y-3">
                  <div className="size-12 rounded-full bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-center mx-auto text-[#8E877D]">
                    <Search className="size-6 text-[#8E877D]" />
                  </div>
                  <h4 className="font-serif text-base font-bold text-charcoal">No matching candidates found</h4>
                  <p className="text-xs text-[#78716C] max-w-md mx-auto leading-relaxed">
                    No assessment results match your current search and filter settings. Try adjusting your criteria or clearing filters.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-xs font-semibold text-charcoal shadow-3xs transition-colors cursor-pointer"
                    >
                      <RotateCcw className="size-3.5 text-stone-500" />
                      <span>Reset Filters</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center space-y-3">
                  <div className="size-12 rounded-full bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-center mx-auto text-[#8E877D]">
                    <Users className="size-6 text-[#8E877D]" />
                  </div>
                  <h4 className="font-serif text-base font-bold text-charcoal">No candidates in screening stage yet</h4>
                  <p className="text-xs text-[#78716C] max-w-md mx-auto leading-relaxed">
                    Candidate assessment results will appear here once candidates in the screening stage start or complete their assessment. Move applicants to the screening stage in the Candidates workflow to grant them access.
                  </p>
                  {jobId && (
                    <div className="pt-2">
                      <Link
                        to={`/candidates/job/${jobId}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-xs font-semibold text-charcoal shadow-3xs transition-colors cursor-pointer"
                      >
                        <span>View Job Candidates</span>
                      </Link>
                    </div>
                  )}
                </div>
              )
            ) : (
              <>
                {candidateCounts.started === 0 && candidateCounts.completed === 0 && (
                  <div className="p-3.5 bg-[#FAF8F5] border-b border-[#F0ECE4] flex items-center gap-2 text-xs text-[#78716C]">
                    <AlertCircle className="size-4 text-terracotta shrink-0" />
                    <span>No candidates have attempted this assessment yet. Results will appear automatically as candidates start and complete their attempts.</span>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#FAF8F5] border-b border-[#E6E0D6] text-[#78716C] uppercase font-mono text-[10px] tracking-wider">
                        <th className="py-3 px-4 font-semibold">Candidate</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold">Score</th>
                        <th className="py-3 px-4 font-semibold">Percentage</th>
                        <th className="py-3 px-4 font-semibold">Time Taken</th>
                        <th className="py-3 px-4 font-semibold">Completed At</th>
                        <th className="py-3 px-4 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0ECE4]">
                      {data.candidates.map((c) => {
                        const norm = (c.status || c.attempt_status || "").toUpperCase();
                        const isCompleted = norm === "SUBMITTED" || norm === "COMPLETED" || norm === "TIMED_OUT" || norm === "TIMED OUT";
                        const isInProgress = !isCompleted && (norm === "IN_PROGRESS" || norm === "IN PROGRESS" || !!c.started_at);

                        return (
                          <tr key={c.candidate_id} className="hover:bg-cream/40 transition-colors">
                            <td className="py-3.5 px-4">
                              {c.application_id ? (
                                <Link
                                  to={`/candidates/job/${jobId}/application/${c.application_id}`}
                                  className="font-semibold text-charcoal hover:text-terracotta hover:underline transition-colors block"
                                >
                                  {c.candidate_name}
                                </Link>
                              ) : (
                                <div className="font-semibold text-charcoal">{c.candidate_name}</div>
                              )}
                              <div className="text-[11px] text-[#8E877D]">{c.candidate_email}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              {getAttemptBadge(c.status || c.attempt_status)}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-medium text-charcoal">
                              {isCompleted && c.score !== null && c.score !== undefined ? `${c.score} / ${c.total_questions}` : "—"}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-charcoal">
                              {isCompleted && typeof c.percentage === "number" && !isNaN(c.percentage) ? `${c.percentage}%` : "—"}
                            </td>
                            <td className="py-3.5 px-4 text-[#78716C] font-mono">
                              {isCompleted ? formatDuration(c.time_taken_seconds) : "—"}
                            </td>
                            <td className="py-3.5 px-4 text-[#78716C]">
                              {isCompleted ? formatDate(c.completed_at) : "—"}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {isCompleted && (c.attempt_id || c.assessment_attempt_id) ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(c)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-charcoal text-xs font-semibold shadow-3xs transition-colors cursor-pointer"
                                >
                                  <Eye className="size-3.5 text-terracotta" />
                                  <span>View Result</span>
                                </button>
                              ) : isInProgress ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200">
                                  <RefreshCw className="size-2.5 animate-spin text-blue-600" />
                                  <span>In Progress</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-stone-400">Not Started</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {data && (data.total ?? data.candidates.length) > 0 && (
                  <div className="p-4 border-t border-[#F0ECE4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#78716C]">
                    <div className="flex items-center gap-2">
                      <span>
                        Showing{" "}
                        <strong className="font-semibold text-charcoal">
                          {(page - 1) * limit + 1}
                        </strong>{" "}
                        to{" "}
                        <strong className="font-semibold text-charcoal">
                          {Math.min(page * limit, data.total ?? data.candidates.length)}
                        </strong>{" "}
                        of{" "}
                        <strong className="font-semibold text-charcoal">
                          {data.total ?? data.candidates.length}
                        </strong>{" "}
                        candidates
                      </span>
                      {data.total_pages && data.total_pages > 1 && (
                        <span className="text-[#8E877D]">&bull; Page {page} of {data.total_pages}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1 || isLoading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-charcoal text-xs font-semibold shadow-3xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="size-3.5" />
                        <span>Previous</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPage((p) => (data.total_pages ? Math.min(data.total_pages, p + 1) : p + 1))}
                        disabled={page >= (data.total_pages || 1) || isLoading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-charcoal text-xs font-semibold shadow-3xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span>Next</span>
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {selectedAttemptId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-[#E6E0D6] shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-5 border-b border-[#F0ECE4] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-terracotta font-semibold block">
                    Candidate Result Breakdown
                  </span>
                  <h3 className="font-serif text-lg font-bold text-charcoal">
                    {selectedCandidate?.application_id ? (
                      <Link
                        to={`/candidates/job/${jobId}/application/${selectedCandidate.application_id}`}
                        className="hover:text-terracotta hover:underline transition-colors"
                      >
                        {detailData?.candidate_name || selectedCandidate?.candidate_name || "Candidate"}
                      </Link>
                    ) : (
                      <span>{detailData?.candidate_name || selectedCandidate?.candidate_name || "Candidate"}</span>
                    )}
                    <span className="text-[#8E877D] font-normal mx-2">&bull;</span>
                    <span className="text-sm font-sans font-medium text-[#78716C]">Assessment Performance</span>
                  </h3>
                  {(detailData?.candidate_email || selectedCandidate?.candidate_email) && (
                    <span className="text-xs text-[#8E877D] block">
                      {detailData?.candidate_email || selectedCandidate?.candidate_email}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="rounded-lg p-1.5 text-stone-400 hover:text-charcoal hover:bg-cream transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-5 flex-1">
                {isDetailLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                  </div>
                ) : detailError ? (
                  <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-center text-xs text-red-700">
                    {detailError}
                  </div>
                ) : detailData ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      <div className="p-2.5 sm:p-3 rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] flex flex-col justify-between min-w-0 overflow-hidden">
                        <span className="text-[10px] text-[#78716C] uppercase font-mono block truncate">Status</span>
                        <div className="my-auto py-1 flex items-center min-w-0">
                          {getAttemptBadge(detailData.status || (detailData as any).attempt_status, "text-[11px] px-2 py-0.5")}
                        </div>
                        <span className="text-[10px] text-transparent select-none block" aria-hidden="true">&nbsp;</span>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] min-w-0">
                        <span className="text-[10px] text-[#78716C] uppercase font-mono block truncate">Overall Score</span>
                        <span className="font-mono text-base font-bold text-charcoal mt-1 block truncate">
                          {detailData.score} / {detailData.total_questions}
                        </span>
                        <span className="text-[10px] font-mono text-terracotta font-semibold block truncate">
                          {typeof detailData.percentage === "number" && !isNaN(detailData.percentage) ? `${detailData.percentage}%` : "—"}
                        </span>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] min-w-0">
                        <span className="text-[10px] text-[#78716C] uppercase font-mono block truncate">Answered</span>
                        <span className="font-mono text-base font-bold text-charcoal mt-1 block truncate">
                          {modalStats.answered} / {detailData.total_questions}
                        </span>
                        <span className="text-[10px] text-[#8E877D] block truncate">questions</span>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 min-w-0">
                        <span className="text-[10px] text-emerald-800 uppercase font-mono block font-semibold truncate">Correct</span>
                        <span className="font-mono text-base font-bold text-emerald-700 mt-1 block truncate">
                          {modalStats.correct}
                        </span>
                        <span className="text-[10px] text-emerald-700/80 block truncate">answers</span>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl border border-red-200 bg-red-50/50 min-w-0">
                        <span className="text-[10px] text-red-800 uppercase font-mono block font-semibold truncate">Incorrect</span>
                        <span className="font-mono text-base font-bold text-red-700 mt-1 block truncate">
                          {modalStats.incorrect}
                        </span>
                        <span className="text-[10px] text-red-700/80 block truncate">answers</span>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl border border-stone-200 bg-stone-50/50 min-w-0">
                        <span className="text-[10px] text-stone-600 uppercase font-mono block font-semibold truncate">Unanswered</span>
                        <span className="font-mono text-base font-bold text-stone-600 mt-1 block truncate">
                          {modalStats.unanswered}
                        </span>
                        <span className="text-[10px] text-stone-500 block truncate">skipped</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-cream/40 border border-[#E6E0D6] flex flex-wrap items-center justify-between gap-3 text-xs text-[#78716C]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-[#8E877D]" />
                        <span>Time Taken: <strong className="font-mono text-charcoal">{formatDuration(detailData.time_taken_seconds)}</strong></span>
                      </div>
                      <div>
                        <span>Submitted: <strong className="text-charcoal">{formatDate(detailData.submitted_at || (detailData as any).completed_at)}</strong></span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif text-sm font-bold text-charcoal">
                          Question Performance Breakdown
                        </h4>
                        <span className="text-xs text-[#78716C] font-mono">
                          {detailData.questions.length} Questions
                        </span>
                      </div>

                      <div className="space-y-3">
                        {detailData.questions.map((q) => {
                          const isCorrect = q.status === "Correct" || q.is_correct === true;
                          const isUnanswered = q.status === "Unanswered" || (!q.candidate_selected_option && !q.candidate_selected_text && q.is_correct == null);
                          const correctText = q.correct_text || (q as any).correct_option_text || "";

                          return (
                            <div
                              key={q.question_number}
                              className={`p-4 rounded-xl border text-xs space-y-2.5 transition-colors ${
                                isUnanswered
                                  ? "border-stone-200 bg-stone-50/60"
                                  : isCorrect
                                  ? "border-emerald-200 bg-emerald-50/30"
                                  : "border-red-200 bg-red-50/30"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono font-bold text-charcoal">
                                  Question {q.question_number} of {detailData.total_questions}
                                </span>

                                {isUnanswered ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-200 text-stone-700">
                                    Unanswered
                                  </span>
                                ) : isCorrect ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 className="size-3 text-emerald-600" />
                                    <span>Correct</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200">
                                    <XCircle className="size-3 text-red-600" />
                                    <span>Incorrect</span>
                                  </span>
                                )}
                              </div>

                              <p className="text-charcoal font-medium text-xs leading-relaxed">
                                {q.question_text}
                              </p>

                              <div className="pt-2 border-t border-stone-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                                <div className="p-2.5 rounded-lg bg-white/80 border border-[#E6E0D6] space-y-0.5">
                                  <span className="text-[#8E877D] font-mono text-[10px] uppercase block">Candidate Answer</span>
                                  <span
                                    className={`font-semibold block ${
                                      isUnanswered
                                        ? "text-stone-400 italic"
                                        : isCorrect
                                        ? "text-emerald-800"
                                        : "text-red-700"
                                    }`}
                                  >
                                    {isUnanswered
                                      ? "No answer provided"
                                      : q.candidate_selected_text
                                      ? `Option ${q.candidate_selected_option}: ${q.candidate_selected_text}`
                                      : `Option ${q.candidate_selected_option}`}
                                  </span>
                                </div>

                                <div className="p-2.5 rounded-lg bg-white/80 border border-emerald-200/80 space-y-0.5">
                                  <span className="text-[#8E877D] font-mono text-[10px] uppercase block">Correct Answer</span>
                                  <span className="font-semibold text-emerald-800 block">
                                    Option {q.correct_option}{correctText ? `: ${correctText}` : ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="p-4 border-t border-[#F0ECE4] flex justify-end">
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="px-4 py-2 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-xs font-semibold text-charcoal transition-colors cursor-pointer shadow-3xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
