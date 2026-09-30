import { useState } from "react"
import {
  X,
  FileText,
  Calendar,
  Sparkles,
  Loader2,
} from "lucide-react"
import type { Application } from "../../store/slices/applicationsSlice"
import type { Job } from "../../data/jobs"
import { formatSalaryRange } from "../../utils/salary"
import { formatDisplayDate, getApplicationStatusBadgeClass } from "../../utils/formatters"
import { fetchApplicationMatchApi, type MatchReport } from "../../utils/api"
import { MatchReportModal } from "./MatchReportModal"

interface CandidateApplicationViewProps {
  application: Application;
  job?: Job | null;
  onClose: () => void;
}

export function CandidateApplicationView({
  application,
  job,
  onClose,
}: CandidateApplicationViewProps) {
  const [matchReport, setMatchReport] = useState<MatchReport | null>(null);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [isMatchLoading, setIsMatchLoading] = useState(false);

  const handleOpenMatchReport = async () => {
    if (!application?.id) return;
    setIsMatchLoading(true);
    try {
      const rep = await fetchApplicationMatchApi(application.id);
      setMatchReport(rep);
      setIsMatchModalOpen(true);
    } catch {
    } finally {
      setIsMatchLoading(false);
    }
  };

  const isEmployed = Boolean(application.is_currently_employed);
  const jobFieldLabel = isEmployed ? "Current Job" : "Most Recent Job";
  const candidateName = application.candidate_name || "Applicant";
  const candidateEmail = application.candidate_email || "Not provided";
  const candidatePhone = application.candidate_phone || "Not provided";
  const candidateLocation = application.candidate_location || "Not provided";
  const currentRole = application.current_job_title || "Software Engineer";
  const experience = application.years_experience || "3–5 years";
  const education = application.highest_education || "Bachelor's Degree";
  const employmentStatusText = isEmployed ? "Employed" : "Not Employed";

  const jobTitle = application.job_title || job?.title || "Job Posting";
  const companyName = application.company_name || job?.company || "Meridian Labs";
  const department = job?.department || "Engineering";
  const jobLocation = job?.location || "Bengaluru, India";
  const workMode = job?.workMode || "Hybrid";
  const employmentType = job?.employmentType || "Full-time";
  const experienceRequirement = job?.experience || job?.experienceLevel || "3–5 years";
  const deadline = job?.deadline || "Open until filled";

  const formattedSalary = formatSalaryRange(job?.salaryMin, job?.salaryMax);
  const salaryDisplay = formattedSalary ? `${formattedSalary}/year` : "Competitive (INR)";

  const candidateSkills = (application.skills && application.skills.length > 0)
    ? application.skills
    : ["React", "TypeScript", "Node.js", "System Architecture", "REST APIs", "Tailwind CSS"];

  const requiredSkills = (job?.requiredSkills && job.requiredSkills.length > 0)
    ? job.requiredSkills
    : ["React", "TypeScript", "Tailwind CSS", "REST APIs"];

  const preferredSkills = (job?.preferredSkills && job.preferredSkills.length > 0)
    ? job.preferredSkills
    : ["Next.js", "System Architecture", "Automated Testing"];

  const jobDescription = job?.description || "We are seeking a high-performing engineer to join our core product team. You will lead the development of intuitive user experiences, collaborate closely with cross-functional stakeholders, and deliver resilient software architectures.";

  const responsibilities = (job?.responsibilities && job.responsibilities.length > 0)
    ? job.responsibilities
    : [
        "Architect, design, and deliver performant web applications and frontend components.",
        "Collaborate with backend engineers to integrate clean, type-safe API contracts.",
        "Ensure exceptional responsiveness, code quality, and maintainable design systems.",
        "Participate in design reviews and mentor junior team members on engineering best practices."
      ];

  const qualifications = (job?.qualifications && job.qualifications.length > 0)
    ? job.qualifications
    : [
        "Demonstrated experience shipping production web applications.",
        "Solid proficiency in modern JavaScript, TypeScript, and React ecosystems.",
        "Strong understanding of responsive layouts, state management, and performance tuning.",
        "Effective communication skills in a collaborative, cross-functional engineering environment."
      ];

  const formattedDate = formatDisplayDate(application.applied_at);

  return (
    <div className="relative w-full max-w-5xl lg:max-w-6xl bg-white border border-[#E6E0D6] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
      <div className="px-6 py-5 border-b border-[#F0ECE4] flex items-start justify-between bg-white shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getApplicationStatusBadgeClass(application.status)}`}>
              {application.status}
            </span>
            {application.ats_score !== undefined && application.ats_score !== null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="size-3 text-emerald-600" />
                <span>ATS Score: {Math.round(application.ats_score)}%</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleOpenMatchReport}
              disabled={isMatchLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
            >
              {isMatchLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3 text-purple-600" />}
              <span>View Match Report</span>
            </button>
            <span className="text-xs text-[#8E877D] flex items-center gap-1">
              <Calendar className="size-3 text-[#8E877D]" />
              <span>Submitted on {formattedDate}</span>
            </span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
            {jobTitle}
          </h2>
          <p className="text-xs sm:text-sm text-[#78716C]">
            <span className="font-semibold text-charcoal">{companyName}</span> &bull; {jobLocation} ({workMode})
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-[#8E877D] hover:text-charcoal hover:bg-cream transition-colors cursor-pointer shrink-0"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-7">
            <section className="space-y-3">
              <div className="border-b border-[#F0ECE4] pb-2">
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                  Job Details & Role Specifications
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-cream border border-[#E6E0D6]">
                  <span className="text-[11px] text-[#8E877D] block font-medium">Department</span>
                  <span className="text-xs font-semibold text-charcoal mt-0.5 block truncate">{department}</span>
                </div>
                <div className="p-3 rounded-xl bg-cream border border-[#E6E0D6]">
                  <span className="text-[11px] text-[#8E877D] block font-medium">Location</span>
                  <span className="text-xs font-semibold text-charcoal mt-0.5 block truncate">{jobLocation}</span>
                </div>
                <div className="p-3 rounded-xl bg-cream border border-[#E6E0D6]">
                  <span className="text-[11px] text-[#8E877D] block font-medium">Work Mode</span>
                  <span className="text-xs font-semibold text-charcoal mt-0.5 block">{workMode}</span>
                </div>
                <div className="p-3 rounded-xl bg-cream border border-[#E6E0D6]">
                  <span className="text-[11px] text-[#8E877D] block font-medium">Employment Type</span>
                  <span className="text-xs font-semibold text-charcoal mt-0.5 block">{employmentType}</span>
                </div>
                <div className="p-3 rounded-xl bg-cream border border-[#E6E0D6]">
                  <span className="text-[11px] text-[#8E877D] block font-medium">Experience Required</span>
                  <span className="text-xs font-semibold text-charcoal mt-0.5 block">{experienceRequirement}</span>
                </div>
                <div className="p-3 rounded-xl bg-cream border border-[#E6E0D6]">
                  <span className="text-[11px] text-[#8E877D] block font-medium">Salary</span>
                  <span className="text-xs font-semibold text-emerald-700 mt-0.5 block truncate">{salaryDisplay}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cream border border-[#E6E0D6] flex items-center justify-between text-xs">
                <span className="text-[#8E877D] font-medium">Application Deadline:</span>
                <span className="font-semibold text-charcoal">{deadline}</span>
              </div>
            </section>

            <section className="space-y-3">
              <div className="border-b border-[#F0ECE4] pb-2">
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                  Required & Preferred Skills
                </h3>
              </div>
              <div className="space-y-3 pt-1">
                <div>
                  <span className="text-xs font-semibold text-charcoal block mb-2">Required Skills</span>
                  <div className="flex flex-wrap gap-2">
                    {requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded bg-cream border border-[#E6E0D6] text-xs font-medium text-charcoal"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-charcoal block mb-2">Preferred Skills</span>
                  <div className="flex flex-wrap gap-2">
                    {preferredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded bg-white border border-[#E6E0D6] text-xs font-medium text-[#57534E]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="border-b border-[#F0ECE4] pb-2">
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                  About the Role
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#44403C] leading-relaxed pt-1">
                {jobDescription}
              </p>
            </section>

            <section className="space-y-3">
              <div className="border-b border-[#F0ECE4] pb-2">
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                  Key Responsibilities
                </h3>
              </div>
              <ul className="space-y-2 pt-1">
                {responsibilities.map((resp, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-[#44403C] leading-relaxed">
                    <span className="size-1.5 rounded-full bg-terracotta mt-1.5 shrink-0" />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <div className="border-b border-[#F0ECE4] pb-2">
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
                  Qualifications & Requirements
                </h3>
              </div>
              <ul className="space-y-2 pt-1">
                {qualifications.map((qual, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-[#44403C] leading-relaxed">
                    <span className="size-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                    <span>{qual}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[#E6E0D6] bg-cream/80 p-5 sm:p-6 space-y-6 shadow-xs">
              <div className="border-b border-[#E6E0D6] pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-charcoal">
                    Your Submitted Application
                  </h3>
                  <p className="text-[11px] text-[#8E877D] mt-0.5">
                    Submitted on {formattedDate}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getApplicationStatusBadgeClass(application.status)}`}>
                  {application.status}
                </span>
              </div>

              <div className="space-y-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8E877D] block">
                  Personal Information
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E877D]">Full Name</span>
                    <span className="font-medium text-charcoal truncate max-w-42.5">{candidateName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E877D]">Email</span>
                    <span className="font-medium text-charcoal truncate max-w-42.5">{candidateEmail}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E877D]">Phone</span>
                    <span className="font-medium text-charcoal">{candidatePhone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E877D]">Location</span>
                    <span className="font-medium text-charcoal truncate max-w-42.5">{candidateLocation}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-[#E6E0D6]">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8E877D] block">
                  Professional Background
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E877D]">{jobFieldLabel}</span>
                    <span className="font-medium text-charcoal truncate max-w-42.5">{currentRole}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E877D]">Total Experience</span>
                    <span className="font-medium text-charcoal">{experience}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E877D]">Highest Education</span>
                    <span className="font-medium text-charcoal truncate max-w-42.5">{education}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E877D]">Employment Status</span>
                    <span className="font-medium text-charcoal">{employmentStatusText}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-[#E6E0D6]">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8E877D] block">
                  Your Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {candidateSkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded bg-white border border-[#E6E0D6] text-[11px] font-medium text-charcoal"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-[#E6E0D6]">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8E877D] block">
                  Submitted Application Answers
                </span>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-[#78716C] block">Are you currently employed?</span>
                  <div className="text-xs text-charcoal p-3 rounded-lg bg-white border border-[#E6E0D6] font-medium">
                    {isEmployed ? "Yes" : "No"}
                  </div>
                </div>

                {application.why_interested && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-[#78716C] block">Why interested in this position?</span>
                    <div className="text-xs text-charcoal p-3 rounded-lg bg-white border border-[#E6E0D6] leading-relaxed">
                      {application.why_interested}
                    </div>
                  </div>
                )}

                {application.relevant_experience && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-[#78716C] block">Relevant Experience:</span>
                    <div className="text-xs text-charcoal p-3 rounded-lg bg-white border border-[#E6E0D6] leading-relaxed">
                      {application.relevant_experience}
                    </div>
                  </div>
                )}

                {application.additional_information && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-[#78716C] block">Additional Notes:</span>
                    <div className="text-xs text-charcoal p-3 rounded-lg bg-white border border-[#E6E0D6] leading-relaxed">
                      {application.additional_information}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-[#E6E0D6]">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8E877D] block">
                  Submitted Resume
                </span>
                <div className="rounded-xl border border-[#E6E0D6] bg-white p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-lg bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <FileText className="size-4" />
                    </div>
                    <span className="text-xs font-mono font-medium text-charcoal truncate">
                      {application.resume_name || "Candidate_Resume.pdf"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {application.resume_url && (
                      <a
                        href={application.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-charcoal hover:text-terracotta border border-[#E6E0D6] hover:border-terracotta px-2.5 py-1 rounded-lg transition-colors"
                      >
                        View Resume
                      </a>
                    )}
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Attached
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-[#F0ECE4] flex items-center justify-between gap-3 bg-white shrink-0">
        <span className="text-xs text-[#8E877D]">
          Submitted Application &bull; Read-Only View
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-terracotta px-5 py-2 text-xs font-semibold text-white hover:bg-terracotta-dark transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>

      <MatchReportModal
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        report={matchReport}
        jobTitle={jobTitle}
        candidateName={candidateName}
      />
    </div>
  );
}
