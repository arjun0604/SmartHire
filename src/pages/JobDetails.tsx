import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowUpRight, Building2, MapPin, Edit3, CheckCircle2 } from "lucide-react"
import { SidebarProvider, SidebarInset } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { SiteHeader } from "../components/site-header"
import { useAppDispatch, useAppSelector } from "../store"
import { updateJob, type Job } from "../store/slices/jobsSlice"
import { getJobById, getCandidatesByJobId } from "../data/jobs"
import { CreateJobModal } from "../components/recruiter/CreateJobModal"
import { ApplicationReviewModal } from "../components/candidate/ApplicationReviewModal"
import { useUser } from "../context/UserContext"

export default function JobDetails() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { profile } = useUser();

  const isRecruiter = profile?.role === "recruiter";
  const isCandidate = profile?.role === "candidate";

  const storeJobs = useAppSelector((state) => state.jobs.jobs);
  const appliedJobIds = useAppSelector((state) => state.jobs.appliedJobIds);
  const matchedJob = storeJobs.find((j) => j.id === jobId) || (jobId ? getJobById(jobId) : undefined);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const backRoute = isRecruiter ? "/recruiter/jobs" : "/candidate/jobs";
  const sidebarTab = isRecruiter ? "postings" : "jobs";

  const handleSidebarTabSelect = (tab: string) => {
    if (isRecruiter) {
      if (tab === "overview") navigate("/recruiter/dashboard");
      else if (tab === "postings") navigate("/recruiter/jobs");
      else if (tab === "candidates") navigate("/recruiter/candidates");
      else if (tab === "assessments") navigate("/recruiter/assessments");
      else if (tab === "company") navigate("/recruiter/company");
      else navigate(`/dashboard?tab=${tab}`);
    } else {
      if (tab === "overview") navigate("/candidate/dashboard");
      else if (tab === "jobs") navigate("/candidate/jobs");
      else if (tab === "saved-jobs") navigate("/candidate/saved-jobs");
      else if (tab === "assessments") navigate("/candidate/assessments");
      else if (tab === "profile") navigate("/candidate/profile");
      else navigate(`/dashboard?tab=${tab}`);
    }
  };

  if (!matchedJob) {
    return (
      <SidebarProvider>
        <AppSidebar activeTab={sidebarTab} onSelectTab={handleSidebarTabSelect} />
        <SidebarInset className="bg-cream/40 min-h-screen">
          <SiteHeader title="Job Details" />
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <h2 className="font-serif text-xl font-bold text-charcoal">Job Not Found</h2>
            <p className="text-xs text-[#8E877D] mt-1 max-w-sm">
              The requested job posting does not exist or has been removed.
            </p>
            <button
              type="button"
              onClick={() => navigate(backRoute)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-4 py-2 text-xs font-semibold text-white hover:bg-terracotta-dark transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Job Postings</span>
            </button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const job = matchedJob;
  const isAlreadyApplied = appliedJobIds.includes(job.id);

  const applicationsCount = job.applicantCount || job.applicants || 0;
  const shortlistedCount = job.shortlisted || Math.max(1, Math.round(applicationsCount * 0.28));
  const screeningCount = job.screening || Math.max(1, Math.round(applicationsCount * 0.35));
  const rejectedCount = job.rejected || Math.max(0, Math.round(applicationsCount * 0.12));

  const candidates = getCandidatesByJobId(job.id);

  const handleJobUpdated = (updated: Job) => {
    dispatch(updateJob(updated));
  };

  return (
    <SidebarProvider>
      <AppSidebar activeTab={sidebarTab} onSelectTab={handleSidebarTabSelect} />
      <SidebarInset className="bg-cream/40 min-h-screen">
        <SiteHeader title="Job Details" />

        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:py-8 lg:pl-28 lg:pr-8 w-full min-w-0">
          <div>
            <button
              type="button"
              onClick={() => navigate(backRoute)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#78716C] hover:text-charcoal transition-colors cursor-pointer mb-4 group"
            >
              <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Job Postings</span>
            </button>

            <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono text-terracotta uppercase tracking-wider font-semibold">
                      {job.department}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {job.status}
                    </span>
                  </div>

                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal mt-1.5">
                    {job.title}
                  </h1>

                  <p className="text-xs sm:text-sm text-[#78716C] flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-charcoal">
                      <Building2 className="size-3.5 text-[#8E877D]" />
                      {job.company}
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5 text-[#8E877D]" />
                      {job.location}
                    </span>
                    <span>&bull;</span>
                    <span>{job.workMode}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {isRecruiter && (
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E0D6] bg-white px-3.5 py-1.5 text-xs font-medium text-charcoal hover:bg-[#FAF8F5] transition-colors cursor-pointer shadow-3xs"
                    >
                      <Edit3 className="size-3.5" />
                      <span>Edit Job</span>
                    </button>
                  )}

                  {isCandidate && (
                    isAlreadyApplied ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span>Applied</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsApplyModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-4 py-2 text-xs font-semibold text-white hover:bg-terracotta-dark shadow-2xs transition-colors cursor-pointer"
                      >
                        <span>Apply Now</span>
                        <ArrowUpRight className="size-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {isRecruiter && (
            <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
              <h2 className="font-sans text-base font-bold text-charcoal mb-4 pb-3 border-b border-[#F0ECE4]">
                Recruitment Status
              </h2>

              <div className="grid grid-cols-4 divide-x divide-[#F0ECE4] text-center">
                <div className="px-2">
                  <span className="text-[11px] sm:text-xs text-[#8E877D] block truncate">Applications</span>
                  <span className="text-xl sm:text-2xl font-normal text-charcoal mt-1 block">
                    {applicationsCount}
                  </span>
                </div>

                <div className="px-2">
                  <span className="text-[11px] sm:text-xs text-[#8E877D] block truncate">Shortlisted</span>
                  <span className="text-xl sm:text-2xl font-normal text-charcoal mt-1 block">
                    {shortlistedCount}
                  </span>
                </div>

                <div className="px-2">
                  <span className="text-[11px] sm:text-xs text-[#8E877D] block truncate">Screening</span>
                  <span className="text-xl sm:text-2xl font-normal text-charcoal mt-1 block">
                    {screeningCount}
                  </span>
                </div>

                <div className="px-2">
                  <span className="text-[11px] sm:text-xs text-[#8E877D] block truncate">Rejected</span>
                  <span className="text-xl sm:text-2xl font-normal text-charcoal mt-1 block">
                    {rejectedCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0">
            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                <h2 className="font-sans text-base font-bold text-charcoal mb-3 pb-3 border-b border-[#F0ECE4]">
                  Job Description
                </h2>
                <p className="text-sm text-[#44403C] leading-relaxed whitespace-pre-line">
                  {job.description}
                </p>
              </div>

              {job.responsibilities && job.responsibilities.length > 0 && (
                <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                  <h2 className="font-sans text-base font-bold text-charcoal mb-3 pb-3 border-b border-[#F0ECE4]">
                    Responsibilities
                  </h2>
                  <ul className="space-y-2.5 text-sm text-[#44403C]">
                    {job.responsibilities.map((resp, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="size-1.5 rounded-full bg-terracotta mt-2 shrink-0" />
                        <span className="leading-relaxed">{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isRecruiter && (
                <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                  <div className="mb-3 pb-3 border-b border-[#F0ECE4]">
                    <h2 className="font-sans text-base font-bold text-charcoal">Candidates</h2>
                    <p className="text-xs text-[#8E877D] mt-0.5">Applicants currently active for this position.</p>
                  </div>

                  {candidates.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-xs font-semibold text-charcoal">No candidates have applied to this role yet.</p>
                      <p className="text-xs text-[#8E877D] mt-0.5">Candidates will appear here as applications are submitted.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F0ECE4]">
                      {candidates.slice(0, 5).map((cand) => (
                        <div
                          key={cand.id}
                          className="py-3 flex items-center justify-between gap-3 hover:bg-[#FAF8F5]/50 transition-colors"
                        >
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-charcoal">{cand.name}</p>
                            <p className="text-[11px] text-[#8E877D] mt-0.5">
                              {job.title} &bull; {cand.appliedRelative}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            {typeof cand.matchScore === "number" && (
                              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                {cand.matchScore}% Match
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                cand.stage === "Shortlisted"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : cand.stage === "Screening"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-[#FAF8F5] text-[#78716C] border border-[#E6E0D6]"
                              }`}
                            >
                              {cand.stage}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {job.qualifications && job.qualifications.length > 0 && (
                <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                  <h2 className="font-sans text-base font-bold text-charcoal mb-3 pb-3 border-b border-[#F0ECE4]">
                    Qualifications
                  </h2>
                  <ul className="space-y-2.5 text-sm text-[#44403C]">
                    {job.qualifications.map((qual, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="size-1.5 rounded-full bg-emerald-600 mt-2 shrink-0" />
                        <span className="leading-relaxed">{qual}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                <h2 className="font-sans text-base font-bold text-charcoal mb-4 pb-3 border-b border-[#F0ECE4]">
                  Job Overview
                </h2>

                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E877D]">Experience</span>
                    <span className="font-semibold text-charcoal">
                      {job.experience || job.experienceLevel || "3–5 years"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Work Mode</span>
                    <span className="font-semibold text-charcoal">
                      {job.workMode || "Remote"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Employment Type</span>
                    <span className="font-semibold text-charcoal">
                      {job.employmentType || job.jobType || "Full-time"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Department</span>
                    <span className="font-semibold text-charcoal">
                      {job.department}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Location</span>
                    <span className="font-semibold text-charcoal truncate max-w-[150px]">
                      {job.location}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Education</span>
                    <span className="font-semibold text-charcoal truncate max-w-[150px]">
                      {job.education || "Bachelor's Degree"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Posted Date</span>
                    <span className="font-semibold text-charcoal">
                      {job.postedDate || "Aug 28, 2026"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE4]">
                    <span className="text-[#8E877D]">Application Deadline</span>
                    <span className="font-semibold text-charcoal">
                      {job.deadline || "Sep 30, 2026"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                <h2 className="font-sans text-base font-bold text-charcoal mb-3 pb-3 border-b border-[#F0ECE4]">
                  Required Skills
                </h2>

                <div className="flex flex-wrap gap-2">
                  {(job.requiredSkills || job.skills).map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-md bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-medium text-charcoal"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {job.preferredSkills && job.preferredSkills.length > 0 && (
                <div className="rounded-2xl border border-[#EBE6DD] bg-white p-5 sm:p-6 shadow-2xs">
                  <h2 className="font-sans text-base font-bold text-charcoal mb-3 pb-3 border-b border-[#F0ECE4]">
                    Preferred Skills
                  </h2>

                  <div className="flex flex-wrap gap-2">
                    {job.preferredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-md bg-white border border-[#E6E0D6] text-xs text-[#78716C]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {isRecruiter && (
          <CreateJobModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            initialData={job}
            onJobUpdated={handleJobUpdated}
          />
        )}

        {isCandidate && (
          <ApplicationReviewModal
            isOpen={isApplyModalOpen}
            onClose={() => setIsApplyModalOpen(false)}
            job={job}
          />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
