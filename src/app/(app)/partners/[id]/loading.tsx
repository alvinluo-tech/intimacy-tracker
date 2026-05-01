import { Skeleton } from "@/components/ui/skeleton";

export function PartnerDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 md:px-0">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-[24px] w-[140px]" />
          <Skeleton className="h-[13px] w-[100px]" />
        </div>
      </div>

      {/* Profile Card */}
      <div className="mb-6 rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-[20px] w-[140px]" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-[22px] w-[80px] rounded-full" />
              <Skeleton className="h-[22px] w-[60px] rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-[32px] w-[60px] rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <Skeleton className="h-[36px] w-[100px] rounded-lg" />
        <Skeleton className="h-[36px] w-[90px] rounded-lg" />
        <Skeleton className="h-[36px] w-[90px] rounded-lg" />
      </div>

      {/* Tab Content: Stats */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[240px] w-full rounded-2xl" />
        <Skeleton className="h-[200px] w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function PartnerDetailLoading() {
  return <PartnerDetailSkeleton />;
}
