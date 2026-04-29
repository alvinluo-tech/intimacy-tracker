import { getAnalyticsStats } from "@/features/analytics/queries";
import { listPartners, listTags } from "@/features/records/queries";
import { DashboardContent } from "@/components/analytics/DashboardContent";

export default async function DashboardPage(props: { searchParams?: Promise<{ partnerId?: string }> }) {
  const searchParams = await props.searchParams;
  const partnerId = searchParams?.partnerId || null;
  const stats = await getAnalyticsStats(partnerId);
  const partners = await listPartners();
  const tags = await listTags();

  return (
    <div className="min-h-[100svh] bg-background">
      <DashboardContent stats={stats} partners={partners} tags={tags} selectedPartnerId={partnerId} />
    </div>
  );
}
