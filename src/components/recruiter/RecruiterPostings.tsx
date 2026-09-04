import { useState } from "react"
import { Search } from "lucide-react"
import { useAppSelector } from "../../store"
import { type Job } from "../../store/slices/jobsSlice"
import { JobCard } from "../common/JobCard"

interface RecruiterPostingsProps {
  companyName: string;
  onNavigateTab: (tab: string) => void;
  jobs?: Job[];
  onOpenCreateJob?: () => void;
}

export function RecruiterPostings({
  jobs: propJobs,
}: RecruiterPostingsProps) {
  const storeJobs = useAppSelector((state) => state.jobs.jobs);
  const jobs = propJobs || storeJobs;

  const [searchQuery, setSearchQuery] = useState("");

  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
          <input
            type="text"
            placeholder="Search job postings by role or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E6E0D6] rounded-lg text-xs text-charcoal placeholder-[#A8A199] outline-none focus:border-terracotta shadow-3xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
        {filteredJobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
