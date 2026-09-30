import { useState, useEffect, useMemo } from "react"
import { useNavigate, Link } from "react-router-dom"
import { ArrowRight, Search, X } from "lucide-react"
import { useAppDispatch, useAppSelector } from "../../store"
import { fetchRecruiterApplicationsThunk } from "../../store/slices/applicationsSlice"
import { fetchRecruiterJobsThunk } from "../../store/slices/jobsSlice"
import { useUser } from "../../context/UserContext"
import { RecruiterCandidatesSkeleton } from "@components/skeletons/RecruiterCandidatesSkeleton"
import type { Job } from "../../data/jobs"
import type { Application } from "../../store/slices/applicationsSlice"

interface CompactJobRecruitmentCardProps {
  job: Job;
  applications: Application[];
  onViewCandidates: (jobId: string) => void;
}

function CompactJobRecruitmentCard({
  job,
  applications,
  onViewCandidates,
}: CompactJobRecruitmentCardProps) {
  const totalApplications = applications?.length || 0;
  const shortlistedCount = (applications || []).filter((a) => a.status === "Shortlisted").length;

  const validScores = (applications || [])
    .map((a) => (typeof a.overall_score === "number" && !isNaN(a.overall_score) ? a.overall_score : null))
    .filter((s): s is number => s !== null);

  const avgMatchDisplay = validScores.length > 0
    ? `${(validScores.reduce((acc, val) => acc + val, 0) / validScores.length).toFixed(1)}%`
    : "—";

  const companyName = job.company || job.company_name || "Google";
  const locationText = [job.location, job.workMode || job.workMode].filter(Boolean).join(" • ");
  const supportingInfo = [companyName, locationText].filter(Boolean).join(" • ");

  return (
    <div
      onClick={() => onViewCandidates(job.id)}
      className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-2xs hover:border-terracotta/40 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-serif text-base sm:text-lg font-bold text-charcoal leading-snug tracking-tight truncate">
              {job.title}
            </h3>
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {job.status || "Active"}
            </span>
          </div>
          <p className="text-xs text-[#78716C] truncate mt-1">
            <Link
              to={(job.company_id || (job as any).companyId) ? `/company/${job.company_id || (job as any).companyId}` : "/recruiter/company"}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-charcoal hover:text-terracotta hover:underline transition-colors cursor-pointer"
            >
              {companyName}
            </Link>
            {locationText ? ` • ${locationText}` : ""}
          </p>
          {job.department && (
            <p className="text-[11px] font-mono text-[#8E877D] uppercase tracking-wider truncate mt-0.5">
              {job.department}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-[#FAF8F5] border border-[#F0ECE4]">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E877D] block">
              Applications
            </span>
            <span className="font-sans text-base sm:text-lg font-bold text-charcoal block mt-0.5">
              {totalApplications}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E877D] block">
              Avg Match
            </span>
            <span className="font-sans text-base sm:text-lg font-bold text-charcoal block mt-0.5">
              {avgMatchDisplay}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E877D] block">
              Shortlisted
            </span>
            <span className="font-sans text-base sm:text-lg font-bold text-charcoal block mt-0.5">
              {shortlistedCount}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3.5 mt-3 border-t border-[#F0ECE4]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewCandidates(job.id);
          }}
          className="w-full py-2 px-3.5 rounded-xl border border-[#E6E0D6] bg-white hover:bg-[#FAF8F5] hover:border-terracotta/40 hover:text-terracotta text-xs font-semibold text-charcoal flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs group"
        >
          <span>View Candidates</span>
          <ArrowRight className="size-3.5 text-[#8E877D] group-hover:text-terracotta group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

export function RecruiterCandidates() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { profile, isLoading: isUserLoading } = useUser();
  const jobs = useAppSelector((state) => state.jobs.recruiterJobs) || [];
  const isJobsLoading = useAppSelector((state) => state.jobs.isRecruiterLoading);
  const hasFetchedJobs = useAppSelector((state) => state.jobs.hasFetchedRecruiterJobs);
  const applications = useAppSelector((state) => state.applications.jobApplications) || [];
  const isAppsLoading = useAppSelector((state) => state.applications.isLoading);
  const hasFetchedApps = useAppSelector((state) => state.applications.hasFetchedRecruiterApplications);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isUserLoading && profile?.role === "recruiter") {
      if (!hasFetchedJobs) {
        dispatch(fetchRecruiterJobsThunk());
      }
      dispatch(fetchRecruiterApplicationsThunk());
    }
  }, [dispatch, isUserLoading, profile?.role, hasFetchedJobs]);

  const activeJobs = useMemo(() => {
    return (jobs || []).filter((job) => (job.status || "Active").toLowerCase() === "active");
  }, [jobs]);

  const appsByJob = useMemo(() => {
    const map = new Map<string, Application[]>();
    (applications || []).forEach((app) => {
      const list = map.get(app.job_id) || [];
      list.push(app);
      map.set(app.job_id, list);
    });
    return map;
  }, [applications]);

  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return activeJobs;
    const q = searchQuery.toLowerCase().trim();
    return activeJobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.department && j.department.toLowerCase().includes(q)) ||
        (j.location && j.location.toLowerCase().includes(q)) ||
        ((j.company || j.company_name) && (j.company || j.company_name)!.toLowerCase().includes(q)) ||
        ((j.workMode || j.work_mode) && (j.workMode || j.work_mode)!.toLowerCase().includes(q))
    );
  }, [activeJobs, searchQuery]);

  const isInitialLoading = isUserLoading || (!hasFetchedJobs && isJobsLoading) || (!hasFetchedApps && isAppsLoading);

  if (isInitialLoading && activeJobs.length === 0) {
    return <RecruiterCandidatesSkeleton />;
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
        <input
          type="text"
          placeholder="Search active jobs by title, department, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2 bg-white border border-[#E6E0D6] rounded-xl text-xs text-charcoal placeholder-[#A8A199] outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta shadow-3xs transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E877D] hover:text-charcoal cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {filteredJobs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#E6E0D6] bg-white p-12 text-center space-y-2">
          <h3 className="font-serif text-base font-bold text-charcoal">
            {searchQuery ? "No matching roles found" : "No active job postings"}
          </h3>
          <p className="text-xs text-[#8E877D] max-w-sm mx-auto">
            {searchQuery
              ? `No active roles match "${searchQuery}". Try searching with a different job title, department, or location.`
              : "Post an active job opening to begin receiving applicants and tracking pipelines."}
          </p>
          {searchQuery && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E0D6] px-3.5 py-1.5 text-xs font-semibold text-charcoal hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 items-stretch">
          {filteredJobs.map((job) => {
            const jobApps = appsByJob.get(job.id) || [];
            return (
              <CompactJobRecruitmentCard
                key={job.id}
                job={job}
                applications={jobApps}
                onViewCandidates={(jobId) =>
                  navigate(`/candidates/job/${jobId}`, {
                    state: {
                      from: "candidates",
                      fromLabel: "Back to Candidates",
                      fromPath: "/dashboard?tab=candidates",
                    },
                  })
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
