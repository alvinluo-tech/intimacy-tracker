import { Suspense } from "react";
import { DashboardContent } from "@/components/analytics/DashboardContent";

export default function DashboardPage() {
  return (
    <div className="min-h-[100svh] bg-background">
      <Suspense fallback={<div className="p-6 text-muted">Loading...</div>}>
        <DashboardData />
      </Suspense>
    </div>
  );
}

async function DashboardData() {
  const { getAnalyticsStats } = await import("@/features/analytics/queries");
  const { listPartners, listTags } = await import("@/features/records/queries");

  const [stats, partners, tags] = await Promise.all([
    getAnalyticsStats(null),
    listPartners(),
    listTags(),
  ]);
  return <DashboardContent stats={stats} partners={partners} tags={tags} selectedPartnerId={null} />;
}
