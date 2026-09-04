import { useNavigate } from "react-router-dom"
import { ArrowUpRight, CheckCircle2 } from "lucide-react"
import { useUser } from "../../context/UserContext"
import { useAppSelector } from "../../store"
import type { Job } from "../../data/jobs"

interface JobCardProps {
  job: Job;
}

function getCompanyInitials(company: string): string {
  const words = company.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return company.slice(0, 2).toUpperCase();
}

function formatDeadline(deadline?: string): string {
  if (!deadline) return "Open";
  const parsed = new Date(deadline);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return deadline;
}

export function JobCard({ job }: JobCardProps) {
  const navigate = useNavigate();
  const { profile } = useUser();
  const isRecruiter = profile?.role === "recruiter";
  const appliedJobIds = useAppSelector((state) => state.jobs.appliedJobIds);
  const isApplied = appliedJobIds.includes(job.id);

  const handleView = () => {
    if (isRecruiter) {
      navigate(`/recruiter/jobs/${job.id}`);
    } else {
      navigate(`/candidate/jobs/${job.id}`);
    }
  };

  const allSkills = (job.requiredSkills && job.requiredSkills.length > 0)
    ? job.requiredSkills
    : job.skills || [];
  const visibleSkills = allSkills.slice(0, 3);
  const remainderCount = allSkills.length - visibleSkills.length;

  const employment = job.employmentType || job.jobType || "Full-time";
  const experience = job.experience || job.experienceLevel || "3–5 years";
  const formattedDeadline = formatDeadline(job.deadline);
  const deadlineText = formattedDeadline !== "Open" ? `Deadline ${formattedDeadline}` : "Open";

  return (
    <div className="rounded-2xl border border-[#E6E0D6] bg-white p-4 shadow-2xs hover:border-terracotta/40 hover:shadow-xs transition-all">
      <div className="flex items-center justify-between gap-2 mb-2">
        {job.companyLogo ? (
          <img
            src={job.companyLogo}
            alt={job.company}
            className="size-8.5 rounded-lg object-contain border border-[#E6E0D6] bg-[#FAF8F5] p-0.5"
          />
        ) : (
          <div className="size-8.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-center text-[11px] font-bold font-serif text-charcoal shadow-3xs">
            {getCompanyInitials(job.company)}
          </div>
        )}
        <span className="text-[11px] text-[#8E877D] font-normal shrink-0">
          {job.postedRelative || "2 days ago"}
        </span>
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
        <span className="font-medium text-charcoal">{job.company}</span>
        <span className="mx-1 text-[#A8A199]">&bull;</span>
        <span>{job.location}</span>
      </p>

      <p className="text-[11px] text-[#8E877D] truncate mb-2.5">
        <span>{employment}</span>
        <span className="mx-1 text-[#A8A199]">&bull;</span>
        <span>{experience}</span>
        <span className="mx-1 text-[#A8A199]">&bull;</span>
        <span>{deadlineText}</span>
      </p>

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {visibleSkills.map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E6E0D6] text-[10.5px] text-[#78716C]"
            >
              {skill}
            </span>
          ))}
          {remainderCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E6E0D6] text-[10.5px] font-medium text-[#8E877D]">
              +{remainderCount}
            </span>
          )}
        </div>

        <div className="shrink-0">
          {isRecruiter ? (
            <button
              type="button"
              onClick={handleView}
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
              onClick={handleView}
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
