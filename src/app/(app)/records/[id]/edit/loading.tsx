import { Skeleton } from "@/components/ui/skeleton";

export default function RecordEditLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-[200px]" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
