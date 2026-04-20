"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";

import { createLeafletMapAdapter } from "@/features/map/adapter";
import type { MapPoint } from "@/features/map/types";

export function MapView({ points }: { points: MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const adapterRef = useRef<ReturnType<typeof createLeafletMapAdapter> | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    mapRef.current = map;
    adapterRef.current = createLeafletMapAdapter(map);

    return () => {
      adapterRef.current?.clear();
      map.remove();
      mapRef.current = null;
      adapterRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!adapterRef.current) return;
    adapterRef.current.renderPoints(points);
    adapterRef.current.fitBounds();
  }, [points]);

  return <div ref={containerRef} className="h-[70svh] w-full rounded-[12px] ring-linear" />;
}
