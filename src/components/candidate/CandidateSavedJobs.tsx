import { Bookmark } from "lucide-react"
import { useAppSelector } from "../../store"
import { JobCard } from "../common/JobCard"

export function CandidateSavedJobs() {
  const jobs = useAppSelector((state) => state.jobs.jobs);
  const savedJobIds = useAppSelector((state) => state.jobs.savedJobIds);

  const savedJobs = jobs.filter((job) => savedJobIds.includes(job.id));

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div>
          <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">
            Bookmarked Opportunities
          </h2>
          <p className="text-xs text-[#78716C]">
            Jobs you've saved to review, research, or apply for later.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] border border-[#E6E0D6] text-charcoal flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <Bookmark className="size-3.5 text-terracotta fill-terracotta" />
          <span>{savedJobs.length} Saved</span>
        </span>
      </div>

      {savedJobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E6E0D6] bg-white p-8 text-center space-y-2">
          <Bookmark className="size-8 text-[#A8A199] mx-auto" />
          <h3 className="font-serif text-sm font-semibold text-charcoal">No Saved Jobs Yet</h3>
          <p className="text-xs text-[#78716C]">
            Browse job listings and click the bookmark icon on any job card to save it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
          {savedJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
            />
          ))}
        </div>
      )}
    </div>
  );
}
