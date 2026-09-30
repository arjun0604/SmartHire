import { Skeleton } from "@components/ui/skeleton"

interface RecruiterPostingsSkeletonProps {
  showCategories?: boolean;
}

export function RecruiterPostingsSkeleton({ showCategories = false }: RecruiterPostingsSkeletonProps) {
  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      <div className={showCategories ? "flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between" : "flex items-center gap-3"}>
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        {showCategories && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-lg shrink-0" />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-[#E6E0D6] bg-white p-4 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <Skeleton className="size-8.5 rounded-lg shrink-0" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="size-5 rounded-md" />
              </div>
            </div>

            <Skeleton className="h-2.5 w-28 rounded" />

            <div className="space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-3 w-14 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-12 rounded-md" />
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#F0ECE4] flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const JobPostingsSkeleton = RecruiterPostingsSkeleton;
