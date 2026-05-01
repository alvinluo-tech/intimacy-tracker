import { Skeleton } from "@/components/ui/skeleton";

export function RecordDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
      {/* Card */}
      <div className="rounded-[12px] border border-border bg-surface p-5 space-y-4">
        {/* Title + Edit */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-[14px] w-[140px]" />
          <Skeleton className="h-[13px] w-[40px]" />
        </div>

        {/* Detail rows */}
        <div className="space-y-2 text-[13px] leading-5">
          <Skeleton className="h-[18px] w-[100px]" />
          <Skeleton className="h-[18px] w-[220px]" />
          <Skeleton className="h-[18px] w-[180px]" />
          <Skeleton className="h-[18px] w-[100px]" />
          <Skeleton className="h-[18px] w-[80px]" />
          <Skeleton className="h-[18px] w-[60px]" />
          <Skeleton className="h-[18px] w-[150px]" />
          <Skeleton className="h-[18px] w-[120px]" />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Skeleton className="h-[24px] w-[60px] rounded-full" />
          <Skeleton className="h-[24px] w-[80px] rounded-full" />
          <Skeleton className="h-[24px] w-[50px] rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function RecordDetailLoading() {
  return <RecordDetailSkeleton />;
}
