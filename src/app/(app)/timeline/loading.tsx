import { Skeleton } from "@/components/ui/skeleton";

export function TimelineSkeleton() {
  return (
    <div className="min-h-[100svh] bg-background pb-24">
      <div className="mx-auto max-w-6xl px-4 py-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-[24px] w-[140px]" />
            <Skeleton className="h-[13px] w-[100px]" />
          </div>
        </div>

        {/* Search + Sort + Filter */}
        <div className="mt-5 flex items-center gap-2">
          <Skeleton className="h-11 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>

        {/* Preset Tags */}
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[30px] w-[80px] rounded-full" />
          ))}
        </div>

        {/* Timeline Items */}
        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
                {/* Date + Partner */}
                <div className="flex items-center justify-between">
                  <Skeleton className="h-[14px] w-[120px]" />
                  <Skeleton className="h-[20px] w-[70px] rounded-full" />
                </div>
                {/* Rating */}
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-4" />
                  ))}
                </div>
                {/* Duration + Mood + Location */}
                <div className="flex flex-wrap gap-3">
                  <Skeleton className="h-[12px] w-[60px]" />
                  <Skeleton className="h-[12px] w-[40px]" />
                  <Skeleton className="h-[12px] w-[80px]" />
                </div>
                {/* Tags */}
                <div className="flex gap-2">
                  <Skeleton className="h-[20px] w-[50px] rounded-full" />
                  <Skeleton className="h-[20px] w-[60px] rounded-full" />
                </div>
              </div>
              {/* Connector */}
              {i < 4 && (
                <div className="h-3 flex items-center justify-center">
                  <div className="h-3 w-px bg-surface" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TimelineLoading() {
  return <TimelineSkeleton />;
}
