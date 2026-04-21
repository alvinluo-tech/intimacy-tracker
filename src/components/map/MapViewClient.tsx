"use client";

import dynamic from "next/dynamic";

import type { MapPoint } from "@/features/map/types";

const DynamicMapView = dynamic(
  () => import("@/components/map/MapView").then((m) => m.MapView),
  {
    ssr: false,
  }
);

export function MapViewClient({ points }: { points: MapPoint[] }) {
  return <DynamicMapView points={points} />;
}
