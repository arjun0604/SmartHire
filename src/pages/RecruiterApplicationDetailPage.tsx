import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useParams, useNavigate, useLocation, Link } from "react-router-dom"
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  AlertCircle,
  X,
  UserCheck,
  UserX,
  BarChart3,
} from "lucide-react"
import { useAppDispatch, useAppSelector } from "../store"
import { fetchJobByIdThunk } from "../store/slices/jobsSlice"
import {
  fetchApplicationByIdThunk,
  updateApplicationStatusThunk,
  type Application,
} from "../store/slices/applicationsSlice"
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
  getRecruiterStatusActions,
  type MatchReport,
  type ApplicationStatusHistory,
  type ResumeBackendResponse,
} from "../utils/api"
import { ApplicationMatchReview } from "../components/common/ApplicationMatchReview"
import { ApplicationOverview } from "../components/common/ApplicationOverview"
import { ApplicationSkills } from "../components/common/ApplicationSkills"
import { ApplicationAnswers } from "../components/common/ApplicationAnswers"
import { SubmittedResume } from "../components/common/SubmittedResume"
import { ApplicationStatusHistorySection } from "../components/common/ApplicationStatusHistory"

export default function RecruiterApplicationDetailPage() {
  const { jobId, applicationId } = useParams<{ jobId: string; applicationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state || {}) as {
    from?: string;
    fromLabel?: string;
    fromPath?: string;
    jobId?: string;
    applicationId?: string;
    parentFrom?: string;
    parentFromLabel?: string;
    parentFromPath?: string;
  };

  const backDestination = useMemo(() => {
    if (navState.from === "overview") {
      return {
        label: navState.fromLabel || "Back to Overview",
        path: navState.fromPath || "/dashboard?tab=overview",
      };
    }
    if (navState.from === "job-details") {
      return {
        label: navState.fromLabel || "Back to Job Details",
        path: navState.fromPath || (jobId ? `/jobs/${jobId}` : "/dashboard?tab=postings"),
      };
    }
    if (navState.from === "postings") {
      return {
        label: navState.fromLabel || "Back to Job Postings",
        path: navState.fromPath || "/dashboard?tab=postings",
      };
    }
    if (navState.from === "candidates") {
      return {
        label: navState.fromLabel || "Back to Candidates",
        path: navState.fromPath || "/dashboard?tab=candidates",
      };
    }
    if (navState.fromLabel && navState.fromPath) {
      return {
        label: navState.fromLabel,
        path: navState.fromPath,
      };
    }
    return {
      label: "Back to Job Candidates",
      path: jobId ? `/candidates/job/${jobId}` : "/dashboard?tab=candidates",
    };
  }, [navState, jobId]);

  const handleBack = () => {
    if (navState.parentFrom && navState.parentFromPath && backDestination.path.startsWith("/candidates/job/")) {
      navigate(backDestination.path, {
        state: {
          from: navState.parentFrom,
          fromLabel: navState.parentFromLabel,
          fromPath: navState.parentFromPath,
          jobId,
        },
      });
    } else {
      navigate(backDestination.path);
    }
  };
  const dispatch = useAppDispatch();

  const recruiterJobs = useAppSelector((state) => state.jobs.recruiterJobs) || [];
  const allJobs = useAppSelector((state) => state.jobs.jobs) || [];

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"application" | "match">("application");
  const [application, setApplication] = useState<Application | null>(null);
  const [statusHistory, setStatusHistory] = useState<ApplicationStatusHistory[]>([]);
  const [pinnedResume, setPinnedResume] = useState<ResumeBackendResponse | null>(null);

  const [matchReport, setMatchReport] = useState<MatchReport | null>(null);
  const [isMatchLoading, setIsMatchLoading] = useState(false);
  const [matchErrorMessage, setMatchErrorMessage] = useState<string | null>(null);

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const matchFetchedAppIdRef = useRef<string | null>(null);
  const matchInFlightAppIdRef = useRef<string | null>(null);

  const job = useMemo(() => {
    if (!jobId) return null;
    return recruiterJobs.find((j) => j.id === jobId) || allJobs.find((j) => j.id === jobId) || null;
  }, [recruiterJobs, allJobs, jobId]);

  useEffect(() => {
    if (!jobId) return;
    const hasJob = recruiterJobs.some((j) => j.id === jobId) || allJobs.some((j) => j.id === jobId);
    if (!hasJob) {
      dispatch(fetchJobByIdThunk(jobId)).catch(() => {});
    }
  }, [dispatch, jobId, recruiterJobs, allJobs]);

  const loadApplicationData = useCallback(async () => {
    if (!jobId || !applicationId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fetchedApp = await dispatch(fetchApplicationByIdThunk(applicationId)).unwrap();
      if (fetchedApp.job_id !== jobId) {
        setErrorMessage("Application does not belong to this job opening.");
        setIsLoading(false);
        return;
      }
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
      if (err && typeof err === "object" && "response" in err) {
        const res = (err as { response?: { status?: number; data?: { detail?: string } } }).response;
        if (res?.status === 403) {
          setErrorMessage("Access denied: You do not have permission to view this candidate application.");
        } else if (res?.status === 404) {
          setErrorMessage("Candidate application not found.");
        } else {
          setErrorMessage(res?.data?.detail || "Failed to load candidate application.");
        }
      } else if (typeof err === "string") {
        setErrorMessage(err);
      } else {
        setErrorMessage("Failed to load candidate application.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, jobId, applicationId]);

  useEffect(() => {
    loadApplicationData();
  }, [loadApplicationData]);

  const fetchMatch = useCallback(async (appId: string) => {
    if (!appId) return;
    if (matchFetchedAppIdRef.current === appId || matchInFlightAppIdRef.current === appId) {
      return;
    }

    matchInFlightAppIdRef.current = appId;
    setIsMatchLoading(true);
    setMatchErrorMessage(null);

    try {
      const rep = await fetchApplicationMatchApi(appId);
      if (matchInFlightAppIdRef.current === appId) {
        setMatchReport(rep);
        matchFetchedAppIdRef.current = appId;
      }
    } catch (matchErr: any) {
      if (matchInFlightAppIdRef.current === appId) {
        if (matchErr?.response?.status === 404) {
          setMatchReport(null);
          matchFetchedAppIdRef.current = appId;
        } else {
          setMatchErrorMessage("Unable to load match review evaluation.");
        }
      }
    } finally {
      if (matchInFlightAppIdRef.current === appId) {
        matchInFlightAppIdRef.current = null;
        setIsMatchLoading(false);
      }
    }
  }, []);

  const handleRetryMatch = useCallback(() => {
    if (!applicationId) return;
    matchFetchedAppIdRef.current = null;
    matchInFlightAppIdRef.current = null;
    fetchMatch(applicationId);
  }, [applicationId, fetchMatch]);

  useEffect(() => {
    if (applicationId) {
      if (matchFetchedAppIdRef.current !== applicationId && matchInFlightAppIdRef.current !== applicationId) {
        setMatchReport(null);
        setMatchErrorMessage(null);
      }
      fetchMatch(applicationId);
    }
  }, [applicationId, fetchMatch]);

  const handleStatusChange = async (targetStatus: string, reason?: string | null) => {
    if (!application) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await dispatch(
        updateApplicationStatusThunk({
          applicationId: application.id,
          status: targetStatus,
          reason: reason || null,
        })
      ).unwrap();
      setApplication(updated);
      setIsRejectDialogOpen(false);
      setRejectionReason("");

      try {
        const refreshedHistory = await fetchApplicationStatusHistoryApi(application.id);
        setStatusHistory(refreshedHistory);
      } catch {}
    } catch {
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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

  const statusActions = application ? getRecruiterStatusActions(application.status) : [];
  const rejectAction = statusActions.find((a) => a.targetStatus === "Rejected");
  const forwardActions = statusActions.filter((a) => a.targetStatus !== "Rejected");

  const jobTitle = application?.job_title || job?.title || "Job Opening";
  const companyName = application?.company_name || job?.company || "Company";

  return (
    <SidebarProvider>
      <AppSidebar activeTab="candidates" />
      <SidebarInset className="bg-cream/40 min-h-screen">
        <SiteHeader title="Candidate Application" />

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
                {application?.candidate_name || "Candidate Application"}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#78716C]">
                <span>
                  Applied for <span className="font-semibold text-charcoal">{jobTitle}</span> at{" "}
                  <Link
                    to={(job?.company_id || (job as any)?.companyId) ? `/company/${job?.company_id || (job as any)?.companyId}` : "/recruiter/company"}
                    className="font-semibold text-charcoal hover:text-terracotta hover:underline transition-colors"
                  >
                    {companyName}
                  </Link>
                </span>
                {application?.applied_at && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3.5 text-[#8E877D]" />
                    <span>Applied {formatDisplayDate(application.applied_at)}</span>
                  </span>
                )}
                {application?.candidate_id && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/recruiter/candidates/${application.candidate_id}`, {
                        state: {
                          from: "application",
                          fromLabel: "Back to Candidate Application",
                          fromPath: `/candidates/job/${jobId}/application/${applicationId}`,
                          jobId,
                          applicationId,
                          parentFrom: navState.from,
                          parentFromLabel: navState.fromLabel,
                          parentFromPath: navState.fromPath,
                          grandparentFrom: navState.parentFrom,
                          grandparentFromLabel: navState.parentFromLabel,
                          grandparentFromPath: navState.parentFromPath,
                        },
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-terracotta hover:text-terracotta-dark transition-colors cursor-pointer"
                  >
                    <span>View Candidate Profile</span>
                    <ExternalLink className="size-3" />
                  </button>
                )}
                {typeof application?.overall_score === "number" && !isNaN(application.overall_score) && (
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {Math.round(application.overall_score)}% Match
                  </span>
                )}
                {application?.require_assessment && (
                  application.assessment_status === "Completed" ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/recruiter/jobs/${jobId}/assessment/results`, {
                          state: {
                            from: "application",
                            fromLabel: "Back to Candidate Application",
                            fromPath: `/candidates/job/${jobId}/application/${applicationId}`,
                          },
                        })
                      }
                      className="text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer"
                      title="View Assessment Results"
                    >
                      Assessment: {application.assessment_score} / {application.assessment_total_questions} ({application.assessment_percentage}%)
                    </button>
                  ) : application.assessment_status === "In Progress" ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/recruiter/jobs/${jobId}/assessment/results`, {
                          state: {
                            from: "application",
                            fromLabel: "Back to Candidate Application",
                            fromPath: `/candidates/job/${jobId}/application/${applicationId}`,
                          },
                        })
                      }
                      className="text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-colors cursor-pointer"
                      title="View Assessment Results"
                    >
                      Assessment: In Progress
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/recruiter/jobs/${jobId}/assessment/results`, {
                          state: {
                            from: "application",
                            fromLabel: "Back to Candidate Application",
                            fromPath: `/candidates/job/${jobId}/application/${applicationId}`,
                          },
                        })
                      }
                      className="text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded border border-stone-200 transition-colors cursor-pointer"
                      title="View Assessment Results"
                    >
                      Assessment: Not Started
                    </button>
                  )
                )}
              </div>
            </div>

            {application && (
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {application.status === "Rejected" ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      Application Rejected
                    </span>
                    {application.rejection_reason && (
                      <span className="text-xs text-[#78716C] max-w-xs truncate" title={application.rejection_reason}>
                        Reason: {application.rejection_reason}
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    {rejectAction && (
                      <button
                        type="button"
                        onClick={() => {
                          setRejectionReason("");
                          setIsRejectDialogOpen(true);
                        }}
                        disabled={isUpdatingStatus}
                        className="rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100/70 text-red-700 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <UserX className="size-3.5" />
                        <span>Reject Application</span>
                      </button>
                    )}

                    {forwardActions.map((action) => {
                      if (action.variant === "primary") {
                        return (
                          <button
                            key={action.targetStatus}
                            type="button"
                            onClick={() => handleStatusChange(action.targetStatus)}
                            disabled={isUpdatingStatus}
                            className="rounded-xl bg-terracotta px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <UserCheck className="size-3.5" />
                            <span>{action.label}</span>
                          </button>
                        );
                      }
                      return (
                        <button
                          key={action.targetStatus}
                          type="button"
                          onClick={() => handleStatusChange(action.targetStatus)}
                          disabled={isUpdatingStatus}
                          className="rounded-xl border border-[#E6E0D6] bg-white px-3.5 py-2 text-xs font-semibold text-charcoal hover:bg-[#FAF8F5] transition-colors cursor-pointer shadow-3xs"
                        >
                          {action.label}
                        </button>
                      );
                    })}

                    {jobId && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/recruiter/jobs/${jobId}/assessment/results`, {
                            state: {
                              from: "application",
                              fromLabel: "Back to Candidate Application",
                              fromPath: `/candidates/job/${jobId}/application/${applicationId}`,
                            },
                          })
                        }
                        className="rounded-xl border border-[#E6E0D6] bg-white px-3.5 py-2 text-xs font-semibold text-charcoal hover:bg-[#FAF8F5] transition-colors cursor-pointer shadow-3xs inline-flex items-center gap-1.5"
                      >
                        <BarChart3 className="size-3.5 text-terracotta" />
                        <span>Assessment Results</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

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
                <h3 className="text-sm font-semibold text-charcoal">Unable to Load Candidate Application</h3>
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
                  onClick={() => setActiveTab("application")}
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
                  onClick={() => setActiveTab("match")}
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
                  {application.require_assessment && (
                    <section className="rounded-2xl border border-[#E6E0D6] bg-white p-6 sm:p-7 space-y-4 shadow-2xs">
                      <div className="border-b border-[#F0ECE4] pb-2.5 flex items-center justify-between">
                        <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                          MCQ Assessment Results
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            application.assessment_status === "Completed"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : application.assessment_status === "In Progress"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-stone-100 text-stone-700 border-stone-200"
                          }`}
                        >
                          {application.assessment_status || "Not Started"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                        <div>
                          <span className="text-[#8E877D] block font-medium">Status</span>
                          <span className="text-charcoal font-semibold mt-0.5 block">
                            {application.assessment_status || "Not Started"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8E877D] block font-medium">Score</span>
                          <span className="text-charcoal font-semibold mt-0.5 block">
                            {application.assessment_status === "Completed" && application.assessment_total_questions
                              ? `${application.assessment_score} / ${application.assessment_total_questions} (${application.assessment_percentage}%)`
                              : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8E877D] block font-medium">Questions Answered</span>
                          <span className="text-charcoal font-semibold mt-0.5 block">
                            {application.assessment_status === "Completed"
                              ? `${application.assessment_correct_answers} correct`
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </section>
                  )}
                  <ApplicationSkills skills={application.skills} />
                  <ApplicationAnswers application={application} />
                  <SubmittedResume
                    resumeName={pinnedResume?.file_name || application.resume_name}
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
                  onRetry={handleRetryMatch}
                />
              )}
            </div>
          ) : null}
        </main>
      </SidebarInset>

      {isRejectDialogOpen && application && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E6E0D6] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-charcoal">Reject Application</h3>
                <p className="text-xs text-[#78716C] mt-1">
                  Rejecting {application.candidate_name || "this candidate"} is permanent. You can optionally include a rejection reason.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRejectDialogOpen(false);
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
                  setIsRejectDialogOpen(false);
                  setRejectionReason("");
                }}
                disabled={isUpdatingStatus}
                className="rounded-lg border border-[#E6E0D6] px-3.5 py-2 text-xs font-medium text-charcoal hover:bg-[#FAF8F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("Rejected", rejectionReason.trim() || null)}
                disabled={isUpdatingStatus}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer"
              >
                {isUpdatingStatus ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
