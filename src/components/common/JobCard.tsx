import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { ArrowUpRight, Bookmark, CheckCircle2 } from "lucide-react"
import { useUser } from "../../context/UserContext"
import { useAppSelector } from "../../store"
import { formatSalaryRange } from "../../utils/salary"
import { formatDisplayDate, getInitials } from "../../utils/formatters"
import type { Job } from "../../data/jobs"

interface JobCardProps {
  job: Job;
  fromContext?: "overview" | "jobs" | "saved-jobs";
}

export function JobCard({ job, fromContext }: JobCardProps) {
  const navigate = useNavigate();
  const { profile, savedJobIds, toggleSaveJob } = useUser();
  const isRecruiter = profile?.role === "recruiter";
  const applications = useAppSelector((state) => state.applications.candidateApplications);
  const isApplied = applications.some((a) => a.job_id === job.id);
  const isSaved = savedJobIds.includes(job.id);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [job.companyLogo]);

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaveJob(job.id);
  };

  const handleView = () => {
    if (isRecruiter) {
      navigate(`/recruiter/jobs/${job.id}`, {
        state: {
          from: "postings",
          fromLabel: "Back to Job Postings",
          fromPath: "/dashboard?tab=postings",
          jobId: job.id,
        },
      });
    } else {
      const from = fromContext || "jobs";
      const fromLabel =
        from === "overview"
          ? "Back to Overview"
          : from === "saved-jobs"
          ? "Back to Saved Jobs"
          : "Back to Browse Jobs";
      const fromPath =
        from === "overview"
          ? "/dashboard?tab=overview"
          : from === "saved-jobs"
          ? "/dashboard?tab=saved-jobs"
          : "/dashboard?tab=jobs";

      navigate(`/candidate/jobs/${job.id}`, {
        state: {
          from,
          fromLabel,
          fromPath,
          jobId: job.id,
        },
      });
    }
  };

  const allSkills = (job.requiredSkills && job.requiredSkills.length > 0)
    ? job.requiredSkills
    : job.skills || [];
  const visibleSkills = allSkills.slice(0, 3);
  const remainderCount = allSkills.length - visibleSkills.length;

  const employment = job.employmentType || job.jobType || "Full-time";
  const experience = job.experience || job.experienceLevel || "3–5 years";
  const formattedDeadline = formatDisplayDate(job.deadline, "Open");
  const deadlineText = formattedDeadline !== "Open" ? `Deadline ${formattedDeadline}` : "Open";

  const salaryText = formatSalaryRange(job.salaryMin, job.salaryMax);

  return (
    <div
      onClick={handleView}
      className="rounded-2xl border border-[#E6E0D6] bg-white p-4 shadow-2xs hover:border-terracotta/40 hover:shadow-xs transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        {job.companyLogo && !logoFailed ? (
          <img
            src={job.companyLogo}
            alt={job.company}
            onError={() => setLogoFailed(true)}
            className="size-8.5 rounded-lg object-contain border border-[#E6E0D6] bg-cream p-0.5"
          />
        ) : (
          <div className="size-8.5 rounded-lg bg-cream border border-[#E6E0D6] flex items-center justify-center text-[11px] font-bold font-serif text-charcoal shadow-3xs">
            {getInitials(job.company)}
          </div>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-[#8E877D] font-normal">
            {job.postedRelative || "Recently"}
          </span>
          {!isRecruiter && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleSave();
              }}
              className="p-1 rounded-md text-[#8E877D] hover:text-terracotta hover:bg-cream transition-colors cursor-pointer"
              title={isSaved ? "Remove from saved" : "Save job"}
            >
              <Bookmark className={`size-3.5 ${isSaved ? "fill-terracotta text-terracotta" : ""}`} />
            </button>
          )}
        </div>
      </div>

      <span className="text-[10.5px] font-mono font-semibold text-terracotta uppercase tracking-wider block mb-1">
        {job.department} &bull; {job.workMode || job.jobType}
      </span>

      <h3
        onClick={handleView}
        className="font-serif text-[15px] sm:text-base font-bold text-charcoal leading-snug truncate hover:text-terracotta transition-colors cursor-pointer mb-0.5"
      >
        {job.title}
      </h3>

      <p className="text-xs text-[#78716C] truncate mb-1">
        {job.company_id || job.companyId ? (
          <Link
            to={`/company/${job.company_id || job.companyId}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-charcoal hover:text-terracotta hover:underline transition-colors cursor-pointer"
          >
            {job.company}
          </Link>
        ) : isRecruiter ? (
          <Link
            to="/recruiter/company"
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-charcoal hover:text-terracotta hover:underline transition-colors cursor-pointer"
          >
            {job.company}
          </Link>
        ) : (
          <span className="font-medium text-charcoal">{job.company}</span>
        )}
        <span className="mx-1 text-[#A8A199]">&bull;</span>
        <span>{job.location}</span>
      </p>

      <p className="text-[11px] text-[#8E877D] truncate mb-2.5">
        <span>{employment}</span>
        <span className="mx-1 text-[#A8A199]">&bull;</span>
        <span>{experience}</span>
        {salaryText && (
          <>
            <span className="mx-1 text-[#A8A199]">&bull;</span>
            <span className="font-medium text-charcoal">{salaryText}</span>
          </>
        )}
        <span className="mx-1 text-[#A8A199]">&bull;</span>
        <span>{deadlineText}</span>
      </p>

      {isRecruiter && (
        <div className="flex items-center gap-2 mb-2.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cream border border-[#E6E0D6] text-[11px] font-medium text-charcoal">
            <span className="font-semibold text-terracotta">{job.applicantCount ?? job.applicants ?? 0}</span> Applicants
          </span>
          {(job.shortlisted ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-800">
              <span className="font-semibold">{job.shortlisted}</span> Shortlisted
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {visibleSkills.map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-md bg-cream border border-[#E6E0D6] text-[10.5px] text-[#78716C]"
            >
              {skill}
            </span>
          ))}
          {remainderCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-cream border border-[#E6E0D6] text-[10.5px] font-medium text-[#8E877D]">
              +{remainderCount}
            </span>
          )}
        </div>

        <div className="shrink-0">
          {isRecruiter ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleView();
              }}
              className="rounded-lg bg-terracotta px-3 py-1.5 text-xs font-semibold text-white hover:bg-terracotta-dark transition-colors cursor-pointer flex items-center gap-1 shadow-3xs"
            >
              <span>View More</span>
              <ArrowUpRight className="size-3.5" />
            </button>
          ) : isApplied ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <CheckCircle2 className="size-3.5" />
              <span>Applied</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleView();
              }}
              className="rounded-lg bg-terracotta px-3 py-1.5 text-xs font-semibold text-white hover:bg-terracotta-dark transition-colors cursor-pointer flex items-center gap-1 shadow-3xs"
            >
              <span>View &amp; Apply</span>
              <ArrowUpRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
