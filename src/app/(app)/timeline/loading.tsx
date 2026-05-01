import { Skeleton } from "@/components/ui/skeleton";

export default function TimelineLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-[160px]" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-start">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
