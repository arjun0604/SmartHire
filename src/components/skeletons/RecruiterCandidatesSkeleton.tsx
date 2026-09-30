import { Skeleton } from "@components/ui/skeleton"

export function RecruiterCandidatesSkeleton() {
  return (
    <div className="space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      <div className="relative w-full max-w-md">
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 items-stretch">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-2xs space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-56 mt-2" />
            </div>

            <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-xl bg-[#FAF8F5] border border-[#F0ECE4]">
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-5 w-12" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-5 w-8" />
              </div>
            </div>

            <div className="pt-3.5 mt-3 border-t border-[#F0ECE4]">
              <Skeleton className="h-8 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
