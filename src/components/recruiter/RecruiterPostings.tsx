import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { useAppDispatch, useAppSelector } from "../../store"
import { fetchRecruiterJobsThunk } from "../../store/slices/jobsSlice"
import { useUser } from "../../context/UserContext"
import { JobCard } from "../common/JobCard"
import { RecruiterPostingsSkeleton } from "../skeletons/RecruiterPostingsSkeleton"

export function RecruiterPostings() {
  const dispatch = useAppDispatch();
  const { profile, isLoading: isUserLoading } = useUser();
  const jobs = useAppSelector((state) => state.jobs.recruiterJobs);
  const isJobsLoading = useAppSelector((state) => state.jobs.isRecruiterLoading);
  const hasFetched = useAppSelector((state) => state.jobs.hasFetchedRecruiterJobs);

  useEffect(() => {
    if (!isUserLoading && profile?.role === "recruiter") {
      dispatch(fetchRecruiterJobsThunk());
    }
  }, [dispatch, isUserLoading, profile?.role]);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isInitialLoading = isUserLoading || isJobsLoading || !hasFetched;

  if (isInitialLoading) {
    return <RecruiterPostingsSkeleton />;
  }

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

      {filteredJobs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#E6E0D6] bg-white p-12 text-center">
          <h3 className="font-serif text-base font-bold text-charcoal">No Job Postings Found</h3>
          <p className="text-xs text-[#8E877D] mt-1 max-w-sm mx-auto">
            {searchQuery ? "No job postings matched your search criteria." : "You haven't posted any jobs yet. Create a new job to start hiring."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
