import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileQuestion,
  Building2,
  MapPin,
  Briefcase,
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  X,
  Award,
} from "lucide-react";
import {
  fetchCandidateAssessmentsApi,
  CandidateAssessmentListItem,
} from "../../utils/api";

export function CandidateAssessments() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<CandidateAssessmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "Pending" | "In Progress" | "Completed">("ALL");
  const [selectedResult, setSelectedResult] = useState<CandidateAssessmentListItem | null>(null);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCandidateAssessmentsApi();
      setAssessments(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Failed to load assessments.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const counts = {
    all: assessments.length,
    pending: assessments.filter((a) => a.status === "Pending").length,
    inProgress: assessments.filter((a) => a.status === "In Progress").length,
    completed: assessments.filter((a) => a.status === "Completed").length,
  };

  const filteredAssessments = assessments.filter((a) => {
    if (filter === "ALL") return true;
    return a.status === filter;
  });

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">
            My Role Assessments
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Track and take recruiter-configured technical assessments for your submitted job applications.
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-cream/70 rounded-xl border border-[#E6E0D6] self-start sm:self-auto overflow-x-auto max-w-full">
          {(["ALL", "Pending", "In Progress", "Completed"] as const).map((tab) => {
            const count =
              tab === "ALL"
                ? counts.all
                : tab === "Pending"
                ? counts.pending
                : tab === "In Progress"
                ? counts.inProgress
                : counts.completed;
            const isSelected = filter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-white text-charcoal shadow-2xs border border-[#E6E0D6]"
                    : "text-[#78716C] hover:text-charcoal hover:bg-cream"
                }`}
              >
                {tab === "ALL" ? "All" : tab} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#E6E0D6] bg-white p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="size-7 text-terracotta animate-spin mb-3" />
          <p className="text-xs font-medium text-charcoal">Loading assessments...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center space-y-2">
          <p className="text-xs font-semibold text-rose-700">{error}</p>
          <button
            type="button"
            onClick={loadAssessments}
            className="text-xs font-semibold text-terracotta hover:underline cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E6E0D6] bg-white p-8 sm:p-12 text-center space-y-2.5">
          <FileQuestion className="size-10 text-[#A8A199] mx-auto" />
          <h3 className="font-serif text-base font-semibold text-charcoal">
            {filter === "ALL" ? "No Assessments Available" : `No ${filter} Assessments`}
          </h3>
          <p className="text-xs text-[#78716C] max-w-sm mx-auto">
            {filter === "ALL"
              ? "Assessments will appear here once you apply to jobs that have technical assessments configured."
              : `You have no assessments currently marked as ${filter.toLowerCase()}.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {filteredAssessments.map((item) => {
            const isCompleted = item.status === "Completed";
            const isInProgress = item.status === "In Progress";
            const isPending = item.status === "Pending";

            return (
              <div
                key={item.application_id}
                className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-[#D0C8B8] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-cream border border-[#E6E0D6] text-terracotta font-semibold">
                        {item.assessment_type || "MCQ"}
                      </span>
                      {item.total_questions > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-[#78716C] bg-stone-50 border border-stone-200">
                          {item.total_questions} {item.total_questions === 1 ? "Question" : "Questions"}
                        </span>
                      )}
                    </div>

                    <div>
                      {isCompleted && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          <span>Assessment Completed</span>
                        </span>
                      )}
                      {isInProgress && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                          <Clock className="size-3 text-sky-600" />
                          <span>Assessment In Progress</span>
                        </span>
                      )}
                      {isPending && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="size-3 text-amber-600" />
                          <span>Assessment Pending</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-serif text-base sm:text-lg font-bold text-charcoal">
                    {item.job_title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-[#78716C] mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-charcoal">
                      <Building2 className="size-3.5 text-[#A8A199]" />
                      <span>{item.company_name}</span>
                    </span>
                    {item.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5 text-[#A8A199]" />
                        <span>{item.location}</span>
                      </span>
                    )}
                    {item.work_mode && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="size-3.5 text-[#A8A199]" />
                        <span>{item.work_mode}</span>
                      </span>
                    )}
                  </div>

                  {isCompleted && (
                    <div className="mt-4 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[11px] text-[#78716C] block">Final Score</span>
                        <span className="font-bold text-emerald-800 text-sm">
                          {item.score ?? 0} / {item.total_questions}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-[#78716C] block">Accuracy</span>
                        <span className="font-semibold text-charcoal text-xs">
                          {item.total_questions > 0
                            ? `${Math.round(((item.score ?? 0) / item.total_questions) * 100)}%`
                            : "0%"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#F0ECE4]">
                  {isPending && (
                    <>
                      {item.can_start ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/candidate/jobs/${item.job_id}/assessment`)}
                          className="w-full py-2.5 px-4 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <span>Start Assessment</span>
                          <ArrowUpRight className="size-3.5" />
                        </button>
                      ) : (
                        <div className="text-center py-2 px-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-[#78716C]">
                          Waiting for recruiter activation
                        </div>
                      )}
                    </>
                  )}

                  {isInProgress && (
                    <button
                      type="button"
                      onClick={() => navigate(`/candidate/jobs/${item.job_id}/assessment`)}
                      className="w-full py-2.5 px-4 rounded-xl bg-charcoal hover:bg-black text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>Resume Assessment</span>
                      <ArrowRight className="size-3.5" />
                    </button>
                  )}

                  {isCompleted && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.attempt_id) {
                            navigate(`/candidate/assessment-attempts/${item.attempt_id}`);
                          } else {
                            setSelectedResult(item);
                          }
                        }}
                        className="w-full py-2 px-3 rounded-xl border border-[#E6E0D6] bg-white hover:bg-cream text-charcoal text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <Award className="size-3.5 text-terracotta" />
                        <span>View Result</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#E6E0D6] rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">Assessment Result</span>
              <button
                type="button"
                onClick={() => setSelectedResult(null)}
                className="p-1 rounded-lg text-[#78716C] hover:bg-cream cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="size-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-7" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-charcoal">
                {selectedResult.job_title}
              </h3>
              <p className="text-xs text-[#78716C] mt-0.5">{selectedResult.company_name}</p>
            </div>
            <div className="p-4 bg-cream/50 rounded-xl border border-[#E6E0D6] space-y-2 text-xs text-left">
              <div className="flex justify-between items-center text-[#78716C]">
                <span>Status</span>
                <span className="font-semibold text-emerald-700">Completed</span>
              </div>
              <div className="flex justify-between items-center text-[#78716C]">
                <span>Correct Answers</span>
                <span className="font-semibold text-charcoal">
                  {selectedResult.score ?? 0} of {selectedResult.total_questions}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#78716C]">
                <span>Accuracy</span>
                <span className="font-semibold text-charcoal">
                  {selectedResult.total_questions > 0
                    ? `${Math.round(((selectedResult.score ?? 0) / selectedResult.total_questions) * 100)}%`
                    : "0%"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedResult(null)}
              className="w-full py-2.5 px-4 bg-charcoal hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
