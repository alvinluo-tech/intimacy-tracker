import { Skeleton } from "@/components/ui/skeleton";

export default function PlaybackLoading() {
  return (
    <div className="flex h-[100svh] flex-col md:h-screen">
      <div className="flex-1 px-4 py-5 md:p-6">
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>
    </div>
  );
}
