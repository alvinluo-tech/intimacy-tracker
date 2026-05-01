import { Suspense } from "react";
import { DashboardContent } from "@/components/analytics/DashboardContent";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ partnerId?: string }>;
}) {
  const { partnerId } = await searchParams;
  return (
    <div className="min-h-[100svh] bg-background">
      <Suspense fallback={<div className="p-6 text-muted">Loading...</div>}>
        <DashboardData partnerId={partnerId ?? null} />
      </Suspense>
    </div>
  );
}

async function DashboardData({ partnerId }: { partnerId: string | null }) {
  const { getAnalyticsStats } = await import("@/features/analytics/queries");
  const { listPartners, listTags } = await import("@/features/records/queries");

  const [stats, partners, tags] = await Promise.all([
    getAnalyticsStats(partnerId),
    listPartners(),
    listTags(),
  ]);
  return <DashboardContent stats={stats} partners={partners} tags={tags} selectedPartnerId={partnerId} />;
}
