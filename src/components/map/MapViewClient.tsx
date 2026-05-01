"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

import type { MapPoint } from "@/features/map/types";
import type { PartnerManageItem } from "@/features/partners/queries";

const DynamicMapView = dynamic(
  () => import("@/components/map/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-full w-full">
        <Skeleton className="absolute inset-0 rounded-2xl" />
      </div>
    ),
  }
);

export function MapViewClient({ points, from, to, partnerId, partners }: { points: MapPoint[], from?: string, to?: string, partnerId?: string, partners?: PartnerManageItem[] }) {
  return <DynamicMapView points={points} from={from} to={to} partnerId={partnerId} partners={partners} />;
}
