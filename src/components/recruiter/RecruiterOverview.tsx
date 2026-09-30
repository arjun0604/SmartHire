import { useState, useEffect, useMemo, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { ArrowUpRight } from "lucide-react"
import { useAppDispatch, useAppSelector } from "../../store"
import { fetchRecruiterJobsThunk, type Job } from "../../store/slices/jobsSlice"
import { fetchRecruiterApplicationsThunk, type Application } from "../../store/slices/applicationsSlice"
import { formatDisplayDate, getApplicationStatusBadgeClass } from "../../utils/formatters"
import { SemicircleMeter } from "../common/SemicircleMeter"

interface RecruiterOverviewProps {
  onNavigateTab: (tab: string) => void;
}

function useCountUp(target: number, duration: number = 850) {
  const [val, setVal] = useState(0);
  const currentValRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(target);
      currentValRef.current = target;
      return;
    }

    const start = currentValRef.current;
    const diff = target - start;
    if (diff === 0) {
      setVal(target);
      return;
    }

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const next = start + diff * ease;
      setVal(next);
      currentValRef.current = next;

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setVal(target);
        currentValRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration]);

  return val;
}

interface ActiveJobRowProps {
  job: Job;
  applications: Application[];
  onNavigate: (jobId: string) => void;
}

function ActiveJobRow({ job, applications, onNavigate }: ActiveJobRowProps) {
  const jobApps = applications.filter((a) => a.job_id === job.id);
  const candidatesCount = jobApps.length > 0 ? jobApps.length : (job.applicantCount ?? job.applicants ?? 0);
  const validScoresList = jobApps
    .map((a) => (typeof a.overall_score === "number" && !isNaN(a.overall_score) ? a.overall_score : null))
    .filter((s): s is number => s !== null);

  const rawMatch = validScoresList.length > 0
    ? validScoresList.reduce((acc, val) => acc + val, 0) / validScoresList.length
    : (job.averageMatch != null ? job.averageMatch : null);

  const hasScore = rawMatch != null;
  const isDecimal = validScoresList.length > 0;

  const animCandidates = useCountUp(candidatesCount, 850);
  const animMatch = useCountUp(hasScore ? rawMatch : 0, 850);

  const avgMatchDisplay = hasScore
    ? `${isDecimal ? animMatch.toFixed(1) : Math.round(animMatch)}% Match`
    : "No match yet";

  return (
    <div
      onClick={() => onNavigate(job.id)}
      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 hover:bg-cream/50 transition-colors cursor-pointer"
    >
      <div className="min-w-0">
        <h3 className="text-sm sm:text-base font-semibold text-charcoal truncate">{job.title}</h3>
        <p className="text-xs text-[#78716C] mt-0.5 truncate">
          <Link
            to={(job.company_id || (job as any).companyId) ? `/company/${job.company_id || (job as any).companyId}` : "/recruiter/company"}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-charcoal hover:text-terracotta hover:underline transition-colors cursor-pointer"
          >
            {job.company || "Google"}
          </Link>
          {" • "}{job.location}{" • "}{job.workMode || job.workMode || "On-site"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-5 self-start md:self-auto shrink-0">
        <div className="text-xs text-charcoal font-medium">
          {Math.round(animCandidates)} {candidatesCount === 1 ? "application" : "applications"}
        </div>
        <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          {avgMatchDisplay}
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full border text-emerald-700 bg-emerald-50 border-emerald-200">
          {job.status}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(job.id);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6E0D6] bg-white hover:bg-cream text-xs font-semibold text-charcoal transition-colors cursor-pointer shadow-3xs"
        >
          <span>View Candidates</span>
          <ArrowUpRight className="size-3.5 text-[#8E877D]" />
        </button>
      </div>
    </div>
  );
}

export function RecruiterOverview({ onNavigateTab }: RecruiterOverviewProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const jobs = useAppSelector((state) => state.jobs.recruiterJobs) || [];
  const hasFetchedJobs = useAppSelector((state) => state.jobs.hasFetchedRecruiterJobs);
  const applications = useAppSelector((state) => state.applications.jobApplications) || [];

  useEffect(() => {
    if (!hasFetchedJobs) {
      dispatch(fetchRecruiterJobsThunk());
    }
    dispatch(fetchRecruiterApplicationsThunk());
  }, [dispatch, hasFetchedJobs]);

  const activeJobs = useMemo(
    () => jobs.filter((j) => (j.status || "Active").toLowerCase() === "active"),
    [jobs]
  );

  const totalApplicationsCount = useMemo(() => {
    if (applications.length > 0) return applications.length;
    return activeJobs.reduce((acc, j) => acc + (j.applicantCount || j.applicants || 0), 0);
  }, [applications, activeJobs]);

  const validScores = useMemo(() => {
    return applications
      .map((a) => (typeof a.overall_score === "number" && !isNaN(a.overall_score) ? a.overall_score : null))
      .filter((s): s is number => s !== null);
  }, [applications]);

  const avgMatchScore = validScores.length > 0
    ? validScores.reduce((acc, val) => acc + val, 0) / validScores.length
    : 0;

  const screeningCount = useMemo(
    () => applications.filter((a) => a.status === "Screening").length,
    [applications]
  );
  const screeningRatio = totalApplicationsCount > 0 ? screeningCount / totalApplicationsCount : 0;
  const screeningPct = Math.round(screeningRatio * 100);

  const shortlistedCount = useMemo(
    () => applications.filter((a) => a.status === "Shortlisted").length,
    [applications]
  );
  const shortlistRatio = totalApplicationsCount > 0 ? shortlistedCount / totalApplicationsCount : 0;
  const shortlistPct = Math.round(shortlistRatio * 100);

  const appliedCount = useMemo(
    () => applications.filter((a) => a.status === "Applied").length,
    [applications]
  );

  const jobApplicantBars = useMemo(() => {
    const counts = activeJobs.map((j) => {
      const fromApps = applications.filter((a) => a.job_id === j.id).length;
      return fromApps || j.applicantCount || j.applicants || 0;
    });
    const maxCount = Math.max(...counts, 1);
    return Array.from({ length: 6 }).map((_, i) => {
      const count = counts[i];
      if (count !== undefined && count > 0) {
        return Math.max(20, Math.round((count / maxCount) * 100));
      }
      return count === 0 ? 12 : 10;
    });
  }, [activeJobs, applications]);

  const animAvgMatch = useCountUp(validScores.length > 0 ? avgMatchScore : 0, 850);
  const animTotalApplications = useCountUp(totalApplicationsCount, 850);
  const animScreening = useCountUp(screeningCount, 850);
  const animScreeningPct = useCountUp(screeningPct, 850);
  const animShortlisted = useCountUp(shortlistedCount, 850);
  const animShortlistPct = useCountUp(shortlistPct, 850);

  const displayAvgMatch = validScores.length > 0 ? animAvgMatch.toFixed(1) : "—";
  const displayTotalApplications = Math.round(animTotalApplications);
  const displayScreening = Math.round(animScreening);
  const displayShortlisted = Math.round(animShortlisted);

  const barFactor = totalApplicationsCount > 0 ? animTotalApplications / totalApplicationsCount : 1;

  const topActiveJobs = useMemo(() => {
    return [...activeJobs]
      .sort((a, b) => {
        const aApps = applications.filter((app) => app.job_id === a.id).length || a.applicantCount || a.applicants || 0;
        const bApps = applications.filter((app) => app.job_id === b.id).length || b.applicantCount || b.applicants || 0;
        return bApps - aApps;
      })
      .slice(0, 3);
  }, [activeJobs, applications]);

  const highMatchCount = useMemo(
    () => applications.filter((a) => (a.overall_score || 0) >= 80).length,
    [applications]
  );
  const highMatchPct = totalApplicationsCount > 0
    ? Math.round((highMatchCount / totalApplicationsCount) * 100)
    : 0;

  const mostActiveRole = useMemo(() => {
    if (activeJobs.length === 0) return null;
    let maxJob = activeJobs[0];
    let maxCount = -1;
    for (const job of activeJobs) {
      const count = applications.filter((a) => a.job_id === job.id).length || job.applicantCount || job.applicants || 0;
      if (count > maxCount) {
        maxCount = count;
        maxJob = job;
      }
    }
    return maxCount > 0 ? { job: maxJob, count: maxCount } : null;
  }, [activeJobs, applications]);

  const topMatchRole = useMemo(() => {
    if (activeJobs.length === 0) return null;
    let bestJob = null;
    let bestAvg = -1;
    for (const job of activeJobs) {
      const jobScores = applications
        .filter((a) => a.job_id === job.id && typeof a.overall_score === "number" && !isNaN(a.overall_score))
        .map((a) => a.overall_score as number);
      if (jobScores.length > 0) {
        const avg = jobScores.reduce((sum, val) => sum + val, 0) / jobScores.length;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestJob = job;
        }
      }
    }
    return bestJob && bestAvg > 0 ? { job: bestJob, avg: Math.round(bestAvg) } : null;
  }, [activeJobs, applications]);

  const recentActivities = useMemo(() => {
    return applications
      .map((app) => {
        const appliedDate = app.applied_at ? new Date(app.applied_at) : null;
        const appliedMs = appliedDate && !isNaN(appliedDate.getTime()) ? appliedDate.getTime() : 0;
        const changedDate = app.status_changed_at ? new Date(app.status_changed_at) : null;
        const changedMs = changedDate && !isNaN(changedDate.getTime()) ? changedDate.getTime() : 0;
        const jobName = app.job_title || "open role";

        let actionText = `Applied for ${jobName}`;
        let timestamp = app.applied_at;
        let timeMs = appliedMs;

        if (app.status === "Screening") {
          actionText = `Moved to Screening for ${jobName}`;
          timestamp = app.status_changed_at || app.applied_at;
          timeMs = changedMs > 0 ? changedMs : appliedMs;
        } else if (app.status === "Shortlisted") {
          actionText = `Shortlisted for ${jobName}`;
          timestamp = app.status_changed_at || app.applied_at;
          timeMs = changedMs > 0 ? changedMs : appliedMs;
        } else if (app.status === "Rejected") {
          actionText = `Rejected for ${jobName}`;
          timestamp = app.status_changed_at || app.applied_at;
          timeMs = changedMs > 0 ? changedMs : appliedMs;
        } else if (app.status === "Applied" && changedMs > 0 && Math.abs(changedMs - appliedMs) > 1000) {
          actionText = `Moved back to Applied for ${jobName}`;
          timestamp = app.status_changed_at as string;
          timeMs = changedMs;
        }

        return {
          app,
          actionText,
          timestamp,
          timeMs,
        };
      })
      .sort((a, b) => b.timeMs - a.timeMs || b.app.id.localeCompare(a.app.id))
      .slice(0, 5);
  }, [applications]);


  return (
    <div className="space-y-6 sm:space-y-7 w-full min-w-0 max-w-full overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4.5 w-full min-w-0">
        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8E877D]">Average AI Match</span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-charcoal leading-none">
                {displayAvgMatch !== "—" ? `${displayAvgMatch}%` : "—"}
              </span>
              <p className="text-[11px] text-[#78716C] font-medium mt-1.5">
                {validScores.length > 0 ? `Across ${validScores.length} applications` : "No scores calculated yet"}
              </p>
            </div>
            <div className="grid grid-cols-7 gap-1.5 p-1 shrink-0">
              {Array.from({ length: 28 }).map((_, i) => {
                const isLit = i < Math.round(28 * (animAvgMatch / 100));
                return (
                  <span
                    key={i}
                    className={`size-2 sm:size-2.5 rounded-full transition-all duration-700 ${
                      isLit ? "bg-emerald-600" : "bg-[#E6E0D6]"
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

        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8E877D]">Applications</span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-charcoal leading-none">
                {displayTotalApplications}
              </span>
              <p className="text-[11px] text-[#78716C] font-medium mt-1.5">
                Across {activeJobs.length} active {activeJobs.length === 1 ? "role" : "roles"}
              </p>
            </div>
            <div className="flex items-end gap-2 h-14 sm:h-16 px-1 pb-1 shrink-0">
              {jobApplicantBars.map((h, i) => (
                <div
                  key={i}
                  className="w-2.5 sm:w-3 rounded-full bg-emerald-500/80 transition-all duration-700 ease-out hover:bg-emerald-600"
                  style={{
                    height: `${Math.max(10, Math.round(h * barFactor))}%`,
                    transitionDelay: `${i * 70}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8E877D]">In Screening</span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-charcoal leading-none">
                {displayScreening}
              </span>
              <p className="text-[11px] text-[#78716C] font-medium mt-1.5">
                {screeningCount} of {totalApplicationsCount} applications
              </p>
            </div>
            <SemicircleMeter
              value={animScreeningPct}
              color="#3B82F6"
              textColor="text-blue-700"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8E877D]">Shortlisted Candidates</span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-charcoal leading-none">
                {displayShortlisted}
              </span>
              <p className="text-[11px] text-[#78716C] font-medium mt-1.5">
                {shortlistedCount} of {totalApplicationsCount} applications
              </p>
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
                  strokeDashoffset={138.2 - (138.2 * (animShortlistPct / 100))}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="absolute text-xs sm:text-sm font-semibold text-charcoal">
                {Math.round(animShortlistPct)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E6E0D6] bg-white shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#F0ECE4] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">Active Job Postings</h2>
            <p className="text-xs text-[#78716C] mt-0.5">Manage your current openings and candidate pipelines.</p>
          </div>
          {activeJobs.length > 3 && (
            <button
              type="button"
              onClick={() => onNavigateTab("postings")}
              className="text-xs font-semibold text-terracotta hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto shrink-0"
            >
              <span>View All ({activeJobs.length})</span>
              <ArrowUpRight className="size-3.5" />
            </button>
          )}
        </div>

        {activeJobs.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <p className="text-sm font-semibold text-charcoal">No active job postings</p>
            <p className="text-xs text-[#8E877D] mt-1 max-w-sm mx-auto">
              Create a job posting to start receiving applications and tracking recruitment pipelines.
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
            {topActiveJobs.map((job) => (
              <ActiveJobRow
                key={job.id}
                job={job}
                applications={applications}
                onNavigate={(jobId) =>
                  navigate(`/candidates/job/${jobId}`, {
                    state: {
                      from: "overview",
                      fromLabel: "Back to Overview",
                      fromPath: "/dashboard?tab=overview",
                      jobId,
                    },
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 w-full min-w-0">
        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="mb-4 pb-3 border-b border-[#F0ECE4]">
              <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">Hiring Insights</h2>
              <p className="text-xs text-[#78716C] mt-0.5">Real-time pipeline distribution and candidate quality analysis.</p>
            </div>

            {applications.length === 0 ? (
              <div className="py-8 sm:py-10 text-center">
                <p className="text-xs font-semibold text-charcoal">No hiring insights available</p>
                <p className="text-xs text-[#8E877D] mt-1 max-w-sm mx-auto">
                  Analytics and candidate distribution metrics will appear here as candidates submit applications.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#F0ECE4] bg-cream/40 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-charcoal">Pipeline Stage Distribution</span>
                    <span className="text-[#78716C]">{totalApplicationsCount} Total</span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-[#E6E0D6] overflow-hidden flex">
                    {totalApplicationsCount > 0 && (
                      <>
                        <div
                          style={{ width: `${(appliedCount / totalApplicationsCount) * 100}%` }}
                          className="bg-amber-400 h-full"
                          title={`Applied: ${appliedCount}`}
                        />
                        <div
                          style={{ width: `${(screeningCount / totalApplicationsCount) * 100}%` }}
                          className="bg-blue-500 h-full"
                          title={`Screening: ${screeningCount}`}
                        />
                        <div
                          style={{ width: `${(shortlistedCount / totalApplicationsCount) * 100}%` }}
                          className="bg-emerald-500 h-full"
                          title={`Shortlisted: ${shortlistedCount}`}
                        />
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-[#E6E0D6]/60">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-charcoal font-medium">{appliedCount} Applied</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-charcoal font-medium">{screeningCount} Screening</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-charcoal font-medium">{shortlistedCount} Shortlisted</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#F0ECE4] bg-white p-3.5">
                    <span className="text-[11px] font-medium text-[#8E877D] block">Strong Match Pool (≥80%)</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-sans text-xl font-bold text-charcoal">{highMatchCount}</span>
                      <span className="text-xs text-emerald-700 font-semibold">({highMatchPct}%)</span>
                    </div>
                    <p className="text-[11px] text-[#78716C] mt-1">High-alignment candidates ready for review</p>
                  </div>

                  <div className="rounded-xl border border-[#F0ECE4] bg-white p-3.5">
                    <span className="text-[11px] font-medium text-[#8E877D] block">Awaiting Initial Screening</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-sans text-xl font-bold text-charcoal">{appliedCount}</span>
                      <span className="text-xs text-amber-700 font-semibold">pending</span>
                    </div>
                    <p className="text-[11px] text-[#78716C] mt-1">New submissions requiring recruiter decision</p>
                  </div>
                </div>

                {(mostActiveRole || topMatchRole) && (
                  <div className="rounded-xl border border-[#F0ECE4] bg-cream/40 p-3.5 space-y-2">
                    {mostActiveRole && (
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="text-[#78716C] shrink-0">Highest Interest Role</span>
                        <span className="font-semibold text-charcoal truncate text-right">
                          {mostActiveRole.job.title} ({mostActiveRole.count} {mostActiveRole.count === 1 ? "applicant" : "applicants"})
                        </span>
                      </div>
                    )}
                    {topMatchRole && (
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="text-[#78716C] shrink-0">Top Match Alignment</span>
                        <span className="font-semibold text-emerald-800 truncate text-right">
                          {topMatchRole.job.title} ({topMatchRole.avg}% avg)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="mb-4 pb-3 border-b border-[#F0ECE4]">
              <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">Recruitment Activity</h2>
              <p className="text-xs text-[#78716C] mt-0.5">Recent candidate submissions and pipeline updates.</p>
            </div>

            {recentActivities.length === 0 ? (
              <div className="py-8 sm:py-10 text-center">
                <p className="text-xs font-semibold text-charcoal">No recruitment activity yet</p>
                <p className="text-xs text-[#8E877D] mt-1 max-w-sm mx-auto">
                  Recent application submissions and status updates will be logged here in real time.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F0ECE4]">
                {recentActivities.map(({ app, actionText, timestamp }) => {
                  const hasScore = typeof app.overall_score === "number" && !isNaN(app.overall_score);
                  return (
                    <div
                      key={app.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-cream/40 transition-colors first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-charcoal truncate">
                          {app.candidate_name || "Applicant"}
                        </p>
                        <p className="text-[11px] text-[#78716C] mt-0.5 truncate">
                          {actionText} • {formatDisplayDate(timestamp)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {hasScore && (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {Math.round(app.overall_score as number)}%
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getApplicationStatusBadgeClass(
                            app.status
                          )}`}
                        >
                          {app.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigate(`/candidates/job/${app.job_id}/application/${app.id}`, {
                              state: {
                                from: "overview",
                                fromLabel: "Back to Overview",
                                fromPath: "/dashboard?tab=overview",
                                jobId: app.job_id,
                                applicationId: app.id,
                              },
                            });
                          }}
                          className="inline-flex items-center gap-0.5 text-xs font-semibold text-terracotta hover:underline cursor-pointer"
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
      </div>
    </div>
  );
}
