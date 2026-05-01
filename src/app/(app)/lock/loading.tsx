import { Skeleton } from "@/components/ui/skeleton";

export default function LockLoading() {
  return (
    <div className="flex min-h-[100svh] items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Skeleton className="h-4 w-32 rounded-full" />
        <Skeleton className="h-4 w-24 rounded-full" />
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-2 w-2 rounded-full" />
          ))}
        </div>
        <div className="grid w-full grid-cols-3 gap-x-5 gap-y-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
