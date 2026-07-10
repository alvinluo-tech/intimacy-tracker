import { Suspense } from "react";
import { DashboardContent } from "@/components/analytics/DashboardContent";
import { DashboardSkeleton } from "./loading";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ partnerId?: string; startDate?: string; endDate?: string; climaxed?: string }>;
}) {
  const { partnerId, startDate, endDate, climaxed } = await searchParams;
  const climaxedFilter = climaxed === "true" ? true : climaxed === "false" ? false : null;
  return (
    <div className="min-h-[100svh] bg-background">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData
          partnerId={partnerId ?? null}
          startDate={startDate ?? null}
          endDate={endDate ?? null}
          climaxed={climaxedFilter}
        />
      </Suspense>
    </div>
  );
}

async function DashboardData({
  partnerId,
  startDate,
  endDate,
  climaxed,
}: {
  partnerId: string | null;
  startDate: string | null;
  endDate: string | null;
  climaxed: boolean | null;
}) {
  const { getAnalyticsStats } = await import("@/features/analytics/queries");
  const { listPartners, listTags } = await import("@/features/records/queries");

  const [stats, partners, tags] = await Promise.all([
    getAnalyticsStats(partnerId, startDate, endDate, climaxed),
    listPartners(),
    listTags(),
  ]);
  return (
    <DashboardContent
      stats={stats}
      partners={partners}
      tags={tags}
      selectedPartnerId={partnerId}
      dateStartDate={startDate}
      dateEndDate={endDate}
      selectedClimaxed={climaxed}
    />
  );
}
