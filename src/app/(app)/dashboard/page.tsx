import { Suspense } from "react";
import { getAnalyticsStats } from "@/features/analytics/queries";
import { listPartners, listTags } from "@/features/records/queries";
import { DashboardContent } from "@/components/analytics/DashboardContent";
import { DashboardSkeleton } from "@/components/analytics/DashboardSkeleton";

export default async function DashboardPage(props: { searchParams?: Promise<{ partnerId?: string }> }) {
  const searchParams = await props.searchParams;
  const partnerId = searchParams?.partnerId || null;

  return (
    <div className="min-h-[100svh] bg-background">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData partnerId={partnerId} />
      </Suspense>
    </div>
  );
}

async function DashboardData({ partnerId }: { partnerId: string | null }) {
  const [stats, partners, tags] = await Promise.all([
    getAnalyticsStats(partnerId),
    listPartners(),
    listTags(),
  ]);
  return <DashboardContent stats={stats} partners={partners} tags={tags} selectedPartnerId={partnerId} />;
}
