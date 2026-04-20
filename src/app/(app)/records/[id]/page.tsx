import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEncounterDetail } from "@/features/records/queries";
import Link from "next/link";

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getEncounterDetail(id);

  if (!data) {
    return (
      <div className="min-h-[100svh]">
        <TopBar title="Record" />
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
          <Card className="p-5">
            <div className="text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)]">
              记录不存在或无权限
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh]">
      <TopBar title="Record" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <Card className="p-5">
          <div className="text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)]">
            记录详情
          </div>
          <div className="mt-3 flex gap-3">
            <Link
              href={`/records/${id}/edit`}
              className="text-[13px] font-medium tracking-[-0.13px] text-[var(--brand-accent)] hover:text-[var(--brand-hover)]"
            >
              编辑
            </Link>
          </div>
          <div className="mt-2 space-y-2 text-[13px] leading-5 text-[var(--app-text-muted)]">
            <div>ID: {id}</div>
            <div>开始: {data.started_at}</div>
            <div>结束: {data.ended_at ?? "-"}</div>
            <div>时长: {data.duration_minutes ?? "-"}</div>
            <div>评分: {data.rating ?? "-"}</div>
            <div>心情: {data.mood ?? "-"}</div>
            <div>
              地点: {data.location_enabled ? data.city ?? data.location_label ?? "-" : "未记录"}
            </div>
            <div>备注: {data.notes ?? "-"}</div>
          </div>

          {data.tags.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.tags.map((t) => (
                <Badge key={t.id}>{t.name}</Badge>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
