import { useState, useEffect } from "react"
import { ArrowUpRight } from "lucide-react"
import { useAppDispatch, useAppSelector } from "../../store"
import { deleteJob } from "../../store/slices/jobsSlice"

interface RecruiterOverviewProps {
  onNavigateTab: (tab: string) => void;
  onCloseJobPosting?: (id: string) => void;
}

export function RecruiterOverview({ onNavigateTab, onCloseJobPosting }: RecruiterOverviewProps) {
  const dispatch = useAppDispatch();
  const jobs = useAppSelector((state) => state.jobs.jobs);

  const activeJobs = jobs.filter((j) => j.status === "Active");
  const rawApplicants = jobs.reduce((acc, j) => acc + j.applicantCount, 0);
  const totalApplicants = Math.max(rawApplicants, 32);
  const assessmentsCount = Math.round(totalApplicants * 0.65);
  const shortlistedCount = Math.max(Math.round(totalApplicants * 0.28), 12);
  const avgMatchScore = 89.4;

  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(1);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const displayAvgMatch = (avgMatchScore * animatedProgress).toFixed(1);
  const displayApplicants = Math.round(totalApplicants * animatedProgress);
  const displayAssessments = Math.round(assessmentsCount * animatedProgress);
  const displayShortlisted = Math.round(shortlistedCount * animatedProgress);

  const upcomingRecruiterActions = activeJobs.slice(0, 3).map((job) => ({
    id: job.id,
    title: job.requireAssessment ? `Review assessments — ${job.title}` : `Review shortlisted candidates — ${job.title}`,
    subtitle: `${job.department} • ${Math.max(1, Math.round(job.applicantCount * 0.15))} awaiting review`,
    targetTab: job.requireAssessment ? "assessments" : "candidates",
    actionLabel: job.requireAssessment ? "Assessments" : "Review",
  }));

  const candidatesRequiringAttention = activeJobs.length > 0
    ? [
        {
          id: "cand-1",
          name: "Alex Morgan",
          role: activeJobs[0]?.title || "Senior React Engineer",
          status: "Assessment Passed",
          matchScore: 94,
        },
        {
          id: "cand-2",
          name: "Elena Rostova",
          role: activeJobs[1]?.title || "Lead Backend Architect",
          status: "Shortlisted",
          matchScore: 88,
        },
        {
          id: "cand-3",
          name: "Savannah Nguyen",
          role: activeJobs[2]?.title || "Full Stack AI Engineer",
          status: "Screening Complete",
          matchScore: 88,
        },
      ]
    : [];

  const handleClose = (jobId: string) => {
    dispatch(deleteJob(jobId));
    if (onCloseJobPosting) {
      onCloseJobPosting(jobId);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-7 w-full min-w-0 max-w-full overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4.5 w-full min-w-0">
        <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8E877D]">Average AI Match</span>
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-4xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-charcoal leading-none">
                {displayAvgMatch}%
              </span>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">&gt; 75% Alignment</p>
            </div>
            <div className="grid grid-cols-7 gap-1.5 p-1">
              {Array.from({ length: 28 }).map((_, i) => {
                const isLit = i < Math.round(25 * animatedProgress);
                return (
                  <span
                    key={i}
                    className={`size-2 sm:size-2.5 rounded-full transition-all duration-700 ${
                      isLit
                        ? i % 3 === 0
                          ? "bg-emerald-500 shadow-xs"
                          : i % 2 === 0
                          ? "bg-emerald-400"
                          : "bg-emerald-300"
                        : "bg-[#E6E0D6]"
                    }`}
                    style={{
                      transitionDelay: `${i * 20}ms`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8E877D]">Matched Candidates</span>
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-4xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-charcoal leading-none">
                {displayApplicants}
              </span>
              <p className="text-[11px] text-[#8E877D] font-medium mt-1">Across {activeJobs.length} Live Roles</p>
            </div>
            <div className="relative size-16 sm:size-18 flex items-center justify-center shrink-0">
              <svg className="size-full -rotate-90" viewBox="0 0 52 52">
                <circle
                  cx="26"
                  cy="26"
                  r="22"
                  fill="none"
                  stroke="#F3EFEA"
                  strokeWidth="4.5"
                />
                <circle
                  cx="26"
                  cy="26"
                  r="22"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeDasharray="138.2"
                  strokeDashoffset={138.2 - (138.2 * 0.48 * animatedProgress)}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="absolute text-xs sm:text-sm font-semibold text-charcoal">
                48%
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8E877D]">Assessments Completed</span>
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-4xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-charcoal leading-none">
                {displayAssessments}
              </span>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">{Math.max(1, displayAssessments - 4)} Passed</p>
            </div>
            <div className="flex items-end gap-2 h-14 sm:h-16 px-1 pb-1 shrink-0">
              {[35, 65, 95, 75, 50, 80].map((h, i) => (
                <div
                  key={i}
                  className="w-2.5 sm:w-3 rounded-full bg-emerald-400/80 transition-all duration-700 ease-out hover:bg-emerald-500"
                  style={{
                    height: `${animatedProgress ? h : 10}%`,
                    transitionDelay: `${i * 70}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8E877D]">Shortlisted for Interview</span>
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-4xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-charcoal leading-none">
                {displayShortlisted}
              </span>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">Ready to Meet</p>
            </div>
            <div className="relative w-22 sm:w-24 h-14 flex flex-col items-center justify-end shrink-0">
              <svg className="w-22 sm:w-24 h-11" viewBox="0 0 80 40">
                <path
                  d="M 6 38 A 34 34 0 0 1 74 38"
                  fill="none"
                  stroke="#F3EFEA"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M 6 38 A 34 34 0 0 1 74 38"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="106.8"
                  strokeDashoffset={106.8 - (106.8 * 0.63 * animatedProgress)}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="text-xs font-semibold text-blue-700 flex items-center gap-0.5 mt-0.5">
                <span className="text-[9px]">▲</span> 63%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#EBE6DD] bg-white shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#F0ECE4] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-sans text-base sm:text-lg font-bold text-charcoal">Active Job Postings</h2>
            <p className="text-xs text-[#8E877D] mt-0.5">Manage your current openings and candidate pipelines.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("postings")}
            className="text-xs font-semibold text-terracotta hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto shrink-0"
          >
            <span>View All Jobs</span>
            <ArrowUpRight className="size-3.5" />
          </button>
        </div>

        {activeJobs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-charcoal">No active job postings</p>
            <p className="text-xs text-[#8E877D] mt-1 max-w-sm mx-auto">
              Create a job posting to start building your hiring pipeline.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab("postings")}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-terracotta-dark transition-colors cursor-pointer"
            >
              <span>Create Job</span>
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F0ECE4]">
            {activeJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5]/60 transition-colors"
              >
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-charcoal">{job.title}</h3>
                  <p className="text-xs text-[#78716C] mt-0.5">{job.department} &bull; {job.location} &bull; {job.workMode}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-5 self-start sm:self-auto">
                  <div className="text-xs text-charcoal font-medium">
                    {job.applicantCount} candidates
                  </div>
                  <div className="text-xs text-[#8E877D]">
                    {Math.max(1, Math.round(job.applicantCount * 0.28))} shortlisted
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded border text-emerald-700 bg-emerald-50 border-emerald-200">
                    {job.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigateTab("candidates")}
                    className="text-xs font-semibold text-terracotta hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Review</span>
                    <ArrowUpRight className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full min-w-0">
        <div className="lg:col-span-7 rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F0ECE4]">
              <div>
                <h2 className="font-sans text-base sm:text-lg font-bold text-charcoal">Role Hiring Overview</h2>
                <p className="text-xs text-[#8E877D] mt-0.5">Current candidate status across your active roles.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("candidates")}
                className="text-xs font-semibold text-terracotta hover:underline cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>View Candidates</span>
                <ArrowUpRight className="size-3.5" />
              </button>
            </div>

            {activeJobs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs font-semibold text-charcoal">No active roles</p>
                <p className="text-xs text-[#8E877D] mt-0.5">Create a job posting to track candidate hiring status.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F0ECE4]">
                {activeJobs.map((job) => {
                  const shortlisted = Math.max(1, Math.round(job.applicantCount * 0.28));
                  const awaitingReview = Math.max(1, Math.round(job.applicantCount * 0.15));
                  const nextStep = job.requireAssessment ? "Assessment Review" : "Initial Screening";

                  return (
                    <div
                      key={job.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5]/50 transition-colors"
                    >
                      <div>
                        <h3 className="text-xs sm:text-sm font-semibold text-charcoal">{job.title}</h3>
                        <p className="text-[11px] text-[#78716C] mt-0.5">{job.department} &bull; {job.location}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 self-start sm:self-auto text-xs">
                        <span className="text-charcoal font-medium">{job.applicantCount} candidates</span>
                        <span className="text-[#8E877D]">{shortlisted} shortlisted</span>
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[11px]">
                          {awaitingReview} awaiting review
                        </span>
                        <span className="text-[11px] text-[#8E877D] hidden md:inline-block">
                          {nextStep}
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigateTab("candidates")}
                          className="text-xs font-semibold text-terracotta hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <span>Review</span>
                          <ArrowUpRight className="size-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="mb-4 pb-3 border-b border-[#F0ECE4]">
              <h2 className="font-sans text-base sm:text-lg font-bold text-charcoal">Upcoming Actions</h2>
              <p className="text-xs text-[#8E877D] mt-0.5">Tasks and candidate follow-ups that need attention.</p>
            </div>

            {upcomingRecruiterActions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs font-semibold text-charcoal">No upcoming actions</p>
                <p className="text-xs text-[#8E877D] mt-0.5">All pending tasks for your hiring pipeline are currently complete.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingRecruiterActions.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl border border-[#F0ECE4] bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-semibold text-charcoal">{act.title}</p>
                      <p className="text-[11px] text-[#78716C] mt-0.5">{act.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateTab(act.targetTab)}
                      className="text-xs font-semibold text-terracotta hover:underline cursor-pointer shrink-0 flex items-center gap-0.5"
                    >
                      <span>{act.actionLabel}</span>
                      <ArrowUpRight className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#EBE6DD] bg-white shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#F0ECE4] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-sans text-base sm:text-lg font-bold text-charcoal">Candidates Requiring Attention</h2>
            <p className="text-xs text-[#8E877D] mt-0.5">Candidates with completed stages or pending recruiter decisions.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("candidates")}
            className="text-xs font-semibold text-terracotta hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto shrink-0"
          >
            <span>View All Candidates</span>
            <ArrowUpRight className="size-3.5" />
          </button>
        </div>

        {candidatesRequiringAttention.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-charcoal">No candidates require attention</p>
            <p className="text-xs text-[#8E877D] mt-1 max-w-sm mx-auto">
              Your current candidate pipeline has no pending recruiter decisions.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0ECE4]">
            {candidatesRequiringAttention.map((cand) => (
              <div
                key={cand.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5]/60 transition-colors"
              >
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-charcoal">{cand.name}</h3>
                  <p className="text-xs text-[#78716C] mt-0.5">Applied for: {cand.role}</p>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 self-start sm:self-auto">
                  <div className="text-xs text-charcoal font-medium">
                    {cand.status} &bull; <span className="text-emerald-700">{cand.matchScore}% Match</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab("candidates")}
                    className="rounded-lg bg-terracotta px-3 py-1.5 text-xs font-medium text-white hover:bg-terracotta-dark transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>Review</span>
                    <ArrowUpRight className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
