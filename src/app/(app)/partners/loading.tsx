import { Skeleton } from "@/components/ui/skeleton";

export function PartnersSkeleton() {
  return (
    <div className="min-h-[100svh] bg-background font-light">
      <div className="mx-auto max-w-2xl px-4 py-8 pb-24 md:px-0">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-[24px] w-[120px]" />
            </div>
            <Skeleton className="h-[13px] w-[160px] ml-[52px]" />
          </div>
          <Skeleton className="h-10 w-[100px] rounded-full" />
        </div>

        {/* Search + Sort */}
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-[140px] rounded-xl" />
        </div>

        {/* Partner Cards */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-1 items-center gap-4 min-w-0">
                <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-[16px] w-[100px]" />
                  <Skeleton className="h-[12px] w-[140px]" />
                </div>
              </div>
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PartnersLoading() {
  return <PartnersSkeleton />;
}
