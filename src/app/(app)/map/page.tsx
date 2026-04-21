import { TopBar } from "@/components/layout/TopBar";
import { MapViewClient } from "@/components/map/MapViewClient";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { listMapPoints } from "@/features/map/queries";

function normalizeDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const from = normalizeDate(sp.from);
  const to = normalizeDate(sp.to);
  const points = await listMapPoints({ from, to });

  return (
    <div className="min-h-[100svh]">
      <TopBar title="Map" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <Card className="p-5">
          <div className="text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)]">
            地图（默认模糊点位）
          </div>
          <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <label className="text-[12px] text-[var(--app-text-secondary)]">
              从
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="mt-1 h-10 w-full rounded-[6px] border border-[var(--app-border)] bg-white/[0.02] px-3 text-[14px] text-[var(--app-text)]"
              />
            </label>
            <label className="text-[12px] text-[var(--app-text-secondary)]">
              到
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="mt-1 h-10 w-full rounded-[6px] border border-[var(--app-border)] bg-white/[0.02] px-3 text-[14px] text-[var(--app-text)]"
              />
            </label>
            <button
              type="submit"
              className="h-10 self-end rounded-[6px] border border-transparent bg-[var(--brand)] px-4 text-[13px] font-medium tracking-[-0.13px] text-white hover:bg-[var(--brand-hover)]"
            >
              筛选
            </button>
          </form>
        </Card>

        {points.length ? (
          <MapViewClient points={points} />
        ) : (
          <Notice>
            当前筛选范围内没有可显示的位置信息。请在记录时开启位置并保存经纬度后再查看地图。
          </Notice>
        )}
      </div>
    </div>
  );
}
