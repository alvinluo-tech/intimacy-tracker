"use client";

import dynamic from "next/dynamic";

import type { MapPoint } from "@/features/map/types";
import type { PartnerManageItem } from "@/features/partners/queries";

const DynamicMapView = dynamic(
  () => import("@/components/map/MapView").then((m) => m.MapView),
  {
    ssr: false,
  }
);

export function MapViewClient({ points, from, to, partnerId, partners }: { points: MapPoint[], from?: string, to?: string, partnerId?: string, partners?: PartnerManageItem[] }) {
  return <DynamicMapView points={points} from={from} to={to} partnerId={partnerId} partners={partners} />;
}
