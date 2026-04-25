import { getAnalyticsStats } from "@/features/analytics/queries";
import { listPartners, listTags } from "@/features/records/queries";
import { DashboardContent } from "@/components/analytics/DashboardContent";

export default async function DashboardPage() {
  const stats = await getAnalyticsStats();
  const partners = await listPartners();
  const tags = await listTags();

  return (
    <div className="min-h-[100svh] bg-[#0b0f18]">
      <DashboardContent stats={stats} partners={partners} tags={tags} />
    </div>
  );
}
