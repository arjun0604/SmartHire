import { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate, useLocation, Link } from "react-router-dom"
import {
  ArrowLeft,
  Plus,
  Upload,
  Edit3,
  Trash2,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  MapPin,
  Play,
  XCircle,
  RotateCcw,
  BarChart3,
  Clock,
} from "lucide-react"
import { SidebarProvider, SidebarInset } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { SiteHeader } from "../components/site-header"
import { Skeleton } from "../components/ui/skeleton"
import { useUser } from "../context/UserContext"
import {
  fetchJobByIdApi,
  fetchJobQuestionsApi,
  deleteQuestionApi,
  fetchJobAssessmentStatusApi,
  activateJobAssessmentApi,
  closeJobAssessmentApi,
  updateAssessmentSettingsApi,
  type MCQQuestion,
  type Job,
  type AssessmentStatus,
  type AssessmentStatusResponse,
} from "../utils/api"
import { MCQQuestionModal } from "../components/recruiter/MCQQuestionModal"
import { DeleteQuestionModal } from "../components/recruiter/DeleteQuestionModal"
import { ExcelUploadModal } from "../components/recruiter/ExcelUploadModal"
import {
  getAssessmentStatusLabel,
  getAssessmentStatusBadgeClasses,
  getAssessmentStatusDotClasses,
} from "../utils/assessmentStatus"

export default function RecruiterQuestionBankPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useUser();

  const [job, setJob] = useState<Job | null>(null);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [assessmentStatus, setAssessmentStatus] = useState<AssessmentStatusResponse | null>(null);
  const [isStatusActionLoading, setIsStatusActionLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<MCQQuestion | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [deletingQuestion, setDeletingQuestion] = useState<MCQQuestion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(10);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);

  const navState = (location.state || {}) as {
    from?: string;
    fromLabel?: string;
    fromPath?: string;
  };

  const backDestination = useMemo(() => {
    if (navState?.fromLabel && navState?.fromPath) {
      return { label: navState.fromLabel, path: navState.fromPath };
    }
    if (jobId) {
      return { label: "Back to Job Details", path: `/jobs/${jobId}` };
    }
    return { label: "Back to Dashboard", path: "/dashboard?tab=postings" };
  }, [navState, jobId]);

  useEffect(() => {
    if (!jobId) return;

    let isSubscribed = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [jobData, questionsData, statusData] = await Promise.all([
          fetchJobByIdApi(jobId!),
          fetchJobQuestionsApi(jobId!),
          fetchJobAssessmentStatusApi(jobId!),
        ]);

        if (isSubscribed) {
          setJob(jobData);
          setQuestions(questionsData);
          setAssessmentStatus(statusData);
        }
      } catch (err: any) {
        if (isSubscribed) {
          const detail =
            err?.response?.data?.detail ||
            "Failed to load questions. Please check permissions or try again.";
          setErrorMessage(detail);
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, [jobId]);

  async function refreshAssessmentStatus() {
    if (!jobId) return;
    try {
      const st = await fetchJobAssessmentStatusApi(jobId);
      setAssessmentStatus(st);
    } catch {
      return;
    }
  }

  useEffect(() => {
    if (assessmentStatus) {
      const dur = assessmentStatus.duration_minutes || assessmentStatus.assessment_duration_minutes || 30;
      setSelectedDuration(dur);

      const qCount = assessmentStatus.configured_question_count ?? assessmentStatus.assessment_question_count;
      if (qCount !== undefined && qCount !== null && qCount > 0) {
        setSelectedQuestionCount(qCount);
      } else if (questions.length > 0) {
        setSelectedQuestionCount(questions.length);
      }
    } else if (questions.length > 0) {
      setSelectedQuestionCount(questions.length);
    }
  }, [assessmentStatus, questions.length]);

  async function handleSaveConfiguration(durationToSave?: number, countToSave?: number) {
    if (!jobId) return;
    const dur = durationToSave ?? selectedDuration;
    const count = countToSave ?? selectedQuestionCount;

    if (dur <= 0) {
      setErrorMessage("Duration must be greater than 0 minutes.");
      return;
    }
    if (count <= 0) {
      setErrorMessage("Number of questions must be greater than 0.");
      return;
    }
    if (questions.length > 0 && count > questions.length) {
      setErrorMessage(`Configured question count (${count}) cannot exceed available questions in question bank (${questions.length}).`);
      return;
    }

    setIsUpdatingSettings(true);
    setErrorMessage(null);
    try {
      const res = await updateAssessmentSettingsApi(jobId, {
        duration_minutes: dur,
        question_count: count,
      });
      setAssessmentStatus(res);
      setSettingsFeedback("Assessment configuration saved successfully.");
      setTimeout(() => {
        setSettingsFeedback(null);
      }, 4000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || "Failed to update assessment configuration.");
    } finally {
      setIsUpdatingSettings(false);
    }
  }

  function handleOpenAdd() {
    setEditingQuestion(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(q: MCQQuestion) {
    setEditingQuestion(q);
    setIsModalOpen(true);
  }

  function handleQuestionSaved(saved: MCQQuestion) {
    setQuestions((prev) => {
      const idx = prev.findIndex((item) => item.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
    refreshAssessmentStatus();
  }

  function handleBulkImportSuccess(count: number, newQuestions: MCQQuestion[]) {
    setQuestions((prev) => [...prev, ...newQuestions]);
    setSuccessBanner(`${count} ${count === 1 ? "question" : "questions"} imported successfully.`);
    refreshAssessmentStatus();
    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  }

  async function handleConfirmDelete() {
    if (!deletingQuestion) return;

    setIsDeleting(true);
    try {
      await deleteQuestionApi(deletingQuestion.id);
      setQuestions((prev) => prev.filter((item) => item.id !== deletingQuestion.id));
      setDeletingQuestion(null);
      setSuccessBanner("Question deleted successfully.");
      refreshAssessmentStatus();
      setTimeout(() => {
        setSuccessBanner(null);
      }, 5000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || "Failed to delete question.");
    } finally {
      setIsDeleting(false);
    }
  }

  const validationError = useMemo(() => {
    if (questions.length === 0) {
      return "Question bank is empty. Add at least one MCQ before activation.";
    }
    if (!selectedDuration || selectedDuration <= 0) {
      return "Assessment duration must be configured and greater than 0 minutes.";
    }
    if (!selectedQuestionCount || selectedQuestionCount <= 0) {
      return "Number of questions must be configured and greater than 0.";
    }
    if (selectedQuestionCount > questions.length) {
      return `Configured question count (${selectedQuestionCount}) exceeds available questions in question bank (${questions.length}).`;
    }
    if (assessmentStatus?.validation_message) {
      return assessmentStatus.validation_message;
    }
    return null;
  }, [questions.length, selectedDuration, selectedQuestionCount, assessmentStatus?.validation_message]);

  const canActivateAssessment = useMemo(() => {
    return Boolean(
      assessmentStatus?.can_activate &&
      !validationError &&
      questions.length > 0
    );
  }, [assessmentStatus?.can_activate, validationError, questions.length]);

  async function handleActivateAssessment() {
    if (!jobId) return;
    if (!canActivateAssessment) {
      setErrorMessage(validationError || "Assessment cannot be activated with current configuration.");
      return;
    }
    setIsStatusActionLoading(true);
    try {
      const updated = await activateJobAssessmentApi(jobId);
      setAssessmentStatus(updated);
      setSuccessBanner("Assessment successfully activated! Eligible candidates can now access this assessment.");
      setTimeout(() => {
        setSuccessBanner(null);
      }, 6000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || "Failed to activate assessment.");
    } finally {
      setIsStatusActionLoading(false);
    }
  }

  async function handleCloseAssessment() {
    if (!jobId) return;
    setIsStatusActionLoading(true);
    try {
      const updated = await closeJobAssessmentApi(jobId);
      setAssessmentStatus(updated);
      setSuccessBanner("Assessment has been closed. Candidates can no longer access it.");
      setTimeout(() => {
        setSuccessBanner(null);
      }, 6000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || "Failed to close assessment.");
    } finally {
      setIsStatusActionLoading(false);
    }
  }

  const derivedStatus: AssessmentStatus = useMemo(() => {
    if (questions.length === 0) return "NOT_STARTED";
    if (assessmentStatus) return assessmentStatus.status;
    return "CONFIGURED";
  }, [questions.length, assessmentStatus]);

  if (errorMessage && !job && !isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar activeTab="assessments" />
        <SidebarInset className="bg-[#FAF8F5] min-h-screen">
          <SiteHeader />
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
              <AlertCircle className="size-8 text-red-600 mx-auto" />
              <h2 className="font-serif text-lg font-bold text-red-900">
                Unable to Load Question Bank
              </h2>
              <p className="text-xs text-red-700 max-w-md mx-auto">{errorMessage}</p>
              <button
                type="button"
                onClick={() => navigate(backDestination.path)}
                className="mt-3 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                Go Back
              </button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar activeTab="assessments" />
      <SidebarInset className="bg-[#FAF8F5] min-h-screen">
        <SiteHeader />

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              to={backDestination.path}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#78716C] hover:text-charcoal transition-colors self-start"
            >
              <ArrowLeft className="size-4" />
              <span>{backDestination.label}</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
              <Link
                to={`/recruiter/jobs/${jobId}/assessment/results`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream px-3.5 py-2 text-xs font-semibold text-charcoal shadow-3xs transition-colors cursor-pointer"
              >
                <BarChart3 className="size-3.5 text-terracotta" />
                <span>View Results</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                disabled={derivedStatus === "STARTED" || derivedStatus === "CLOSED"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream px-3.5 py-2 text-xs font-semibold text-charcoal shadow-3xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Upload className="size-3.5 text-terracotta" />
                <span>Upload Excel</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAdd}
                disabled={derivedStatus === "STARTED" || derivedStatus === "CLOSED"}
                className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer disabled:opacity-50"
              >
                <Plus className="size-4" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {successBanner && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>{successBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessBanner(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-terracotta font-semibold block mb-1">
                  Section &bull; Hiring Assessment
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
                  {job?.title || "Job Assessment"} Question Bank
                </h1>

                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[#78716C]">
                  {job?.company && (
                    <span className="flex items-center gap-1">
                      <Building2 className="size-3.5 text-[#8E877D]" />
                      <span>{job.company}</span>
                    </span>
                  )}
                  {job?.location && (
                    <>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5 text-[#8E877D]" />
                        <span>{job.location}</span>
                      </span>
                    </>
                  )}
                  {job?.workMode && (
                    <>
                      <span>&bull;</span>
                      <span>{job.workMode}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-[#F0ECE4]">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getAssessmentStatusBadgeClasses(
                    derivedStatus,
                    job?.deadline
                  )}`}
                >
                  <span className={`size-1.5 rounded-full shrink-0 ${getAssessmentStatusDotClasses(derivedStatus, job?.deadline)}`} />
                  <span>{getAssessmentStatusLabel(derivedStatus, job?.deadline)}</span>
                </span>
                <span className="text-xs text-[#78716C]">
                  Questions: <strong className="text-charcoal font-mono">{questions.length}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {derivedStatus === "CONFIGURED" && (
                  <button
                    type="button"
                    onClick={handleActivateAssessment}
                    disabled={isStatusActionLoading || !canActivateAssessment}
                    title={!canActivateAssessment ? (validationError || "Configuration required before activation") : undefined}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Play className="size-3.5" />
                    <span>{isStatusActionLoading ? "Activating..." : "Activate Assessment"}</span>
                  </button>
                )}

                {(derivedStatus === "ACTIVE" || derivedStatus === "STARTED") && (
                  <button
                    type="button"
                    onClick={handleCloseAssessment}
                    disabled={isStatusActionLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-charcoal text-xs font-semibold shadow-3xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="size-3.5 text-stone-500" />
                    <span>{isStatusActionLoading ? "Closing..." : "Close Assessment"}</span>
                  </button>
                )}

                {derivedStatus === "CLOSED" && (
                  <button
                    type="button"
                    onClick={handleActivateAssessment}
                    disabled={isStatusActionLoading || !canActivateAssessment}
                    title={!canActivateAssessment ? (validationError || "Configuration required before reactivation") : undefined}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-charcoal text-xs font-semibold shadow-3xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="size-3.5 text-terracotta" />
                    <span>{isStatusActionLoading ? "Reopening..." : "Reopen Assessment"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-terracotta font-semibold block">
                      Recruiter Setup
                    </span>
                    <h3 className="font-serif text-base font-bold text-charcoal mt-0.5">
                      Assessment Configuration
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#78716C]">
                    Bank: {questions.length}
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-charcoal flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-stone-400" />
                        <span>Assessment Duration</span>
                      </span>
                      <span className="text-[11px] text-[#78716C] font-normal">in minutes</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={360}
                        value={selectedDuration}
                        onChange={(e) => setSelectedDuration(parseInt(e.target.value) || 0)}
                        disabled={isUpdatingSettings || derivedStatus === "STARTED" || derivedStatus === "CLOSED"}
                        className="w-full px-3 py-2 rounded-lg border border-[#E6E0D6] bg-white text-xs font-semibold text-charcoal disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-terracotta"
                        placeholder="e.g. 30"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        {[15, 30, 45, 60].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => {
                              setSelectedDuration(mins);
                              handleSaveConfiguration(mins, undefined);
                            }}
                            disabled={isUpdatingSettings || derivedStatus === "STARTED" || derivedStatus === "CLOSED"}
                            className={`px-2 py-1 rounded text-[10px] font-mono font-medium border transition-colors cursor-pointer ${
                              selectedDuration === mins
                                ? "bg-terracotta text-white border-terracotta"
                                : "bg-cream text-stone-600 border-[#E6E0D6] hover:bg-white"
                            }`}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-[#78716C]">
                      Duration allocated to each candidate attempt before automatic submission.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-charcoal flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <HelpCircle className="size-3.5 text-stone-400" />
                        <span>Number of Questions</span>
                      </span>
                      <span className="text-[11px] text-[#78716C] font-normal">
                        Max: {questions.length}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, questions.length)}
                        value={selectedQuestionCount}
                        onChange={(e) => setSelectedQuestionCount(parseInt(e.target.value) || 0)}
                        disabled={isUpdatingSettings || derivedStatus === "STARTED" || derivedStatus === "CLOSED"}
                        className="w-full px-3 py-2 rounded-lg border border-[#E6E0D6] bg-white text-xs font-semibold text-charcoal disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-terracotta"
                        placeholder="e.g. 10"
                      />
                      {questions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedQuestionCount(questions.length);
                            handleSaveConfiguration(undefined, questions.length);
                          }}
                          disabled={isUpdatingSettings || derivedStatus === "STARTED" || derivedStatus === "CLOSED"}
                          className="px-2.5 py-2 rounded-lg text-[10px] font-medium border border-[#E6E0D6] bg-cream text-stone-700 hover:bg-white shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          All ({questions.length})
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-[#78716C]">
                      Questions presented to each candidate from the question bank. Shuffled per attempt.
                    </p>
                  </div>

                  {derivedStatus !== "STARTED" && derivedStatus !== "CLOSED" && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleSaveConfiguration()}
                        disabled={isUpdatingSettings}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-terracotta hover:bg-terracotta-dark px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isUpdatingSettings ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <span>Save Assessment Configuration</span>
                        )}
                      </button>
                    </div>
                  )}

                  {settingsFeedback && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                      <span>{settingsFeedback}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#F0ECE4]">
                  {canActivateAssessment ? (
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Ready for Activation</span>
                        <span className="text-[11px] text-emerald-800">
                          {selectedQuestionCount} questions &bull; {selectedDuration} minutes countdown per candidate.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                      <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block text-amber-900">Activation Requirements</span>
                        <span className="text-[11px] text-amber-800 leading-relaxed block mt-0.5">
                          {validationError || "Complete configuration before activating."}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-2xs space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-terracotta font-semibold block">
                    Assessment Overview
                  </span>
                  <h3 className="font-serif text-base font-bold text-charcoal mt-0.5">
                    Structure & Guidelines
                  </h3>
                </div>

                <div className="space-y-2.5 text-xs text-[#78716C] divide-y divide-[#F0ECE4]">
                  <div className="flex items-center justify-between pt-1">
                    <span>Assessment Status</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getAssessmentStatusBadgeClasses(
                        derivedStatus,
                        job?.deadline
                      )}`}
                    >
                      <span className={`size-1.5 rounded-full shrink-0 ${getAssessmentStatusDotClasses(derivedStatus, job?.deadline)}`} />
                      <span>{getAssessmentStatusLabel(derivedStatus, job?.deadline)}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2.5">
                    <span>Question Format</span>
                    <span className="font-semibold text-charcoal">Multiple Choice (MCQ)</span>
                  </div>
                  <div className="flex items-center justify-between pt-2.5">
                    <span>Question Bank Size</span>
                    <span className="font-semibold font-mono text-charcoal">{questions.length}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2.5">
                    <span>Candidate Questions</span>
                    <span className="font-semibold font-mono text-charcoal">{selectedQuestionCount}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2.5">
                    <span>Duration</span>
                    <span className="font-semibold font-mono text-charcoal">{selectedDuration} mins</span>
                  </div>
                  <div className="flex items-center justify-between pt-2.5">
                    <span>Scoring</span>
                    <span className="font-semibold text-charcoal">Automatic (1 mark/Q)</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to={`/recruiter/jobs/${jobId}/assessment/results`}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream px-3.5 py-2 text-xs font-semibold text-charcoal shadow-3xs transition-colors cursor-pointer"
                  >
                    <BarChart3 className="size-3.5 text-terracotta" />
                    <span>View Assessment Results</span>
                  </Link>
                </div>

                <div className="p-3.5 rounded-xl bg-cream/50 border border-[#E6E0D6] space-y-1.5">
                  <span className="text-[11px] font-semibold text-charcoal block">
                    Screening Rule
                  </span>
                  <p className="text-[11px] text-[#78716C] leading-relaxed">
                    Once activated, eligible candidates applying for this role will be invited to complete this assessment prior to evaluation.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-[#E6E0D6] bg-white p-5 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-28 rounded-md" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-6 w-3/4 rounded-md" />
                      <div className="space-y-2 pt-2">
                        <Skeleton className="h-10 w-full rounded-xl" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : questions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D6CEC2] bg-white p-8 sm:p-12 text-center shadow-2xs space-y-3">
                  <div className="size-12 rounded-full bg-cream mx-auto flex items-center justify-center text-terracotta">
                    <HelpCircle className="size-6" />
                  </div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-charcoal">
                    No questions added yet
                  </h3>
                  <p className="text-xs sm:text-sm text-[#78716C] max-w-md mx-auto leading-relaxed">
                    Build your assessment by using "Upload Excel" or "+ Add Question" at the top-right to create multiple-choice questions for candidate evaluation.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, idx) => {
                    const questionNumber = String(idx + 1).padStart(2, "0");
                    const optionsList = [
                      { label: "A" as const, text: q.option_a },
                      { label: "B" as const, text: q.option_b },
                      { label: "C" as const, text: q.option_c },
                      { label: "D" as const, text: q.option_d },
                    ];

                    return (
                      <div
                        key={q.id}
                        className="rounded-2xl border border-[#E6E0D6] bg-white p-5 sm:p-6 shadow-2xs space-y-4 hover:border-[#D6CEC2] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-cream text-charcoal border border-[#E6E0D6]">
                              Question {questionNumber}
                            </span>
                            <span className="text-[11px] font-mono text-[#78716C] uppercase">
                              Single Choice
                            </span>
                          </div>
                        </div>

                        <h4 className="text-sm sm:text-base font-semibold text-charcoal leading-snug">
                          {q.question_text}
                        </h4>

                        <div className="space-y-2 pt-1">
                          {optionsList.map(({ label, text }) => {
                            const isCorrect = q.correct_option === label;
                            return (
                              <div
                                key={label}
                                className={`flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm transition-colors ${isCorrect
                                  ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium"
                                  : "bg-[#FAF8F5] border-[#E6E0D6] text-charcoal"
                                  }`}
                              >
                                <div
                                  className={`size-4 rounded-full border flex items-center justify-center shrink-0 ${isCorrect
                                    ? "border-emerald-600 bg-emerald-600 text-white"
                                    : "border-[#C9C2B7] bg-white"
                                    }`}
                                >
                                  {isCorrect && (
                                    <div className="size-1.5 rounded-full bg-white" />
                                  )}
                                </div>

                                <span
                                  className={`size-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${isCorrect
                                    ? "bg-emerald-600 text-white"
                                    : "bg-[#F5F2EB] text-charcoal"
                                    }`}
                                >
                                  {label}
                                </span>

                                <span className="text-sm leading-normal flex-1">
                                  {text}
                                </span>

                                {isCorrect && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                    Correct
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4] text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                            <CheckCircle2 className="size-4 text-emerald-600" />
                            <span>Correct answer: Option {q.correct_option}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(q)}
                              disabled={derivedStatus === "STARTED" || derivedStatus === "CLOSED"}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-charcoal text-xs font-semibold transition-colors cursor-pointer shadow-3xs disabled:opacity-50"
                            >
                              <Edit3 className="size-3.5 text-[#78716C]" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingQuestion(q)}
                              disabled={derivedStatus === "STARTED" || derivedStatus === "CLOSED"}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors cursor-pointer shadow-3xs disabled:opacity-50"
                            >
                              <Trash2 className="size-3.5 text-red-600" />
                              <span>Delete</span>
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
        </div>

        {jobId && (
          <MCQQuestionModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            jobId={jobId}
            initialData={editingQuestion}
            onSuccess={handleQuestionSaved}
          />
        )}

        {jobId && (
          <ExcelUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            jobId={jobId}
            onSuccess={handleBulkImportSuccess}
          />
        )}

        <DeleteQuestionModal
          isOpen={Boolean(deletingQuestion)}
          onClose={() => setDeletingQuestion(null)}
          question={deletingQuestion}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
