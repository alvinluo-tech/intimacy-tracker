import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { ExportButton } from "@/components/settings/ExportButton";

export default function ExportPage() {
  return (
    <div className="min-h-[100svh]">
      <TopBar title="Export" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <Card className="p-5">
          <div className="text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)]">
            数据导出
          </div>
          <div className="mt-2 text-[13px] leading-5 text-[var(--app-text-muted)]">
            导出仅包含你的数据。每次导出都会记录到审计日志。
          </div>
          <div className="mt-4">
            <ExportButton />
          </div>
        </Card>
      </div>
    </div>
  );
}
