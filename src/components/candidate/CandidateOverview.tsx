import { useState, useEffect } from "react"
import { ArrowUpRight } from "lucide-react"
import { useAppDispatch, useAppSelector } from "../../store"
import { withdrawApplication } from "../../store/slices/jobsSlice"
import { useUser } from "../../context/UserContext"
import { JobCard } from "../common/JobCard"

interface CandidateOverviewProps {
  onNavigateTab: (tab: string) => void;
  onWithdrawApplication?: (id: string) => void;
}

export function CandidateOverview({ onNavigateTab, onWithdrawApplication }: CandidateOverviewProps) {
  const { profile } = useUser();
  const dispatch = useAppDispatch();
  const jobs = useAppSelector((state) => state.jobs.jobs);
  const appliedJobIds = useAppSelector((state) => state.jobs.appliedJobIds);

  const appliedJobs = jobs.filter((j) => appliedJobIds.includes(j.id));
  const activeCount = appliedJobs.length;
  const avgMatch = appliedJobs.length > 0
    ? Math.round(appliedJobs.reduce((acc, j) => acc + (j.matchScore ?? 85), 0) / appliedJobs.length)
    : 89.4;
  const assessmentsCount = appliedJobs.filter((j) => j.requireAssessment).length;
  const shortlistedCount = Math.max(0, Math.floor(activeCount * 0.4));

  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(1);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const displayAvgMatch = (avgMatch * animatedProgress).toFixed(1);
  const displayApplications = Math.round((activeCount > 0 ? activeCount : 6) * animatedProgress);
  const displayAssessments = Math.round((assessmentsCount > 0 ? assessmentsCount : 4) * animatedProgress);
  const displayShortlisted = Math.round((shortlistedCount > 0 ? shortlistedCount : 2) * animatedProgress);

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "Recently";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Updated today";
    if (diffDays === 1) return "Updated yesterday";
    return `Updated ${diffDays}d ago`;
  };

  const getApplicationStage = (job: typeof jobs[0]) => {
    if (job.requireAssessment) {
      return "Assessment";
    }
    if ((job.matchScore ?? 0) >= 90) {
      return "Screening";
    }
    return "Applied";
  };

  const hasResume = Boolean(profile?.resumeName);
  const hasName = Boolean(profile?.name && profile.name.trim() !== "");
  const hasDob = Boolean(profile?.dob && profile.dob.trim() !== "");
  const isProfileComplete = hasResume && hasName && hasDob;

  const profileRows = [
    { label: "Resume", value: hasResume ? "Uploaded" : "Not added", isPositive: hasResume },
    { label: "Profile information", value: isProfileComplete ? "Complete" : "Incomplete", isPositive: isProfileComplete },
    { label: "Email", value: profile?.email || "Not provided", isPositive: Boolean(profile?.email) },
    { label: "Date of birth", value: hasDob ? "Added" : "Not added", isPositive: hasDob },
  ];

  const upcomingActions = appliedJobs
    .filter((j) => j.requireAssessment)
    .map((j) => ({
      id: j.id,
      title: `Assessment — ${j.title}`,
      subtitle: `${j.company} • Due ${j.deadline ? new Date(j.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Pending schedule"}`,
    }));

  const recommendedJobs = jobs
    .filter((j) => !appliedJobIds.includes(j.id))
    .slice(0, 3);

  const handleWithdraw = (jobId: string) => {
    dispatch(withdrawApplication(jobId));
    if (onWithdrawApplication) {
      onWithdrawApplication(jobId);
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
              <p className="text-[11px] text-emerald-700 font-medium mt-1">High Alignment</p>
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
            <span className="text-xs font-medium text-[#8E877D]">Applications</span>
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-4xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-charcoal leading-none">
                {displayApplications}
              </span>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">{activeCount} Active</p>
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
            <span className="text-xs font-medium text-[#8E877D]">Assessments</span>
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-4xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-charcoal leading-none">
                {displayAssessments}
              </span>
              <p className="text-[11px] text-amber-700 font-medium mt-1">Screening Tests</p>
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
            <span className="text-xs font-medium text-[#8E877D]">Shortlisted Roles</span>
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-4xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-charcoal leading-none">
                {displayShortlisted}
              </span>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">Interviews Pipeline</p>
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
            <h2 className="font-sans text-base sm:text-lg font-bold text-charcoal">Your Applications</h2>
            <p className="text-xs text-[#8E877D] mt-0.5">Track the progress of your recent job applications.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("jobs")}
            className="text-xs font-semibold text-terracotta hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto shrink-0"
          >
            <span>View All Applications</span>
            <ArrowUpRight className="size-3.5" />
          </button>
        </div>

        {appliedJobs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-charcoal">No active applications</p>
            <p className="text-xs text-[#8E877D] mt-1 max-w-sm mx-auto">
              Explore open positions in Browse Jobs and submit your application to track its progress here.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab("jobs")}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-terracotta-dark transition-colors cursor-pointer"
            >
              <span>Browse Open Jobs</span>
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F0ECE4]">
            {appliedJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5]/60 transition-colors"
              >
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-charcoal">{job.title}</h3>
                  <p className="text-xs text-[#78716C] mt-0.5">{job.company} &bull; {job.location}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 self-start sm:self-auto">
                  <div className="flex items-center gap-1.5 text-xs text-charcoal">
                    <span className="text-[#8E877D]">Stage:</span>
                    <span className="font-medium">{getApplicationStage(job)}</span>
                  </div>
                  {typeof job.matchScore === "number" && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded border text-emerald-700 bg-emerald-50 border-emerald-200">
                      {job.matchScore}% Match
                    </span>
                  )}
                  <span className="text-xs text-[#8E877D]">{formatRelativeTime(job.createdAt)}</span>
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
                <h2 className="font-sans text-base sm:text-lg font-bold text-charcoal">Profile Status</h2>
                <p className="text-xs text-[#8E877D] mt-0.5">Readiness of your profile information for recruiters.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("profile")}
                className="text-xs font-semibold text-terracotta hover:underline cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>{isProfileComplete ? "Edit Profile" : "Complete Profile"}</span>
                <ArrowUpRight className="size-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#F0ECE4] text-xs">
              {profileRows.map((row) => (
                <div key={row.label} className="py-2.5 flex items-center justify-between">
                  <span className="text-[#78716C] font-medium">{row.label}</span>
                  <span className={`font-medium ${row.isPositive ? "text-emerald-700" : "text-[#8E877D]"}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h2 className="font-sans text-base sm:text-lg font-bold text-charcoal">Upcoming Actions</h2>
              <p className="text-xs text-[#8E877D] mt-0.5">Required tasks and deadlines for submitted applications.</p>
            </div>

            {upcomingActions.length === 0 ? (
              <div className="py-6 text-center border-t border-[#F0ECE4]">
                <p className="text-xs font-semibold text-charcoal">No upcoming actions</p>
                <p className="text-xs text-[#8E877D] mt-0.5">All pending tasks for your applications are currently complete.</p>
              </div>
            ) : (
              <div className="space-y-2.5 pt-2 border-t border-[#F0ECE4]">
                {upcomingActions.map((action) => (
                  <div
                    key={action.id}
                    className="p-3 rounded-xl border border-[#F0ECE4] bg-[#FAF8F5]/60 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-semibold text-charcoal">{action.title}</p>
                      <p className="text-[11px] text-[#78716C] mt-0.5">{action.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-[#F0ECE4]">
          <div>
            <h2 className="font-sans text-base sm:text-lg font-bold text-charcoal">Recommended Jobs</h2>
            <p className="text-xs text-[#8E877D] mt-0.5">Jobs that match your experience and skills.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("jobs")}
            className="text-xs font-semibold text-terracotta hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto shrink-0"
          >
            <span>View All Jobs</span>
            <ArrowUpRight className="size-3.5" />
          </button>
        </div>

        {recommendedJobs.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs font-semibold text-charcoal">No recommendations available</p>
            <p className="text-xs text-[#8E877D] mt-0.5">You have applied to all available opportunities.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
            {recommendedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
