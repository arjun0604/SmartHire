import type { Application } from "../../store/slices/applicationsSlice"
import { calculateAge, formatDate } from "../../utils/formatters"

export interface ApplicationOverviewProps {
  application: Application;
}

export function ApplicationOverview({ application }: ApplicationOverviewProps) {
  const isEmployed = Boolean(application.is_currently_employed);
  const candidateAge = calculateAge(application.candidate_dob);
  const formattedDob = formatDate(application.candidate_dob);

  return (
    <section className="rounded-2xl border border-[#E6E0D6] bg-white p-6 sm:p-7 space-y-4 shadow-2xs">
      <div className="border-b border-[#F0ECE4] pb-2.5">
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
          Applicant Information
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6 text-xs pt-1">
        <div>
          <span className="text-[#8E877D] block font-medium">Candidate Name</span>
          <span className="text-charcoal font-semibold mt-0.5 block truncate">
            {application.candidate_name || "Applicant"}
          </span>
        </div>

        <div>
          <span className="text-[#8E877D] block font-medium">Email Address</span>
          <span className="text-charcoal font-medium mt-0.5 block truncate">
            {application.candidate_email || "Not provided"}
          </span>
        </div>

        <div>
          <span className="text-[#8E877D] block font-medium">Phone Number</span>
          <span className="text-charcoal font-medium mt-0.5 block">
            {application.candidate_phone || "Not provided"}
          </span>
        </div>

        <div>
          <span className="text-[#8E877D] block font-medium">Location</span>
          <span className="text-charcoal font-medium mt-0.5 block truncate">
            {application.candidate_location || "Not provided"}
          </span>
        </div>

        <div>
          <span className="text-[#8E877D] block font-medium">Age</span>
          <span className="text-charcoal font-medium mt-0.5 block">
            {candidateAge !== null
              ? `${candidateAge} years${formattedDob ? ` (${formattedDob})` : ""}`
              : formattedDob || "Not provided"}
          </span>
        </div>

        <div>
          <span className="text-[#8E877D] block font-medium">Employment Status</span>
          <span className="text-charcoal font-medium mt-0.5 block">
            {isEmployed ? "Employed" : "Not Employed"}
          </span>
        </div>

        <div>
          <span className="text-[#8E877D] block font-medium">
            {isEmployed ? "Current Job Title" : "Most Recent Job Title"}
          </span>
          <span className="text-charcoal font-medium mt-0.5 block truncate">
            {application.current_job_title || "Not provided"}
          </span>
        </div>

        <div>
          <span className="text-[#8E877D] block font-medium">Total Experience</span>
          <span className="text-charcoal font-medium mt-0.5 block">
            {application.years_experience || "Not provided"}
          </span>
        </div>

        <div>
          <span className="text-[#8E877D] block font-medium">Highest Education</span>
          <span className="text-charcoal font-medium mt-0.5 block truncate">
            {application.highest_education || "Not provided"}
          </span>
        </div>
      </div>
    </section>
  );
}
