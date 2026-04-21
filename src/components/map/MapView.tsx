"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";

import { createLeafletMapAdapter } from "@/features/map/adapter";
import type { MapPoint, MapViewMode } from "@/features/map/types";

const ZOOM_THRESHOLD = 12;

export function MapView({ points }: { points: MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const adapterRef = useRef<ReturnType<typeof createLeafletMapAdapter> | null>(null);
  const [zoom, setZoom] = useState(2);
  const [mode, setMode] = useState<MapViewMode>("auto");
  const hasFittedRef = useRef(false);

  const renderMode: Exclude<MapViewMode, "auto"> = useMemo(() => {
    if (mode === "heatmap") return "heatmap";
    if (mode === "exact") return "exact";
    return zoom >= ZOOM_THRESHOLD ? "exact" : "heatmap";
  }, [mode, zoom]);

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
    setZoom(map.getZoom());
    map.on("zoomend", () => {
      setZoom(map.getZoom());
    });

    return () => {
      adapterRef.current?.clear();
      map.off("zoomend");
      map.remove();
      mapRef.current = null;
      adapterRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!adapterRef.current) return;
    if (renderMode === "heatmap") {
      adapterRef.current.renderHeatmap(points);
    } else {
      adapterRef.current.renderExact(points);
    }
  }, [points, renderMode]);

  useEffect(() => {
    hasFittedRef.current = false;
  }, [points]);

  useEffect(() => {
    if (!adapterRef.current || !points.length || hasFittedRef.current) return;
    adapterRef.current.fitBounds(points);
    hasFittedRef.current = true;
  }, [points]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-[var(--app-text-muted)]">
          当前模式：{renderMode === "heatmap" ? "城市热力图" : "精确位置点"}（Zoom {zoom}
          ，阈值 {ZOOM_THRESHOLD}）
        </div>
        <div className="inline-flex rounded-[8px] border border-[var(--app-border-subtle)] p-1">
          {[
            { key: "auto", label: "自动" },
            { key: "heatmap", label: "热力图" },
            { key: "exact", label: "精确点" },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMode(opt.key as MapViewMode)}
              className={[
                "rounded-[6px] px-3 py-1 text-[12px]",
                mode === opt.key
                  ? "bg-white/[0.08] text-[var(--app-text)]"
                  : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="h-[70svh] w-full rounded-[12px] ring-linear" />
    </div>
  );
}
