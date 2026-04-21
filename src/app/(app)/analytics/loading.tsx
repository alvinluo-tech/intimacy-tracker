import { TopBar } from "@/components/layout/TopBar";

export default function AnalyticsLoading() {
  return (
    <div className="min-h-[100svh]">
      <TopBar title="Analytics" />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 animate-pulse">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-[12px] border border-[var(--app-border)] bg-white/[0.02] p-4">
              <div className="h-4 w-20 rounded bg-white/[0.05]"></div>
              <div className="mt-3 h-8 w-12 rounded bg-white/[0.05]"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-[12px] border border-[var(--app-border)] bg-white/[0.02]"></div>
          ))}
        </div>
      </div>
    </div>
  );
}