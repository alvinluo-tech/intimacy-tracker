import { Skeleton } from "@/components/ui/skeleton";

export default function RecordEditLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
      <div className="space-y-8 pb-4">
        {/* Time Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-[14px] w-[120px]" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-[80px] rounded-md" />
              <Skeleton className="h-7 w-[120px] rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 rounded-[12px] bg-surface/2 p-4 border border-border/5">
            <div className="space-y-2">
              <Skeleton className="h-[14px] w-[80px]" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-[14px] w-[100px]" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>
        </div>

        <hr className="border-border/5" />

        {/* Details Section */}
        <div className="space-y-6">
          <Skeleton className="h-[14px] w-[80px]" />

          <div className="space-y-4">
            {/* Partner */}
            <div className="space-y-2">
              <Skeleton className="h-[14px] w-[60px]" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-[30px] w-[80px] rounded-full" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[30px] w-[90px] rounded-full" />
                ))}
              </div>
            </div>

            {/* Rating & Mood */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 rounded-[12px] bg-surface/2 p-4 border border-border/5">
              <div className="space-y-3">
                <Skeleton className="h-[14px] w-[80px]" />
                <Skeleton className="h-10 w-full rounded-[8px]" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-[14px] w-[60px]" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <Skeleton className="h-[14px] w-[60px]" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[28px] w-[70px] rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <hr className="border-border/5" />

        {/* Notes Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-[14px] w-[100px]" />
            <Skeleton className="h-8 w-[80px] rounded-md" />
          </div>
        </div>

        <hr className="border-border/5" />

        {/* Location Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-[14px] w-[80px]" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-[12px] w-[60px]" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 flex-[2] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
