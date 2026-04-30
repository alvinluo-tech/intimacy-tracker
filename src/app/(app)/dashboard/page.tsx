import { unstable_cache } from "next/cache";
import { getAnalyticsStats } from "@/features/analytics/queries";
import { listPartners, listTags } from "@/features/records/queries";
import { DashboardContent } from "@/components/analytics/DashboardContent";

const getCachedAnalyticsStats = unstable_cache(
  async (partnerId: string | null) => getAnalyticsStats(partnerId),
  ["dashboard-stats"],
  { revalidate: 60 }
);

const getCachedPartners = unstable_cache(
  async () => listPartners(),
  ["dashboard-partners"],
  { revalidate: 60 }
);

const getCachedTags = unstable_cache(
  async () => listTags(),
  ["dashboard-tags"],
  { revalidate: 60 }
);

export default async function DashboardPage(props: { searchParams?: Promise<{ partnerId?: string }> }) {
  const searchParams = await props.searchParams;
  const partnerId = searchParams?.partnerId || null;
  const stats = await getCachedAnalyticsStats(partnerId);
  const partners = await getCachedPartners();
  const tags = await getCachedTags();

  return (
    <div className="min-h-[100svh] bg-background">
      <DashboardContent stats={stats} partners={partners} tags={tags} selectedPartnerId={partnerId} />
    </div>
  );
}
