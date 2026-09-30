import { Skeleton } from "@components/ui/skeleton"

export function ProfessionalProfileSkeleton() {
  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-28 rounded-md self-start sm:self-auto shrink-0" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="rounded-lg border border-[#E6E0D6] bg-cream p-2 flex items-center gap-2">
            <Skeleton className="size-3.5 rounded-full shrink-0" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="rounded-lg border border-[#E6E0D6] bg-cream p-2 flex items-center gap-2">
            <Skeleton className="size-3.5 rounded-full shrink-0" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <div className="rounded-lg border border-[#E6E0D6] bg-white p-2 flex items-center gap-2">
            <Skeleton className="size-3.5 rounded-full shrink-0" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        </div>

        <div className="pt-3 border-t border-[#F0ECE4]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg border border-[#E6E0D6] bg-cream">
            <div className="flex items-center gap-2.5 min-w-0">
              <Skeleton className="size-4 shrink-0 rounded" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="space-y-1.5 pt-1 border-t border-[#F0ECE4]">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>

          <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs space-y-4">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-4 pt-1 border-t border-[#F0ECE4]">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>

              <div className="space-y-1.5 pt-3 border-t border-[#F0ECE4]">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs space-y-3">
            <Skeleton className="h-5 w-28" />
            <div className="space-y-1.5 pt-1 border-t border-[#F0ECE4]">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
              <Skeleton className="h-3 w-36" />
            </div>
          </div>

          <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs space-y-3">
            <Skeleton className="h-5 w-24" />
            <div className="space-y-2 pt-1 border-t border-[#F0ECE4]">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-1.5 pt-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="flex items-center justify-between pt-1 border-t border-[#F0ECE4]">
              <div className="space-y-1">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE4]">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-18 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-22 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
