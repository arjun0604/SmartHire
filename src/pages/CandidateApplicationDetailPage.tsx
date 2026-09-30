import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom"
import { ArrowLeft, Calendar, AlertCircle, HelpCircle, CheckCircle2, ArrowUpRight } from "lucide-react"
import { useAppDispatch, useAppSelector } from "../store"
import { fetchJobByIdThunk } from "../store/slices/jobsSlice"
import {
  fetchApplicationByIdThunk,
  type Application,
} from "../store/slices/applicationsSlice"
import { useUser } from "../context/UserContext"
import { AppSidebar } from "../components/app-sidebar"
import { SidebarInset, SidebarProvider } from "../components/ui/sidebar"
import { SiteHeader } from "../components/site-header"
import { Skeleton } from "../components/ui/skeleton"
import {
  formatDisplayDate,
  getApplicationStatusBadgeClass,
} from "../utils/formatters"
import {
  fetchApplicationMatchApi,
  fetchApplicationStatusHistoryApi,
  fetchResumeByIdApi,
  getResumeViewUrl,
  fetchMyJobAssessmentAttemptApi,
  type MatchReport,
  type ApplicationStatusHistory,
  type ResumeBackendResponse,
  type CandidateAssessmentMyAttemptResponse,
} from "../utils/api"
import { ApplicationMatchReview } from "../components/common/ApplicationMatchReview"
import { ApplicationOverview } from "../components/common/ApplicationOverview"
import { ApplicationSkills } from "../components/common/ApplicationSkills"
import { ApplicationAnswers } from "../components/common/ApplicationAnswers"
import { SubmittedResume } from "../components/common/SubmittedResume"
import { ApplicationStatusHistorySection } from "../components/common/ApplicationStatusHistory"

export default function CandidateApplicationDetailPage() {
  const { applicationId, jobId: routeJobId } = useParams<{ applicationId: string; jobId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { profile } = useUser();

  const activeTab = searchParams.get("view") === "match" ? "match" : "application";

  const handleTabChange = (tab: "application" | "match") => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === "match") {
          next.set("view", "match");
        } else {
          next.delete("view");
        }
        return next;
      },
      { replace: true }
    );
  };

  const navState = (location.state || {}) as {
    from?: string;
    fromLabel?: string;
    fromPath?: string;
    jobId?: string;
    applicationId?: string;
  };

  const backDestination = useMemo(() => {
    if (navState.from === "overview") {
      return {
        label: navState.fromLabel || "Back to Overview",
        path: navState.fromPath || "/dashboard?tab=overview",
      };
    }
    if (navState.from === "job-details") {
      const jId = navState.jobId || routeJobId;
      return {
        label: navState.fromLabel || "Back to Job Details",
        path: navState.fromPath || (jId ? `/candidate/jobs/${jId}` : "/dashboard?tab=jobs"),
      };
    }
    if (navState.from === "applications") {
      return {
        label: navState.fromLabel || "Back to My Applications",
        path: navState.fromPath || "/dashboard?tab=applications",
      };
    }
    if (navState.fromLabel && navState.fromPath) {
      return {
        label: navState.fromLabel,
        path: navState.fromPath,
      };
    }
    return {
      label: "Back to My Applications",
      path: "/dashboard?tab=applications",
    };
  }, [navState, routeJobId]);

  const handleBack = () => {
    navigate(backDestination.path);
  };

  const storeJobs = useAppSelector((state) => state.jobs.jobs) || [];

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [application, setApplication] = useState<Application | null>(null);
  const [statusHistory, setStatusHistory] = useState<ApplicationStatusHistory[]>([]);
  const [pinnedResume, setPinnedResume] = useState<ResumeBackendResponse | null>(null);

  const [matchReport, setMatchReport] = useState<MatchReport | null>(null);
  const [isMatchLoading, setIsMatchLoading] = useState(false);
  const [matchErrorMessage, setMatchErrorMessage] = useState<string | null>(null);
  const [assessmentAttempt, setAssessmentAttempt] = useState<CandidateAssessmentMyAttemptResponse | null>(null);

  const matchFetchedAppIdRef = useRef<string | null>(null);
  const matchInFlightAppIdRef = useRef<string | null>(null);

  const effectiveJobId = application?.job_id || routeJobId || navState.jobId;
  const job = useMemo(() => {
    if (!effectiveJobId) return null;
    return storeJobs.find((j) => j.id === effectiveJobId) || null;
  }, [storeJobs, effectiveJobId]);

  useEffect(() => {
    if (effectiveJobId) {
      const hasJob = storeJobs.some((j) => j.id === effectiveJobId);
      if (!hasJob) {
        dispatch(fetchJobByIdThunk(effectiveJobId)).catch(() => {});
      }
      fetchMyJobAssessmentAttemptApi(effectiveJobId)
        .then((res) => setAssessmentAttempt(res))
        .catch(() => {});
    }
  }, [dispatch, effectiveJobId, storeJobs]);

  const loadApplicationData = useCallback(async () => {
    if (!applicationId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fetchedApp = await dispatch(fetchApplicationByIdThunk(applicationId)).unwrap();
      setApplication(fetchedApp);

      try {
        const history = await fetchApplicationStatusHistoryApi(applicationId);
        setStatusHistory(history);
      } catch {
        setStatusHistory([]);
      }

      if (fetchedApp.resume_id) {
        try {
          const resDoc = await fetchResumeByIdApi(fetchedApp.resume_id);
          setPinnedResume(resDoc);
        } catch {
          setPinnedResume(null);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Application could not be loaded.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId, dispatch]);

  useEffect(() => {
    loadApplicationData();
  }, [loadApplicationData]);

  const fetchMatch = useCallback(async (appId: string) => {
    if (matchFetchedAppIdRef.current === appId || matchInFlightAppIdRef.current === appId) {
      return;
    }
    matchInFlightAppIdRef.current = appId;
    setIsMatchLoading(true);
    setMatchErrorMessage(null);
    try {
      const report = await fetchApplicationMatchApi(appId);
      setMatchReport(report);
      matchFetchedAppIdRef.current = appId;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load application match.";
      setMatchErrorMessage(msg);
    } finally {
      setIsMatchLoading(false);
      matchInFlightAppIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (applicationId) {
      fetchMatch(applicationId);
    }
  }, [applicationId, fetchMatch]);

  const resumeDownloadUrl = useMemo(() => {
    return getResumeViewUrl(
      pinnedResume?.file_url || application?.resume_url,
      pinnedResume?.parsed_details?.storage_path as string | undefined
    );
  }, [pinnedResume, application]);

  const handleOpenResume = () => {
    if (resumeDownloadUrl) {
      window.open(resumeDownloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  const jobTitle = application?.job_title || job?.title || "Job Opening";
  const companyName = application?.company_name || job?.company || "Company";

  return (
    <SidebarProvider>
      <AppSidebar activeTab="applications" />
      <SidebarInset className="bg-cream/40 min-h-screen">
        <SiteHeader title="Application Detail" />

        <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:py-8 lg:pl-28 lg:pr-8 w-full min-w-0">
          <div className="border-b border-[#E6E0D6] pb-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#78716C] hover:text-charcoal transition-colors cursor-pointer group"
                >
                  <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                  <span>{backDestination.label}</span>
                </button>

                {application?.status && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${getApplicationStatusBadgeClass(
                      application.status
                    )}`}
                  >
                    {application.status}
                  </span>
                )}
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight truncate">
                {jobTitle}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#78716C]">
                <span>
                  Company: <span className="font-semibold text-charcoal">{companyName}</span>
                </span>
                {application?.applied_at && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3.5 text-[#8E877D]" />
                    <span>Applied {formatDisplayDate(application.applied_at)}</span>
                  </span>
                )}
                {typeof application?.overall_score === "number" && !isNaN(application.overall_score) && (
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {Math.round(application.overall_score)}% Match
                  </span>
                )}
              </div>
            </div>
          </div>

          {application?.status?.toLowerCase() === "screening" && (
            <div className="rounded-2xl border border-terracotta/20 bg-gradient-to-r from-terracotta/5 to-amber-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl border ${
                    assessmentAttempt?.attempt_status === "SUBMITTED"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : "bg-terracotta/10 border-terracotta/20 text-terracotta"
                  }`}
                >
                  {assessmentAttempt?.attempt_status === "SUBMITTED" ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <HelpCircle className="size-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal text-sm">
                    {assessmentAttempt?.attempt_status === "SUBMITTED"
                      ? "MCQ Assessment Completed"
                      : assessmentAttempt?.attempt_status === "IN_PROGRESS"
                      ? "MCQ Assessment In Progress"
                      : (assessmentAttempt?.assessment_status === "ACTIVE" || job?.assessment_status === "ACTIVE")
                      ? "Assessment Available"
                      : "Pending Recruiter Activation"}
                  </h3>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    {assessmentAttempt?.attempt_status === "SUBMITTED"
                      ? "Your assessment has been submitted successfully and recorded for the hiring team."
                      : assessmentAttempt?.attempt_status === "IN_PROGRESS"
                      ? `You have an unfinished attempt with ${assessmentAttempt.answered_count || 0} of ${assessmentAttempt.total_questions || 0} questions answered.`
                      : (assessmentAttempt?.assessment_status === "ACTIVE" || job?.assessment_status === "ACTIVE")
                      ? "Complete this assessment as part of the screening process."
                      : "Your application has entered the screening stage. The assessment will become available once the recruiter activates it."}
                  </p>
                </div>
              </div>

              {assessmentAttempt?.attempt_status === "SUBMITTED" ? (
                <div className="flex items-center gap-2.5 shrink-0">
                  {assessmentAttempt.score !== undefined && assessmentAttempt.score !== null && (
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Score: {assessmentAttempt.score} / {assessmentAttempt.total_questions || 0}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shrink-0">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span>Completed</span>
                  </span>
                </div>
              ) : assessmentAttempt?.attempt_status === "IN_PROGRESS" ? (
                <button
                  type="button"
                  onClick={() => navigate(`/candidate/jobs/${effectiveJobId}/assessment`)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-charcoal hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs shrink-0"
                >
                  <span>Resume Assessment</span>
                  <ArrowUpRight className="size-3.5" />
                </button>
              ) : (assessmentAttempt?.can_start || assessmentAttempt?.assessment_status === "ACTIVE" || job?.assessment_status === "ACTIVE") ? (
                <button
                  type="button"
                  onClick={() => navigate(`/candidate/jobs/${effectiveJobId}/assessment`)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-terracotta hover:bg-terracotta-dark text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs shrink-0"
                >
                  <span>Start Assessment</span>
                  <ArrowUpRight className="size-3.5" />
                </button>
              ) : null}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-6">
              <div className="h-10 w-48 rounded-xl bg-white border border-[#E6E0D6] p-1">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
              <div className="rounded-2xl border border-[#E6E0D6] bg-white p-6 space-y-4">
                <Skeleton className="h-4 w-36" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-6 flex items-start gap-3">
              <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-charcoal">Unable to Load Application</h3>
                <p className="text-xs text-[#78716C]">{errorMessage}</p>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => loadApplicationData()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-xs font-semibold text-[#78716C] hover:text-charcoal transition-colors cursor-pointer"
                  >
                    {backDestination.label}
                  </button>
                </div>
              </div>
            </div>
          ) : application ? (
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-xl bg-[#F0ECE4]/70 p-1 border border-[#E6E0D6]">
                <button
                  type="button"
                  onClick={() => handleTabChange("application")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "application"
                      ? "bg-white text-charcoal shadow-2xs"
                      : "text-[#78716C] hover:text-charcoal"
                  }`}
                >
                  Application
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("match")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "match"
                      ? "bg-white text-charcoal shadow-2xs"
                      : "text-[#78716C] hover:text-charcoal"
                  }`}
                >
                  Match Review
                </button>
              </div>

              {activeTab === "application" ? (
                <div className="space-y-6">
                  <ApplicationOverview application={application} />
                  <ApplicationSkills skills={application.skills || application.candidate_skills} />
                  <ApplicationAnswers application={application} />
                  <SubmittedResume
                    resumeName={pinnedResume?.original_filename || application.resume_name}
                    resumeDownloadUrl={resumeDownloadUrl}
                    onViewResume={handleOpenResume}
                  />
                  <ApplicationStatusHistorySection statusHistory={statusHistory} />
                </div>
              ) : (
                <ApplicationMatchReview
                  matchReport={matchReport}
                  isLoading={isMatchLoading}
                  errorMessage={matchErrorMessage}
                  jobTitle={jobTitle}
                  onRetry={() => applicationId && fetchMatch(applicationId)}
                />
              )}
            </div>
          ) : null}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
