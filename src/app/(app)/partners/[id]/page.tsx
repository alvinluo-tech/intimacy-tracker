import Link from "next/link";

import { TopBar } from "@/components/layout/TopBar";
import { PartnerDetailView } from "@/components/partners/PartnerDetailView";
import { Card } from "@/components/ui/card";
import {
  getPartnerById,
  listPartnerMemoryItems,
  listPartnerPhotoUrls,
  getPartnerStats,
  listPartnerEncounters,
} from "@/features/partners/queries";
import { listPartners, listTags } from "@/features/records/queries";

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partner = await getPartnerById(id);

  if (!partner) {
    return (
      <div className="min-h-[100svh]">
        <TopBar title="Partner Details" showBack />
        <div className="mx-auto max-w-6xl px-4 py-5">
          <Card className="p-5">
            <div className="text-[14px] text-[var(--app-text)]">伴侣不存在或无权限</div>
            <Link
              href="/partners"
              className="mt-2 inline-block text-[13px] text-[var(--brand-accent)] hover:text-[var(--brand-hover)]"
            >
              返回伴侣列表
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const isBoundPartner = partner.source === "bound";

  const [stats, encounters, photoUrls, manualItems, partners, tags] = await Promise.all([
    getPartnerStats(id),
    listPartnerEncounters(id, partner.bound_user_id),
    listPartnerPhotoUrls(id),
    isBoundPartner && partner.bound_user_id
      ? listPartnerMemoryItems({ partnerId: id, boundUserId: partner.bound_user_id })
      : listPartnerMemoryItems({ partnerId: id }),
    listPartners(),
    listTags(),
  ]);

  return (
    <div className="min-h-[100svh] bg-[#0b0f18]">
      <PartnerDetailView
        partner={partner}
        stats={stats}
        encounters={encounters}
        photoUrls={photoUrls}
        isBound={isBoundPartner}
        boundUserId={partner.bound_user_id ?? undefined}
        manualItems={manualItems}
        partners={partners}
        tags={tags}
      />
    </div>
  );
}
