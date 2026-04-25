import { TopBar } from "@/components/layout/TopBar";
import { EncounterCard } from "@/components/timeline/EncounterCard";
import { listEncounters } from "@/features/records/queries";

export default async function TimelinePage() {
  const items = await listEncounters();

  return (
    <div className="min-h-[100svh]">
      <TopBar title="Timeline" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        {items.length ? (
          <div className="space-y-3">
            {items.map((it) => (
              <EncounterCard key={it.id} item={it} />
            ))}
          </div>
        ) : (
          <div className="rounded-[12px] border border-[var(--app-border-subtle)] bg-white/[0.02] px-4 py-6 text-[13px] text-[var(--app-text-muted)]">
            还没有任何记录。去 “Quick Log” 创建第一条。
          </div>
        )}
      </div>
    </div>
  );
}
