import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";

export default function MapPage() {
  return (
    <div className="min-h-[100svh]">
      <TopBar title="Map" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <Card className="p-5">
          <div className="text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)]">
            地图
          </div>
          <div className="mt-2 text-[13px] leading-5 text-[var(--app-text-muted)]">
            Milestone 5 将在此使用 Leaflet 渲染模糊位置点。
          </div>
        </Card>
      </div>
    </div>
  );
}

