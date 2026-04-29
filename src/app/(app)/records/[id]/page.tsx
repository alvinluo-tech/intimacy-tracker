import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEncounterDetail } from "@/features/records/queries";
import { formatDateInTimezone } from "@/lib/utils/formatDateInTimezone";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getTranslations("errors");
  const te = await getTranslations("encounter");
  const tc = await getTranslations("common");
  const data = await getEncounterDetail(id);

  if (!data) {
    return (
      <div className="min-h-[100svh]">
        <TopBar title={tc("record")} showBack />
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
          <Card className="p-5">
            <div className="text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)]">
              {t("notFound")}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh]">
      <TopBar title={tc("record")} showBack />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <Card className="p-5">
          <div className="text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)]">
              {te("encounterDetails")}
          </div>
          <div className="mt-3 flex gap-3">
            <Link
              href={`/records/${id}/edit`}
              className="text-[13px] font-medium tracking-[-0.13px] text-[var(--brand-accent)] hover:text-[var(--brand-hover)]"
            >
              {tc("edit")}
            </Link>
          </div>
          <div className="mt-2 space-y-2 text-[13px] leading-5 text-[var(--app-text-muted)]">
            <div>ID: {id}</div>
            <div>{te("startTime")}: {formatDateInTimezone(data.started_at, "MMM d, yyyy", data.timezone || "UTC", locale)} {formatDateInTimezone(data.started_at, "h:mm a", data.timezone || "UTC", locale)}</div>
            <div>{te("endTime")}: {data.ended_at ? formatDateInTimezone(data.ended_at, "MMM d, yyyy", data.timezone || "UTC", locale) + " " + formatDateInTimezone(data.ended_at, "h:mm a", data.timezone || "UTC", locale) : "-"}</div>
            <div>{te("duration")}: {data.duration_minutes ?? "-"}</div>
            <div>{te("rating")}: {data.rating ?? "-"}</div>
            <div>{te("mood")}: {data.mood ?? "-"}</div>
            <div>
              {te("locationLabel")}: {data.location_enabled ? data.city ?? data.location_label ?? "-" : te("locationNotRecorded")}
            </div>
            <div>{te("notes")}: {data.notes ?? "-"}</div>
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
