import { useState, useEffect, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowUpRight, Bookmark, Briefcase } from "lucide-react"
import { useAppDispatch, useAppSelector } from "../../store"
import { fetchCandidateApplicationsThunk } from "../../store/slices/applicationsSlice"
import { fetchJobsThunk } from "../../store/slices/jobsSlice"
import { useUser } from "../../context/UserContext"
import { JobCard } from "../common/JobCard"
import { formatDisplayDate, getApplicationStatusBadgeClass } from "../../utils/formatters"
import { SemicircleMeter } from "../common/SemicircleMeter"

interface CandidateOverviewProps {
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

export function CandidateOverview({ onNavigateTab }: CandidateOverviewProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { profile, savedJobIds } = useUser();
  const jobs = useAppSelector((state) => state.jobs.jobs) || [];
  const applications = useAppSelector((state) => state.applications.candidateApplications) || [];
  const hasFetchedJobs = useAppSelector((state) => state.jobs.hasFetchedJobs);

  useEffect(() => {
    if (profile?.candidateId) {
      dispatch(fetchCandidateApplicationsThunk(profile.candidateId));
    }
    if (!hasFetchedJobs) {
      dispatch(fetchJobsThunk());
    }
  }, [dispatch, profile?.candidateId, hasFetchedJobs]);

  const appliedCount = useMemo(() => applications.filter((a) => a.status === "Applied").length, [applications]);
  const screeningCount = useMemo(() => applications.filter((a) => a.status === "Screening").length, [applications]);
  const shortlistedCount = useMemo(() => applications.filter((a) => a.status === "Shortlisted").length, [applications]);
  const rejectedCount = useMemo(() => applications.filter((a) => a.status === "Rejected").length, [applications]);

  const validScores = useMemo(() => {
    return applications
      .map((a) => a.overall_score)
      .filter((s): s is number => typeof s === "number" && !isNaN(s));
  }, [applications]);

  const avgMatchScore = useMemo(() => {
    if (validScores.length === 0) return 0;
    return validScores.reduce((acc, val) => acc + val, 0) / validScores.length;
  }, [validScores]);

  const evaluatedSkillScores = useMemo(() => {
    const scores: number[] = [];
    for (const app of applications) {
      const details = app.match_details;
      if (details) {
        const breakdown = details.breakdown || details.ats;
        const req = breakdown?.required_skills;
        if (req) {
          if (typeof req.score === "number" && !isNaN(req.score)) {
            scores.push(req.score);
            continue;
          }
          const matched = typeof req.matched_count === "number" ? req.matched_count : (Array.isArray(req.matched) ? req.matched.length : 0);
          const total = typeof req.total === "number" ? req.total : (matched + (Array.isArray(req.missing) ? req.missing.length : 0));
          if (total > 0) {
            scores.push((matched / total) * 100);
            continue;
          }
        }
      }
      if (typeof app.overall_score === "number" && !isNaN(app.overall_score)) {
        const job = jobs.find((j) => j.id === app.job_id);
        if (job && Array.isArray(job.skills) && job.skills.length > 0) {
          const candidateSkillSet = new Set((app.skills || profile?.skills || []).map((s) => s.toLowerCase().trim()));
          const reqSkills = job.skills;
          const matched = reqSkills.filter((s) => candidateSkillSet.has(s.toLowerCase().trim())).length;
          if (reqSkills.length > 0) {
            scores.push((matched / reqSkills.length) * 100);
            continue;
          }
        }
      }
    }
    return scores;
  }, [applications, jobs, profile?.skills]);

  const evaluatedRolesCount = evaluatedSkillScores.length;
  const avgSkillsMatched = evaluatedRolesCount > 0
    ? evaluatedSkillScores.reduce((acc, val) => acc + val, 0) / evaluatedRolesCount
    : 0;

  const shortlistPct = useMemo(() => {
    return applications.length > 0 ? Math.round((shortlistedCount / applications.length) * 100) : 0;
  }, [applications.length, shortlistedCount]);

  const activeJobs = useMemo(() => {
    return jobs.filter((job) => (job.status || "Active").toLowerCase() === "active");
  }, [jobs]);

  const availableJobsCount = activeJobs.length;

  const savedJobs = useMemo(() => {
    return jobs.filter((job) => savedJobIds.includes(job.id));
  }, [jobs, savedJobIds]);

  const animAvgMatch = useCountUp(validScores.length > 0 ? avgMatchScore : 0, 850);
  const animSkillsMatched = useCountUp(avgSkillsMatched, 850);
  const animShortlisted = useCountUp(shortlistedCount, 850);
  const animShortlistPct = useCountUp(shortlistPct, 850);
  const animAvailableJobs = useCountUp(availableJobsCount, 850);

  const displayAvgMatch = validScores.length > 0 ? animAvgMatch.toFixed(1) : "—";
  const displaySkillsMatched = Math.round(animSkillsMatched);
  const displayShortlisted = Math.round(animShortlisted);
  const displayAvailableJobs = Math.round(animAvailableJobs);

  const recentApplications = useMemo(() => {
    return [...applications]
      .sort((a, b) => {
        const timeA = new Date(a.applied_at || 0).getTime();
        const timeB = new Date(b.applied_at || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 4);
  }, [applications]);

  const handleViewApplication = (applicationId: string) => {
    navigate(`/candidate/applications/${applicationId}`, {
      state: {
        from: "overview",
        fromLabel: "Back to Overview",
        fromPath: "/dashboard?tab=overview",
      },
    });
  };

  return (
    <div className="space-y-6 sm:space-y-7 w-full min-w-0 max-w-full overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4.5 w-full min-w-0">
        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8E877D]">Average Match</span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-charcoal leading-none">
                {displayAvgMatch !== "—" ? `${displayAvgMatch}%` : "—"}
              </span>
              <p className="text-[11px] text-[#78716C] font-medium mt-1.5">
                {validScores.length > 0
                  ? `Across ${validScores.length} evaluated ${validScores.length === 1 ? "role" : "roles"}`
                  : "No scores calculated yet"}
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
            <span className="text-xs font-medium text-[#8E877D]">Skills Matched</span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-charcoal leading-none">
                {evaluatedRolesCount > 0 ? `${displaySkillsMatched}%` : "0%"}
              </span>
              <p className="text-[11px] text-[#78716C] font-medium mt-1.5">
                {evaluatedRolesCount > 0
                  ? `Across ${evaluatedRolesCount} evaluated ${evaluatedRolesCount === 1 ? "role" : "roles"}`
                  : "No evaluated roles"}
              </p>
            </div>
            <div className="flex items-end gap-2 h-14 sm:h-16 px-1 pb-1 shrink-0">
              {(evaluatedSkillScores.length > 0 ? evaluatedSkillScores.slice(0, 4) : [0, 0, 0, 0]).map((score, i) => {
                const factor = evaluatedRolesCount > 0 && avgSkillsMatched > 0 ? animSkillsMatched / avgSkillsMatched : 1;
                const barHeight = evaluatedRolesCount > 0 ? Math.max(15, Math.round(score * factor)) : 10;
                return (
                  <div
                    key={i}
                    className="w-2.5 sm:w-3 rounded-full bg-emerald-500/80 transition-all duration-700 ease-out hover:bg-emerald-600"
                    style={{
                      height: `${barHeight}%`,
                      transitionDelay: `${i * 70}ms`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8E877D]">Shortlisted Roles</span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-charcoal leading-none">
                {displayShortlisted}
              </span>
              <p className="text-[11px] text-emerald-700 font-medium mt-1.5">
                {applications.length > 0
                  ? `${shortlistedCount} of ${applications.length} ${applications.length === 1 ? "application" : "applications"}`
                  : "0 of 0 applications"}
              </p>
            </div>
            <SemicircleMeter
              value={animShortlistPct}
              color="#10B981"
              textColor="text-emerald-700"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8E877D]">Jobs Available</span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <span className="font-sans text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-charcoal leading-none">
                {displayAvailableJobs}
              </span>
              <p className="text-[11px] text-[#78716C] font-medium mt-1.5">
                {availableJobsCount > 0 ? "Available opportunities" : "No opportunities available"}
              </p>
            </div>
            <div className="relative w-22 sm:w-24 h-14 flex flex-col items-center justify-end shrink-0">
              <Briefcase className="size-7 text-terracotta stroke-terracotta" />
              <span className="text-xs font-semibold text-terracotta mt-1">
                {displayAvailableJobs} {displayAvailableJobs === 1 ? "Role" : "Roles"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E6E0D6] bg-white shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#F0ECE4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">Your Applications</h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Live recruitment pipeline and evaluation results for your submitted roles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("applications")}
            className="text-xs font-semibold text-terracotta hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto shrink-0"
          >
            <span>View All Applications</span>
            <ArrowUpRight className="size-3.5" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-3.5 bg-cream/30 border-b border-[#F0ECE4] flex flex-wrap items-center gap-4 text-xs">
          <span className="text-[#8E877D] font-medium">Status Breakdown:</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border bg-blue-50 text-blue-800 border-blue-200">
              <span className="font-bold">{appliedCount}</span> Applied
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border bg-purple-50 text-purple-800 border-purple-200">
              <span className="font-bold">{screeningCount}</span> Screening
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
              <span className="font-bold">{shortlistedCount}</span> Shortlisted
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border bg-stone-100 text-stone-700 border-stone-200">
              <span className="font-bold">{rejectedCount}</span> Rejected
            </span>
          </div>
        </div>

        {recentApplications.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-semibold text-charcoal">No applications submitted yet</p>
            <p className="text-xs text-[#8E877D] max-w-sm mx-auto">
              Explore open positions across engineering, design, and operations to apply and track your recruitment status here.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab("jobs")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-4 py-2 text-xs font-semibold text-white hover:bg-terracotta-dark transition-colors cursor-pointer shadow-3xs"
              >
                <span>Browse Open Opportunities</span>
                <ArrowUpRight className="size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#F0ECE4]">
            {recentApplications.map((app) => (
              <div
                key={app.id}
                onClick={() => handleViewApplication(app.id)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-cream/40 transition-colors cursor-pointer group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-semibold text-charcoal group-hover:text-terracotta transition-colors truncate">
                      {app.job_title || "Position"}
                    </h3>
                  </div>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    <span className="font-medium text-charcoal">{app.company_name || "Company"}</span>
                    {app.job_location && (
                      <>
                        <span className="mx-1 text-[#A8A199]">&bull;</span>
                        <span>{app.job_location}</span>
                      </>
                    )}
                    {app.job_work_mode && (
                      <>
                        <span className="mx-1 text-[#A8A199]">&bull;</span>
                        <span>{app.job_work_mode}</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 self-start sm:self-auto shrink-0">
                  {typeof app.overall_score === "number" && !isNaN(app.overall_score) && (
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {Math.round(app.overall_score)}% Match
                    </span>
                  )}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getApplicationStatusBadgeClass(app.status)}`}
                  >
                    {app.status}
                  </span>
                  <span className="text-xs text-[#8E877D]">
                    Applied {formatDisplayDate(app.applied_at)}
                  </span>
                  <ArrowUpRight className="size-3.5 text-[#8E877D] group-hover:text-terracotta transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {savedJobs.length > 0 ? (
        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-[#F0ECE4]">
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">Bookmarked Opportunities</h2>
              <p className="text-xs text-[#78716C] mt-0.5">Jobs you've saved to review, research, or apply for later.</p>
            </div>
            {savedJobs.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab("saved-jobs")}
                className="text-xs font-semibold text-terracotta hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto shrink-0"
              >
                <span>View All Saved ({savedJobs.length})</span>
                <ArrowUpRight className="size-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
            {savedJobs.slice(0, 3).map((job) => (
              <JobCard
                key={job.id}
                job={job}
                fromContext="overview"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-[#F0ECE4]">
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">Active Opportunities</h2>
              <p className="text-xs text-[#78716C] mt-0.5">Discover positions matching your skills and background.</p>
            </div>
            {jobs.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab("jobs")}
                className="text-xs font-semibold text-terracotta hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto shrink-0"
              >
                <span>View All Jobs ({jobs.length})</span>
                <ArrowUpRight className="size-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
            {jobs.slice(0, 3).map((job) => (
              <JobCard
                key={job.id}
                job={job}
                fromContext="overview"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
