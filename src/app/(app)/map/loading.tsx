import { TopBar } from "@/components/layout/TopBar";

export default function MapLoading() {
  return (
    <div className="flex h-[100svh] flex-col md:h-screen animate-pulse">
      <TopBar title="Map" />
      <div className="flex-1 px-4 py-5 md:p-6">
        <div className="h-full w-full rounded-[12px] bg-[#1e1e1e] flex items-center justify-center">
          <div className="text-[var(--app-text-muted)] text-[14px]">Loading Map...</div>
        </div>
      </div>
    </div>
  );
}