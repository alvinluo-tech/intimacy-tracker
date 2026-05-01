import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 pb-24">
      {/* Header Area */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-[30px] w-[200px]" />
          <Skeleton className="h-[20px] w-[120px]" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-10 w-[140px] rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* QuickStartTimer */}
      <Skeleton className="h-[88px] w-full rounded-[20px]" />

      {/* FeatureCards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Skeleton className="h-[76px] w-full rounded-[20px]" />
        <Skeleton className="h-[76px] w-full rounded-[20px]" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-full rounded-[20px]" />
        ))}
      </div>

      {/* Activity Heatmap */}
      <Skeleton className="h-[200px] w-full rounded-[20px] col-span-2 lg:col-span-4" />

      {/* Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Skeleton className="h-[200px] w-full rounded-[20px]" />
        <Skeleton className="h-[200px] w-full rounded-[20px]" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
