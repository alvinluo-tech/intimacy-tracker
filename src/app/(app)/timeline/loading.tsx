import { TopBar } from "@/components/layout/TopBar";

export default function TimelineLoading() {
  return (
    <div className="min-h-[100svh]">
      <TopBar title="Timeline" />
      <div className="mx-auto max-w-2xl px-4 py-5 animate-pulse">
        <div className="mb-4 flex gap-2">
          <div className="h-10 w-24 rounded-[6px] bg-white/[0.05]"></div>
          <div className="h-10 w-24 rounded-[6px] bg-white/[0.05]"></div>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col gap-3 rounded-[12px] border border-[var(--app-border)] bg-white/[0.02] p-4">
              <div className="flex justify-between">
                <div className="h-5 w-32 rounded bg-white/[0.05]"></div>
                <div className="h-5 w-16 rounded bg-white/[0.05]"></div>
              </div>
              <div className="h-4 w-48 rounded bg-white/[0.05]"></div>
              <div className="flex gap-2 mt-2">
                <div className="h-6 w-12 rounded-full bg-white/[0.05]"></div>
                <div className="h-6 w-16 rounded-full bg-white/[0.05]"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}