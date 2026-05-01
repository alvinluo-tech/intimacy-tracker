import { Skeleton } from "@/components/ui/skeleton";

export default function MapLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-[120px]" />
      <Skeleton className="h-[calc(100vh-200px)] w-full rounded-2xl" />
    </div>
  );
}
