import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { useTranslations } from "next-intl";

export default function DashboardLoading() {
  const t = useTranslations("analytics");
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 animate-pulse">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AnalyticsCard title={t("thisWeek")}>
          <div className="h-8 w-12 rounded bg-white/[0.06]" />
        </AnalyticsCard>
        <AnalyticsCard title={t("avgDuration")}>
          <div className="h-8 w-12 rounded bg-white/[0.06]" />
        </AnalyticsCard>
        <AnalyticsCard title={t("avgRating")}>
          <div className="h-8 w-12 rounded bg-white/[0.06]" />
        </AnalyticsCard>
        <AnalyticsCard title={t("lastRecord")}>
          <div className="mt-1 h-5 w-24 rounded bg-white/[0.06]" />
        </AnalyticsCard>
      </div>

      <AnalyticsCard title={t("thirtyDayActivity")}>
        <div className="h-56 w-full rounded bg-white/[0.03]" />
      </AnalyticsCard>

      <AnalyticsCard title={t("topTags")}>
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-white/[0.06]" />
          <div className="h-6 w-20 rounded-full bg-white/[0.06]" />
          <div className="h-6 w-14 rounded-full bg-white/[0.06]" />
        </div>
      </AnalyticsCard>
    </div>
  );
}
