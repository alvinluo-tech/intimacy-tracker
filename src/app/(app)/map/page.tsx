import { Suspense } from "react";
import { MapViewClient } from "@/components/map/MapViewClient";
import { listMapPoints } from "@/features/map/queries";
import { listManagePartners } from "@/features/partners/queries";

function normalizeDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; partnerId?: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading...</div>}>
      <MapPageData searchParams={searchParams} />
    </Suspense>
  );
}

async function MapPageData({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; partnerId?: string }>;
}) {
  const sp = await searchParams;
  const from = normalizeDate(sp.from);
  const to = normalizeDate(sp.to);

  const partners = await listManagePartners();
  const defaultPartner = partners.find((p) => p.is_default);
  const partnerId = sp.partnerId ?? defaultPartner?.id;
  const points = await listMapPoints({ from, to, partnerId: partnerId || undefined });

  return (
    <div className="flex h-[100svh] flex-col md:h-screen">
      <div className="flex-1 px-4 py-5 md:p-6">
        <MapViewClient points={points} from={from} to={to} partnerId={partnerId || ""} partners={partners} />
      </div>
    </div>
  );
}
