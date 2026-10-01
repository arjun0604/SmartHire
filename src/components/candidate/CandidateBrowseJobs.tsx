import { useState, useMemo } from "react"
import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react"
import { useAppSelector } from "../../store"
import { useUser } from "../../context/UserContext"
import { JobCard } from "../common/JobCard"
import { RecruiterPostingsSkeleton } from "../skeletons/RecruiterPostingsSkeleton"

export function CandidateBrowseJobs() {
  const { profile, isLoading: isUserLoading } = useUser();
  const jobs = useAppSelector((state) => state.jobs.jobs);
  const isJobsLoading = useAppSelector((state) => state.jobs.isLoading);
  const hasFetchedJobs = useAppSelector((state) => state.jobs.hasFetchedJobs);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedWorkMode, setSelectedWorkMode] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const categories = [
    "All",
    "Engineering",
    "Data & AI",
    "Product & Design",
    "Marketing & Growth",
    "Sales & Operations",
    "Finance & Legal",
  ];

  const workModes = ["All", "Remote", "Hybrid", "On-site"];

  const filteredJobs = useMemo(() => {
    let result = (jobs || []).filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        (job.location && job.location.toLowerCase().includes(q)) ||
        (job.department && job.department.toLowerCase().includes(q)) ||
        (job.workMode && job.workMode.toLowerCase().includes(q)) ||
        (job.skills && job.skills.some((s) => s.toLowerCase().includes(q)));

      const matchesCategory =
        selectedCategory === "All" ||
        (job.department && job.department.toLowerCase() === selectedCategory.toLowerCase());

      const matchesWorkMode =
        selectedWorkMode === "All" ||
        (job.workMode && job.workMode.toLowerCase() === selectedWorkMode.toLowerCase());

      return matchesSearch && matchesCategory && matchesWorkMode;
    });

    if (sortBy === "title") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "salary") {
      result = [...result].sort((a, b) => (Number(b.salaryMax) || 0) - (Number(a.salaryMax) || 0));
    } else {
      result = [...result].sort((a, b) => {
        const timeA = new Date(a.postedDate || a.createdAt || 0).getTime();
        const timeB = new Date(b.postedDate || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
    }

    return result;
  }, [jobs, searchQuery, selectedCategory, selectedWorkMode, sortBy]);

  const isInitialLoading = isUserLoading || isJobsLoading || (!hasFetchedJobs && jobs.length === 0);

  if (isInitialLoading) {
    return <RecruiterPostingsSkeleton showCategories />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#A8A199]" />
            <input
              type="text"
              placeholder="Search roles, skills, or companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E6E0D6] rounded-lg text-xs text-charcoal placeholder-[#A8A199] outline-none focus:border-terracotta shadow-3xs"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <div className="flex items-center gap-1.5 bg-white border border-[#E6E0D6] rounded-lg px-2.5 py-1.5 shadow-3xs">
              <SlidersHorizontal className="size-3.5 text-[#8E877D]" />
              <select
                value={selectedWorkMode}
                onChange={(e) => setSelectedWorkMode(e.target.value)}
                className="text-xs text-charcoal bg-transparent outline-none cursor-pointer"
              >
                {workModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode === "All" ? "All Work Modes" : mode}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-[#E6E0D6] rounded-lg px-2.5 py-1.5 shadow-3xs">
              <ArrowUpDown className="size-3.5 text-[#8E877D]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs text-charcoal bg-transparent outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="title">Title (A–Z)</option>
                <option value="salary">Salary (High to Low)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-terracotta text-white shadow-2xs"
                  : "bg-white border border-[#E6E0D6] text-[#78716C] hover:bg-cream hover:text-charcoal"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[#78716C]">
        <span>
          Showing <span className="font-semibold text-charcoal">{filteredJobs.length}</span> active{" "}
          {filteredJobs.length === 1 ? "opportunity" : "opportunities"}
        </span>
        {(searchQuery || selectedCategory !== "All" || selectedWorkMode !== "All") && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
              setSelectedWorkMode("All");
            }}
            className="text-terracotta hover:underline cursor-pointer font-medium"
          >
            Reset Filters
          </button>
        )}
      </div>

      {filteredJobs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#E6E0D6] bg-white p-12 text-center">
          <h3 className="font-serif text-base font-bold text-charcoal">No Opportunities Found</h3>
          <p className="text-xs text-[#8E877D] mt-1 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== "All" || selectedWorkMode !== "All"
              ? "No job postings matched your filter criteria. Try clearing some filters."
              : "There are currently no active job openings available. Please check back later."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              fromContext="jobs"
            />
          ))}
        </div>
      )}
    </div>
  );
}
