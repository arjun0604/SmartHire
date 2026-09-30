import { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate, Link, useLocation } from "react-router-dom"
import { ArrowLeft, ArrowUpRight, Building2, MapPin, Edit3, Trash2, CheckCircle2, X, Loader2, Sparkles, FileText, HelpCircle } from "lucide-react"
import { isAxiosError } from "axios"
import { SidebarProvider, SidebarInset } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { SiteHeader } from "../components/site-header"
import { useAppDispatch, useAppSelector } from "../store"
import {
  updateJobThunk,
  fetchJobsThunk,
  fetchRecruiterJobsThunk,
  deleteJobThunk,
  type Job,
} from "../store/slices/jobsSlice"
import {
  fetchCandidateApplicationsThunk,
  fetchJobApplicationsThunk,
  type Application,
} from "../store/slices/applicationsSlice"
import { CreateJobModal } from "../components/recruiter/CreateJobModal"
import { ApplicationReviewModal } from "../components/candidate/ApplicationReviewModal"
import { useUser } from "../context/UserContext"
import { fetchJobByIdApi, fetchCurrentJobMatchApi, fetchApplicationMatchApi, fetchJobQuestionsApi, fetchMyJobAssessmentAttemptApi, type MatchReport, type CandidateAssessmentMyAttemptResponse } from "../utils/api"
import { formatSalaryRange } from "../utils/salary"
import { formatDisplayDate, getApplicationStatusBadgeClass } from "../utils/formatters"
import { MatchReportModal } from "../components/common/MatchReportModal"

export default function JobDetails() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { profile } = useUser();

  const isRecruiter = profile?.role === "recruiter";
  const isCandidate = profile?.role === "candidate";

  const navState = (location.state || {}) as {
    from?: string;
    fromLabel?: string;
    fromPath?: string;
    jobId?: string;
  };

  const { jobs: storeJobs, recruiterJobs, isLoading, isRecruiterLoading } = useAppSelector((state) => state.jobs);
  const candidateApplications = useAppSelector((state) => state.applications.candidateApplications);
  const allJobApplications = useAppSelector((state) => state.applications.jobApplications);

  const [directJob, setDirectJob] = useState<Job | null>(null);
  const [isDirectLoading, setIsDirectLoading] = useState(false);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [matchReport, setMatchReport] = useState<MatchReport | null>(null);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [isMatchLoading, setIsMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [questionsCount, setQuestionsCount] = useState<number | null>(null);
  const [myAssessmentAttempt, setMyAssessmentAttempt] = useState<CandidateAssessmentMyAttemptResponse | null>(null);

  const matchedJob =
    directJob ||
    (isRecruiter
      ? recruiterJobs.find((j) => j.id === jobId)
      : storeJobs.find((j) => j.id === jobId));

  useEffect(() => {
    if (isRecruiter && recruiterJobs.length === 0 && !isRecruiterLoading) {
      dispatch(fetchRecruiterJobsThunk());
    } else if (isCandidate && storeJobs.length === 0 && !isLoading) {
      dispatch(fetchJobsThunk());
    }
  }, [dispatch, isRecruiter, isCandidate, recruiterJobs.length, storeJobs.length, isRecruiterLoading, isLoading]);

  useEffect(() => {
    if (!jobId) return;

    let isSubscribed = true;

    async function loadJob() {
      if (!matchedJob) {
        setIsDirectLoading(true);
      }
      try {
        const fetched = await fetchJobByIdApi(jobId);
        if (isSubscribed) {
          setDirectJob(fetched);
          setIsAccessDenied(false);
          setIsNotFound(false);
        }
      } catch (err) {
        if (isSubscribed && isAxiosError(err)) {
          if (err.response?.status === 403) {
            setIsAccessDenied(true);
          } else if (err.response?.status === 404) {
            setIsNotFound(true);
          }
        }
      } finally {
        if (isSubscribed) {
          setIsDirectLoading(false);
        }
      }
    }

    loadJob();

    return () => {
      isSubscribed = false;
    };
  }, [jobId]);

  useEffect(() => {
    if (isCandidate && profile?.candidateId) {
      dispatch(fetchCandidateApplicationsThunk(profile.candidateId));
    } else if (isRecruiter && jobId) {
      dispatch(fetchJobApplicationsThunk(jobId))
        .unwrap()
        .catch((err) => {
          if (typeof err === "string" && err.toLowerCase().includes("denied")) {
            setIsAccessDenied(true);
          }
        });
      fetchJobQuestionsApi(jobId)
        .then((qs) => setQuestionsCount(qs.length))
        .catch(() => setQuestionsCount(0));
    }
  }, [dispatch, isCandidate, isRecruiter, profile?.candidateId, jobId]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (isDeleteModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDeleteModalOpen]);

  useEffect(() => {
    if (!isDeleteModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        setIsDeleteModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleteModalOpen, isDeleting]);

  const handleOpenMatchReport = async () => {
    if (!job?.id) return;
    setIsMatchLoading(true);
    setMatchError(null);
    try {
      let report: MatchReport;
      if (isAlreadyApplied && existingApplication) {
        report = await fetchApplicationMatchApi(existingApplication.id);
      } else {
        report = await fetchCurrentJobMatchApi(job.id);
      }
      setMatchReport(report);
      setIsMatchModalOpen(true);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === "string" && detail.trim()) {
          setMatchError(detail);
        } else {
          setMatchError("Could not load match report. Please upload a resume first.");
        }
      } else {
        setMatchError("Could not load match report. Please try again.");
      }
    } finally {
      setIsMatchLoading(false);
    }
  };

  const backDestination = useMemo(() => {
    if (navState.fromLabel && navState.fromPath) {
      return {
        label: navState.fromLabel,
        path: navState.fromPath,
      };
    }
    if (navState.from === "overview") {
      return {
        label: "Back to Overview",
        path: navState.fromPath || "/dashboard?tab=overview",
      };
    }
    if (navState.from === "saved-jobs") {
      return {
        label: "Back to Saved Jobs",
        path: navState.fromPath || "/dashboard?tab=saved-jobs",
      };
    }
    if (isRecruiter) {
      return {
        label: "Back to Job Postings",
        path: "/dashboard?tab=postings",
      };
    }
    return {
      label: "Back to Browse Jobs",
      path: "/dashboard?tab=jobs",
    };
  }, [navState, isRecruiter]);

  const backRoute = backDestination.path;
  const sidebarTab = isRecruiter ? "postings" : "jobs";

  const isPageLoading = (isLoading || isRecruiterLoading || isDirectLoading) && !matchedJob && !isAccessDenied && !isNotFound;

  if (isPageLoading) {
    return (
      <SidebarProvider>
        <AppSidebar activeTab={sidebarTab} />
        <SidebarInset className="bg-cream/40 min-h-screen">
          <SiteHeader title="Job Details" />
          <div className="flex flex-1 items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 border-3 border-terracotta border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[#8E877D] font-medium">Loading job details...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const job = matchedJob;

  const isAuthorized = (() => {
    if (isAccessDenied) return false;
    if (!isRecruiter) return true;
    if (!job) return true;
    if (!profile?.companyId) return true;

    const jobCompanyId = job.company_id || job.companyId;
    if (jobCompanyId) {
      return jobCompanyId === profile.companyId;
    }

    if (job.company && profile.company) {
      return job.company.toLowerCase() === profile.company.toLowerCase();
    }

    return true;
  })();

  if (isAccessDenied || !isAuthorized) {
    return (
      <SidebarProvider>
        <AppSidebar activeTab={sidebarTab} />
        <SidebarInset className="bg-cream/40 min-h-screen">
          <SiteHeader title="Job Details" />
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <h2 className="font-serif text-xl font-bold text-charcoal">Access Denied</h2>
            <p className="text-xs text-[#8E877D] mt-1 max-w-sm">
              You do not have permission to view or manage this job posting.
            </p>
            <button
              type="button"
              onClick={() => navigate(backRoute)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-4 py-2 text-xs font-semibold text-white hover:bg-terracotta-dark transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>{backDestination.label}</span>
            </button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (isNotFound || !job) {
    return (
      <SidebarProvider>
        <AppSidebar activeTab={sidebarTab} />
        <SidebarInset className="bg-cream/40 min-h-screen">
          <SiteHeader title="Job Details" />
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <h2 className="font-serif text-xl font-bold text-charcoal">Job Not Found</h2>
            <p className="text-xs text-[#8E877D] mt-1 max-w-sm">
              The requested job posting does not exist or has been removed.
            </p>
            <button
              type="button"
              onClick={() => navigate(backRoute)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-4 py-2 text-xs font-semibold text-white hover:bg-terracotta-dark transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>{backDestination.label}</span>
            </button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const existingApplication = candidateApplications.find((a) => a.job_id === job.id) || null;
  const isAlreadyApplied = Boolean(existingApplication);
  const jobApplications = allJobApplications.filter((a) => a.job_id === job.id);

  useEffect(() => {
    if (!job?.id || !isCandidate || !isAlreadyApplied || !job?.require_assessment) return;
    let isMounted = true;
    fetchMyJobAssessmentAttemptApi(job.id)
      .then((res) => {
        if (isMounted) setMyAssessmentAttempt(res);
      })
      .catch((err) => {
        console.error("Failed to fetch assessment attempt status:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [job?.id, isCandidate, isAlreadyApplied, job?.require_assessment]);

  const applicationsCount = jobApplications.length > 0 ? jobApplications.length : (job.applicantCount || job.applicants || 0);
  const shortlistedCount = jobApplications.filter((a) => a.status === "Shortlisted").length;
  const screeningCount = jobApplications.filter((a) => a.status === "Screening").length;
  const rejectedCount = jobApplications.filter((a) => a.status === "Rejected").length;

  const handleJobUpdated = (updated: Job) => {
    dispatch(updateJobThunk({ jobId: updated.id, jobData: updated }));
    setDirectJob(updated);
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setIsDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteJobThunk(job.id)).unwrap();
      setIsDeleteModalOpen(false);
      navigate(backRoute);
    } catch (error) {
      setIsDeleting(false);
      alert(typeof error === "string" ? error : "Failed to delete job posting.");
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar activeTab={sidebarTab} />
      <SidebarInset className="bg-cream/40 min-h-screen">
        <SiteHeader title="Job Details" />

        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:py-8 lg:pl-28 lg:pr-8 w-full min-w-0">
          <div>
            <button
              type="button"
              onClick={() => navigate(backRoute)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#78716C] hover:text-charcoal transition-colors cursor-pointer mb-4 group"
            >
              <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>{backDestination.label}</span>
            </button>

            <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono text-terracotta uppercase tracking-wider font-semibold">
                      {job.department}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {job.status}
                    </span>
                  </div>

                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal mt-1.5">
                    {job.title}
                  </h1>

                  <p className="text-xs sm:text-sm text-[#78716C] flex items-center gap-2 mt-1.5 flex-wrap">
                    {job.company_id ? (
                      <Link
                        to={`/company/${job.company_id}`}
                        className="flex items-center gap-1 font-medium text-charcoal hover:text-terracotta transition-colors"
                      >
                        <Building2 className="size-3.5 text-[#8E877D]" />
                        <span>{job.company}</span>
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1 font-medium text-charcoal">
                        <Building2 className="size-3.5 text-[#8E877D]" />
                        <span>{job.company}</span>
                      </span>
                    )}
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5 text-[#8E877D]" />
                      {job.location}
                    </span>
                    <span>&bull;</span>
                    <span>{job.workMode}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {isRecruiter && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/recruiter/jobs/${job.id}/questions`, {
                            state: {
                              from: "job-details",
                              fromLabel: `Back to ${job.title}`,
                              fromPath: `/jobs/${job.id}`,
                              jobId: job.id,
                            },
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E0D6] bg-white px-3.5 py-1.5 text-xs font-medium text-charcoal hover:bg-cream transition-colors cursor-pointer shadow-3xs"
                      >
                        <HelpCircle className="size-3.5 text-terracotta" />
                        <span>Assessment</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E0D6] bg-white px-3.5 py-1.5 text-xs font-medium text-charcoal hover:bg-cream transition-colors cursor-pointer shadow-3xs"
                      >
                        <Edit3 className="size-3.5" />
                        <span>Edit Job</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDeleteModalOpen(true)}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors cursor-pointer shadow-3xs disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5 text-red-600" />
                        <span>Delete Job</span>
                      </button>
                    </>
                  )}

                  {isCandidate && (
                    isAlreadyApplied ? (
                      <div className="flex items-center gap-2">
                        {job.require_assessment && myAssessmentAttempt?.attempt_status === "SUBMITTED" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            <span>Assessment Completed</span>
                          </span>
                        ) : job.require_assessment && myAssessmentAttempt?.attempt_status === "IN_PROGRESS" ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/candidate/jobs/${job.id}/assessment`)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer shadow-3xs"
                          >
                            <HelpCircle className="size-3.5" />
                            <span>Continue Assessment</span>
                          </button>
                        ) : job.require_assessment && (job.assessment_status === "ACTIVE" || job.assessment_status === "STARTED") ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/candidate/jobs/${job.id}/assessment`)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta hover:bg-terracotta-dark text-white px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer shadow-3xs"
                          >
                            <HelpCircle className="size-3.5" />
                            <span>Take Assessment</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            <span>Applied</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (existingApplication) {
                              navigate(`/candidate/applications/${existingApplication.id}?view=match`, {
                                state: {
                                  from: "job-details",
                                  fromLabel: `Back to ${job.title}`,
                                  fromPath: `/candidate/jobs/${job.id}`,
                                  jobId: job.id,
                                },
                              });
                            } else {
                              handleOpenMatchReport();
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-cream text-charcoal border border-[#E6E0D6] px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer shadow-3xs"
                        >
                          <span>Match Review</span>
                        </button>
                        {existingApplication && (
                          <button
                            type="button"
                            onClick={() => {
                              navigate(`/candidate/applications/${existingApplication.id}`, {
                                state: {
                                  from: "job-details",
                                  fromLabel: `Back to ${job.title}`,
                                  fromPath: `/candidate/jobs/${job.id}`,
                                  jobId: job.id,
                                },
                              });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-cream text-charcoal border border-[#E6E0D6] px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer shadow-3xs"
                          >
                            <FileText className="size-3.5 text-[#8E877D]" />
                            <span>View Application</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleOpenMatchReport}
                          disabled={isMatchLoading}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-cream text-charcoal border border-[#E6E0D6] px-3 py-2 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {isMatchLoading && (
                            <Loader2 className="size-3.5 animate-spin" />
                          )}
                          <span>Check Match</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsApplyModalOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-4 py-2 text-xs font-semibold text-white hover:bg-terracotta-dark shadow-2xs transition-colors cursor-pointer"
                        >
                          <span>Apply Now</span>
                          <ArrowUpRight className="size-3.5" />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {matchError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-center justify-between">
              <span>{matchError}</span>
              <button
                type="button"
                onClick={() => setMatchError(null)}
                className="text-amber-700 hover:text-amber-900 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {isCandidate && isAlreadyApplied && existingApplication?.status?.toLowerCase() === "screening" && (
            <div className="rounded-2xl border border-terracotta/20 bg-gradient-to-r from-terracotta/5 to-amber-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl border ${
                    myAssessmentAttempt?.attempt_status === "SUBMITTED"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : "bg-terracotta/10 border-terracotta/20 text-terracotta"
                  }`}
                >
                  {myAssessmentAttempt?.attempt_status === "SUBMITTED" ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <HelpCircle className="size-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal text-sm">
                    {myAssessmentAttempt?.attempt_status === "SUBMITTED"
                      ? "MCQ Assessment Completed"
                      : myAssessmentAttempt?.attempt_status === "IN_PROGRESS"
                      ? "MCQ Assessment In Progress"
                      : (myAssessmentAttempt?.assessment_status === "ACTIVE" || job.assessment_status === "ACTIVE")
                      ? "Assessment Available"
                      : "Pending Recruiter Activation"}
                  </h3>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    {myAssessmentAttempt?.attempt_status === "SUBMITTED"
                      ? "Your assessment has been submitted successfully. Your responses have been recorded."
                      : myAssessmentAttempt?.attempt_status === "IN_PROGRESS"
                      ? `You have an unfinished attempt with ${myAssessmentAttempt.answered_count || 0} of ${myAssessmentAttempt.total_questions || 0} questions answered.`
                      : (myAssessmentAttempt?.assessment_status === "ACTIVE" || job.assessment_status === "ACTIVE")
                      ? "Complete this assessment as part of the screening process."
                      : "Your application has entered the screening stage. The assessment will become available once the recruiter activates it."}
                  </p>
                </div>
              </div>

              {myAssessmentAttempt?.attempt_status === "SUBMITTED" ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shrink-0">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  <span>Submitted</span>
                </span>
              ) : myAssessmentAttempt?.attempt_status === "IN_PROGRESS" ? (
                <button
                  type="button"
                  onClick={() => navigate(`/candidate/jobs/${job.id}/assessment`)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-charcoal hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs shrink-0"
                >
                  <span>Resume Assessment</span>
                  <ArrowUpRight className="size-3.5" />
                </button>
              ) : (myAssessmentAttempt?.can_start || myAssessmentAttempt?.assessment_status === "ACTIVE" || job.assessment_status === "ACTIVE") ? (
                <button
                  type="button"
                  onClick={() => navigate(`/candidate/jobs/${job.id}/assessment`)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-terracotta hover:bg-terracotta-dark text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs shrink-0"
                >
                  <span>Start Assessment</span>
                  <ArrowUpRight className="size-3.5" />
                </button>
              ) : null}
            </div>
          )}

          {isRecruiter && (
            <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
              <h2 className="font-sans text-base font-bold text-charcoal mb-4 pb-3 border-b border-[#F0ECE4]">
                Recruitment Status
              </h2>

              <div className="grid grid-cols-4 divide-x divide-[#F0ECE4] text-center">
                <div className="px-2">
                  <span className="text-[11px] sm:text-xs text-[#8E877D] block truncate">Applications</span>
                  <span className="text-xl sm:text-2xl font-normal text-charcoal mt-1 block">
                    {applicationsCount}
                  </span>
                </div>

                <div className="px-2">
                  <span className="text-[11px] sm:text-xs text-[#8E877D] block truncate">Shortlisted</span>
                  <span className="text-xl sm:text-2xl font-normal text-charcoal mt-1 block">
                    {shortlistedCount}
                  </span>
                </div>

                <div className="px-2">
                  <span className="text-[11px] sm:text-xs text-[#8E877D] block truncate">Screening</span>
                  <span className="text-xl sm:text-2xl font-normal text-charcoal mt-1 block">
                    {screeningCount}
                  </span>
                </div>

                <div className="px-2">
                  <span className="text-[11px] sm:text-xs text-[#8E877D] block truncate">Rejected</span>
                  <span className="text-xl sm:text-2xl font-normal text-charcoal mt-1 block">
                    {rejectedCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0">
            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                <h2 className="font-sans text-base font-bold text-charcoal mb-3 pb-3 border-b border-[#F0ECE4]">
                  Job Description
                </h2>
                <p className="text-sm text-[#44403C] leading-relaxed whitespace-pre-line">
                  {job.description}
                </p>
              </div>

              {job.responsibilities && job.responsibilities.length > 0 && (
                <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                  <h2 className="font-sans text-base font-bold text-charcoal mb-3 pb-3 border-b border-[#F0ECE4]">
                    Responsibilities
                  </h2>
                  <ul className="space-y-2.5 text-sm text-[#44403C]">
                    {job.responsibilities.map((resp, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="size-1.5 rounded-full bg-terracotta mt-2 shrink-0" />
                        <span className="leading-relaxed">{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              

              {job.qualifications && job.qualifications.length > 0 && (
                <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                  <h2 className="font-sans text-base font-bold text-charcoal mb-3 pb-3 border-b border-[#F0ECE4]">
                    Qualifications
                  </h2>
                  <ul className="space-y-2.5 text-sm text-[#44403C]">
                    {job.qualifications.map((qual, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="size-1.5 rounded-full bg-emerald-600 mt-2 shrink-0" />
                        <span className="leading-relaxed">{qual}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {job.preferredQualifications && job.preferredQualifications.length > 0 && (
                <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                  <h2 className="font-sans text-base font-bold text-charcoal mb-3 pb-3 border-b border-[#F0ECE4]">
                    Preferred Qualifications
                  </h2>
                  <ul className="space-y-2.5 text-sm text-[#44403C]">
                    {job.preferredQualifications.map((qual, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="size-1.5 rounded-full bg-[#8E877D] mt-2 shrink-0" />
                        <span className="leading-relaxed">{qual}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(job.additionalRequirements || (job as any).additional_requirements) && (
                <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                  <h2 className="font-sans text-base font-bold text-charcoal mb-3 pb-3 border-b border-[#F0ECE4]">
                    Additional Requirements
                  </h2>
                  <ul className="space-y-2.5 text-sm text-[#44403C]">
                    {String(job.additionalRequirements || (job as any).additional_requirements)
                      .split("\n")
                      .map((req) => req.trim())
                      .filter(Boolean)
                      .map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="size-1.5 rounded-full bg-terracotta mt-2 shrink-0" />
                          <span className="leading-relaxed">{req}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {isRecruiter && (
                <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F0ECE4]">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-terracotta font-semibold block">
                        Assessment
                      </span>
                      <h2 className="font-sans text-base font-bold text-charcoal mt-0.5">Question Bank</h2>
                      <p className="text-xs text-[#8E877D] mt-0.5">Configure multiple-choice screening questions for candidate assessment.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-cream border border-[#E6E0D6] text-charcoal">
                        {questionsCount !== null ? `${questionsCount} Questions` : "Assessment"}
                      </span>
                      {job?.id && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/recruiter/jobs/${job.id}/questions`, {
                              state: {
                                from: "job-details",
                                fromLabel: "Back to Job Details",
                                fromPath: `/jobs/${job.id}`,
                                jobId: job.id,
                              },
                            })
                          }
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-terracotta hover:text-terracotta-dark border border-terracotta/20 hover:border-terracotta/40 bg-terracotta/5 transition-colors cursor-pointer"
                        >
                          Manage Assessment
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="py-2 flex items-center justify-between text-xs text-[#78716C]">
                    <span>
                      {questionsCount === null
                        ? "Loading questions..."
                        : questionsCount === 0
                        ? "No questions added yet. Create questions to test applicant skills."
                        : `${questionsCount} multiple-choice questions configured.`}
                    </span>
                    {job?.id && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/recruiter/jobs/${job.id}/questions`, {
                            state: {
                              from: "job-details",
                              fromLabel: "Back to Job Details",
                              fromPath: `/jobs/${job.id}`,
                              jobId: job.id,
                            },
                          })
                        }
                        className="text-terracotta hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Question Bank</span>
                        <ArrowUpRight className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isRecruiter && (
                <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F0ECE4]">
                    <div>
                      <h2 className="font-sans text-base font-bold text-charcoal">Candidates</h2>
                      <p className="text-xs text-[#8E877D] mt-0.5">Applicants currently active for this position.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-cream border border-[#E6E0D6] text-charcoal">
                        {jobApplications.length} Applicants
                      </span>
                      {job?.id && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/candidates/job/${job.id}`, {
                              state: {
                                from: "job-details",
                                fromLabel: "Back to Job Details",
                                fromPath: `/jobs/${job.id}`,
                                jobId: job.id,
                              },
                            })
                          }
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-terracotta hover:text-terracotta-dark border border-terracotta/20 hover:border-terracotta/40 bg-terracotta/5 transition-colors cursor-pointer"
                        >
                          View Candidates
                        </button>
                      )}
                    </div>
                  </div>

                  {jobApplications.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-xs font-semibold text-charcoal">No candidates have applied to this role yet.</p>
                      <p className="text-xs text-[#8E877D] mt-0.5">Candidates will appear here as applications are submitted.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F0ECE4]">
                      {jobApplications.map((app) => (
                        <div
                          key={app.id}
                          onClick={() => {
                            if (job?.id) {
                              navigate(`/candidates/job/${job.id}/application/${app.id}`, {
                                state: {
                                  from: "job-details",
                                  fromLabel: "Back to Job Details",
                                  fromPath: `/jobs/${job.id}`,
                                  jobId: job.id,
                                  applicationId: app.id,
                                },
                              });
                            }
                          }}
                          className="py-3 px-2 rounded-xl flex items-center justify-between gap-3 hover:bg-cream transition-colors cursor-pointer group"
                        >
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-charcoal group-hover:text-terracotta transition-colors">
                              {app.candidate_name || "Applicant"}
                            </p>
                            <p className="text-[11px] text-[#8E877D] mt-0.5">
                              {app.current_job_title || "Candidate"} &bull; {app.years_experience || "N/A"} &bull; Applied {formatDisplayDate(app.applied_at)}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getApplicationStatusBadgeClass(app.status)}`}
                            >
                              {app.status}
                            </span>
                            <ArrowUpRight className="size-3.5 text-[#8E877D] group-hover:text-terracotta transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                <h2 className="font-sans text-base font-bold text-charcoal mb-4 pb-3 border-b border-[#F0ECE4]">
                  Job Overview
                </h2>

                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E877D]">Experience</span>
                    <span className="font-semibold text-charcoal">
                      {job.experience || job.experienceLevel || "3–5 years"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Work Mode</span>
                    <span className="font-semibold text-charcoal">
                      {job.workMode || "Remote"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Employment Type</span>
                    <span className="font-semibold text-charcoal">
                      {job.employmentType || job.jobType || "Full-time"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Department</span>
                    <span className="font-semibold text-charcoal">
                      {job.department}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Location</span>
                    <span className="font-semibold text-charcoal truncate max-w-37.5">
                      {job.location}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Education</span>
                    <span className="font-semibold text-charcoal truncate max-w-37.5">
                      {job.education || "Bachelor's Degree"}
                    </span>
                  </div>

                  {formatSalaryRange(job.salaryMin, job.salaryMax) && (
                    <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                      <span className="text-[#8E877D]">Salary (Annual)</span>
                      <span className="font-semibold text-charcoal">
                        {formatSalaryRange(job.salaryMin, job.salaryMax)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Posted Date</span>
                    <span className="font-semibold text-charcoal">
                      {job.postedDate || "Aug 28, 2026"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Application Deadline</span>
                    <span className="font-semibold text-charcoal">
                      {formatDisplayDate(job.deadline, "Sep 30, 2026")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Assessment</span>
                    <span className="font-semibold text-charcoal">
                      {job.requireAssessment ? "Required" : "Not Required"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                <h2 className="font-sans text-base font-bold text-charcoal mb-3 pb-3 border-b border-[#F0ECE4]">
                  Required Skills
                </h2>

                <div className="flex flex-wrap gap-2">
                  {(job.requiredSkills || job.skills).map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-md bg-cream border border-[#E6E0D6] text-xs font-medium text-charcoal"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {job.preferredSkills && job.preferredSkills.length > 0 && (
                <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                  <h2 className="font-sans text-base font-bold text-charcoal mb-3 pb-3 border-b border-[#F0ECE4]">
                    Preferred Skills
                  </h2>

                  <div className="flex flex-wrap gap-2">
                    {job.preferredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-md bg-white border border-[#E6E0D6] text-xs text-[#78716C]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {isRecruiter && (
          <CreateJobModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            initialData={job}
            onJobUpdated={handleJobUpdated}
          />
        )}

        {isCandidate && (
          <ApplicationReviewModal
            isOpen={isApplyModalOpen}
            onClose={() => setIsApplyModalOpen(false)}
            job={job}
          />
        )}

        <MatchReportModal
          isOpen={isMatchModalOpen}
          onClose={() => setIsMatchModalOpen(false)}
          report={matchReport}
          jobTitle={job?.title}
          candidateName={profile?.name || undefined}
        />

        {isRecruiter && isDeleteModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/55 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={handleCancelDelete}
          >
            <div
              className="w-full max-w-md bg-white border border-[#E6E0D6] rounded-2xl shadow-xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E6E0D6]">
                <h3 className="font-serif text-lg font-bold text-charcoal tracking-tight">
                  Delete Job Posting?
                </h3>
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="rounded-lg p-1 text-[#78716C] hover:text-charcoal hover:bg-cream transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                This job posting and its associated applications will be permanently removed. This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F0ECE4]">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="rounded-lg border border-[#E6E0D6] bg-white px-3.5 py-2 text-xs font-semibold text-charcoal hover:bg-cream transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Job</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
