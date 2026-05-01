import { Skeleton } from "@/components/ui/skeleton";

export default function RecordDetailLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-[300px] w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
