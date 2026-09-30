import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import {
  startJobAssessmentApi,
  fetchAssessmentAttemptApi,
  saveAssessmentAnswerApi,
  markQuestionReviewApi,
  submitAssessmentApi,
  CandidateAssessmentAttempt,
} from "../utils/api";

export function CandidateAssessmentPage() {
  const { jobId, attemptId } = useParams<{ jobId?: string; attemptId?: string }>();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<CandidateAssessmentAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<Record<string, boolean>>({});
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const autoSubmittedRef = useRef(false);

  const handleSubmit = useCallback(async () => {
    if (!attempt || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await submitAssessmentApi(attempt.id);
      setIsSubmitted(true);
      setShowSubmitModal(false);
      setAttempt((prev) =>
        prev
          ? {
              ...prev,
              status: "SUBMITTED",
              submitted_at: res.submitted_at,
              score: res.score,
              percentage: res.percentage,
              time_taken_seconds: res.time_taken_seconds,
            }
          : prev
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Failed to submit assessment.";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [attempt, isSubmitting]);

  useEffect(() => {
    let isMounted = true;

    async function loadAttempt() {
      try {
        setLoading(true);
        setError(null);

        let data: CandidateAssessmentAttempt;
        if (attemptId) {
          data = await fetchAssessmentAttemptApi(attemptId);
        } else if (jobId) {
          data = await startJobAssessmentApi(jobId);
        } else {
          throw new Error("Missing job or attempt identifier");
        }

        if (!isMounted) return;

        setAttempt(data);

        const initialAnswers: Record<string, string> = {};
        const initialReviews: Record<string, boolean> = {};
        data.questions.forEach((q) => {
          if (q.selected_option) {
            initialAnswers[q.question_id] = q.selected_option;
          }
          if (q.is_marked_for_review) {
            initialReviews[q.question_id] = true;
          }
        });
        setAnswers(initialAnswers);
        setReviews(initialReviews);

        if (data.status === "SUBMITTED" || data.status === "EXPIRED") {
          setIsSubmitted(true);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : "Failed to load assessment.";
        setError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAttempt();

    return () => {
      isMounted = false;
    };
  }, [jobId, attemptId]);

  useEffect(() => {
    if (!attempt || isSubmitted || !attempt.expires_at) return;

    const expiresTime = new Date(attempt.expires_at).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((expiresTime - now) / 1000));
      setRemainingSeconds(diffSecs);

      if (diffSecs <= 0 && !autoSubmittedRef.current && !isSubmitting) {
        autoSubmittedRef.current = true;
        handleSubmit();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [attempt, isSubmitted, isSubmitting, handleSubmit]);

  const currentQuestion = useMemo(() => {
    if (!attempt || !attempt.questions || attempt.questions.length === 0) return null;
    return attempt.questions[currentIndex] || null;
  }, [attempt, currentIndex]);

  const totalQuestions = attempt?.questions?.length || 0;

  const answeredCount = useMemo(() => {
    return Object.keys(answers).length;
  }, [answers]);

  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  const formattedTimeRemaining = useMemo(() => {
    if (remainingSeconds === null) return "--:--";
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [remainingSeconds]);

  const isTimeCritical = remainingSeconds !== null && remainingSeconds < 300;

  const handleSelectOption = async (optionKey: string) => {
    if (!attempt || !currentQuestion || isSubmitted || savingQuestionId) return;

    const qId = currentQuestion.question_id;
    setAnswers((prev) => ({ ...prev, [qId]: optionKey }));
    setSavingQuestionId(qId);

    try {
      await saveAssessmentAnswerApi(attempt.id, qId, optionKey);
    } catch (err) {
      console.error("Failed to save answer:", err);
    } finally {
      setSavingQuestionId(null);
    }
  };

  const handleClearResponse = async () => {
    if (!attempt || !currentQuestion || isSubmitted || savingQuestionId) return;

    const qId = currentQuestion.question_id;
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
    setSavingQuestionId(qId);

    try {
      await saveAssessmentAnswerApi(attempt.id, qId, null);
    } catch (err) {
      console.error("Failed to clear response:", err);
    } finally {
      setSavingQuestionId(null);
    }
  };

  const handleToggleReview = async () => {
    if (!attempt || !currentQuestion || isSubmitted) return;

    const qId = currentQuestion.question_id;
    const nextState = !reviews[qId];

    setReviews((prev) => ({ ...prev, [qId]: nextState }));

    try {
      await markQuestionReviewApi(attempt.id, qId, nextState);
    } catch (err) {
      console.error("Failed to update review state:", err);
    }
  };

  const handleSaveAndNext = async () => {
    if (attempt && currentQuestion && selectedForCurrent && savingQuestionId !== currentQuestion.question_id) {
      try {
        setSavingQuestionId(currentQuestion.question_id);
        await saveAssessmentAnswerApi(attempt.id, currentQuestion.question_id, selectedForCurrent);
      } catch (err) {
        console.error("Failed to save answer:", err);
      } finally {
        setSavingQuestionId(null);
      }
    }
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
        <Loader2 className="size-8 text-terracotta animate-spin mb-3" />
        <p className="text-xs font-semibold text-charcoal">Loading assessment interface...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-[#E6E0D6] rounded-2xl p-6 sm:p-8 text-center shadow-sm">
          <div className="size-12 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="font-serif text-xl font-bold text-charcoal mb-2">
            Assessment Unavailable
          </h2>
          <p className="text-xs sm:text-sm text-[#78716C] mb-6 leading-relaxed">
            {error}
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard?tab=assessments")}
            className="w-full py-2.5 px-4 bg-terracotta hover:bg-terracotta-dark text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitted && attempt) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white border border-[#E6E0D6] rounded-2xl p-6 sm:p-8 text-center shadow-lg animate-in fade-in duration-200">
          <div className="size-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="size-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream border border-[#E6E0D6] text-terracotta font-mono text-[11px] font-semibold uppercase mb-3">
            <span>MCQ Assessment Completed</span>
          </div>

          <h2 className="font-serif text-2xl font-bold text-charcoal mb-1">
            Assessment Submitted
          </h2>
          <p className="text-xs sm:text-sm text-[#78716C] mb-6 leading-relaxed">
            Your responses for <span className="font-semibold text-charcoal">{attempt.job_title || "the role"}</span> have been evaluated and recorded.
          </p>

          <div className="p-4 bg-cream/50 border border-[#E6E0D6] rounded-xl mb-6 text-xs text-left space-y-2.5">
            <div className="flex justify-between items-center text-[#78716C]">
              <span>Role Title</span>
              <span className="font-semibold text-charcoal">{attempt.job_title || "Role"}</span>
            </div>
            <div className="flex justify-between items-center text-[#78716C]">
              <span>Company</span>
              <span className="font-semibold text-charcoal">{attempt.company_name || "SmartHire Partner"}</span>
            </div>
            <div className="flex justify-between items-center text-[#78716C]">
              <span>Questions Answered</span>
              <span className="font-semibold text-charcoal">{answeredCount} of {totalQuestions}</span>
            </div>
            {attempt.score !== undefined && attempt.score !== null && (
              <div className="flex justify-between items-center text-[#78716C] pt-2 border-t border-[#E6E0D6]">
                <span className="font-medium text-charcoal">Score Result</span>
                <span className="font-bold text-emerald-800 text-sm">
                  {attempt.score} / {totalQuestions} ({totalQuestions > 0 ? Math.round((attempt.score / totalQuestions) * 100) : 0}%)
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/dashboard?tab=assessments")}
              className="flex-1 py-2.5 px-4 bg-terracotta hover:bg-terracotta-dark text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Back to My Assessments
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard?tab=applications")}
              className="flex-1 py-2.5 px-4 border border-[#E6E0D6] hover:bg-cream text-charcoal rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              View Applications
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!attempt || !currentQuestion) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
        <p className="text-sm text-[#78716C]">No questions found in this assessment.</p>
      </div>
    );
  }

  const selectedForCurrent = answers[currentQuestion.question_id];
  const isCurrentMarkedForReview = Boolean(reviews[currentQuestion.question_id]);
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col text-charcoal">
      <header className="bg-white border-b border-[#E6E0D6] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[11px] font-mono uppercase tracking-wider text-terracotta font-semibold block">
              MCQ Assessment &bull; {totalQuestions} Questions &bull; {attempt.duration_minutes || 30} mins
            </span>
            <h1 className="font-serif text-sm sm:text-base font-bold text-charcoal truncate">
              {attempt.job_title || "Assessment"}
            </h1>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <div className="text-right">
              <span className="text-[10px] sm:text-[11px] text-[#78716C] block uppercase font-mono tracking-wider">
                Time Remaining
              </span>
              <div
                className={`font-mono text-base sm:text-lg font-bold flex items-center gap-1.5 justify-end ${
                  isTimeCritical ? "text-rose-600 animate-pulse" : "text-charcoal"
                }`}
              >
                <Clock className="size-4 shrink-0 text-current" />
                <span>{formattedTimeRemaining}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs shrink-0"
            >
              Submit Assessment
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <aside className="lg:col-span-4 bg-white border border-[#E6E0D6] rounded-2xl p-5 shadow-2xs space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal font-sans">
                  Your Progress
                </h3>
                <span className="text-xs font-bold font-mono text-terracotta">
                  {answeredCount}/{totalQuestions} answered
                </span>
              </div>
              <div className="w-full bg-[#E6E0D6] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-terracotta h-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#F0ECE4]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-charcoal font-sans">
                  Questions
                </h4>
                <span className="text-[11px] text-[#78716C]">
                  Click to jump
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2">
                {attempt.questions.map((q, idx) => {
                  const isAnswered = Boolean(answers[q.question_id]);
                  const isMarked = Boolean(reviews[q.question_id]);
                  const isCurrent = idx === currentIndex;

                  let styleClass = "bg-white border-[#E6E0D6] text-charcoal hover:bg-cream";
                  if (isCurrent) {
                    styleClass = "bg-charcoal text-white border-charcoal ring-2 ring-terracotta shadow-xs";
                  } else if (isAnswered && isMarked) {
                    styleClass = "bg-emerald-50 border-amber-400 text-emerald-900 ring-1 ring-amber-300";
                  } else if (isAnswered) {
                    styleClass = "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold";
                  } else if (isMarked) {
                    styleClass = "bg-amber-50 border-amber-300 text-amber-900";
                  }

                  return (
                    <button
                      key={q.question_id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`relative h-10 rounded-xl border text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${styleClass}`}
                    >
                      <span>{idx + 1}</span>
                      {isMarked && (
                        <span className="absolute top-1 right-1 size-2 rounded-full bg-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[#F0ECE4] grid grid-cols-2 gap-2 text-[11px] text-[#78716C]">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-emerald-100 border border-emerald-300" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-white border border-[#E6E0D6]" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-amber-100 border border-amber-300" />
                <span>Marked for review</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-charcoal ring-1 ring-terracotta" />
                <span>Current</span>
              </div>
            </div>
          </aside>

          <main className="lg:col-span-8 bg-white border border-[#E6E0D6] rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0ECE4]">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-lg bg-cream font-mono text-xs font-bold text-terracotta border border-[#E6E0D6]">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {savingQuestionId === currentQuestion.question_id && (
                  <span className="text-[11px] text-terracotta flex items-center gap-1 font-medium">
                    <Loader2 className="size-3 animate-spin" /> Autosaving...
                  </span>
                )}
                {selectedForCurrent && savingQuestionId !== currentQuestion.question_id && (
                  <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="size-3" /> Answer saved
                  </span>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-medium text-charcoal leading-relaxed whitespace-pre-wrap">
                {currentQuestion.question_text}
              </h2>
            </div>

            <div className="space-y-3 pt-2">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedForCurrent === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => handleSelectOption(option.key)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                      isSelected
                        ? "border-terracotta bg-terracotta/5 shadow-2xs ring-1 ring-terracotta/20"
                        : "border-[#E6E0D6] bg-white hover:bg-cream/60 hover:border-[#D0C8B8]"
                    }`}
                  >
                    <div
                      className={`size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? "bg-terracotta text-white"
                          : "bg-[#F0ECE4] text-charcoal border border-[#D0C8B8]"
                      }`}
                    >
                      {option.key}
                    </div>
                    <span
                      className={`text-xs sm:text-sm leading-relaxed flex-1 ${
                        isSelected ? "font-semibold text-charcoal" : "text-[#4A453E]"
                      }`}
                    >
                      {option.text}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-[#F0ECE4] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleToggleReview}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                  isCurrentMarkedForReview
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "border-[#E6E0D6] text-[#78716C] hover:bg-cream"
                }`}
              >
                <Bookmark className="size-3.5 fill-current" />
                <span>{isCurrentMarkedForReview ? "Marked for review" : "Mark for review"}</span>
              </button>

              <button
                type="button"
                disabled={!selectedForCurrent}
                onClick={handleClearResponse}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#78716C] hover:text-charcoal hover:bg-cream border border-[#E6E0D6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>Clear response</span>
              </button>
            </div>

            <div className="pt-4 border-t border-[#F0ECE4] flex items-center justify-between gap-4">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-[#E6E0D6] rounded-xl text-xs font-semibold text-charcoal hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="size-4" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndNext}
                disabled={isSubmitted}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2 bg-charcoal hover:bg-black text-white rounded-xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
              >
                <span>Save & Next</span>
                <ChevronRight className="size-4" />
              </button>
            </div>
          </main>
        </div>
      </div>

      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#E6E0D6] rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl">
            <div className="size-12 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <HelpCircle className="size-6" />
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-charcoal">
                {unansweredCount > 0 ? "Incomplete Assessment" : "Submit Assessment?"}
              </h3>
              <p className="text-xs text-[#78716C] mt-2 leading-relaxed">
                {unansweredCount > 0
                  ? `You have ${unansweredCount} unanswered questions.\n\nAre you sure you want to submit?`
                  : "Submit your assessment?\n\nYou won't be able to change your answers after submission."}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2 px-3 border border-[#E6E0D6] rounded-xl text-xs font-semibold text-charcoal hover:bg-cream transition-colors cursor-pointer"
              >
                Continue Assessment
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Assessment</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CandidateAssessmentPage;
