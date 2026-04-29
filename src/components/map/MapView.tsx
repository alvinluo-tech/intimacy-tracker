"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useTranslations } from "next-intl";
import { Filter, Calendar } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";

import { createMapboxAdapter } from "@/features/map/adapter";
import type { MapPoint, MapViewMode } from "@/features/map/types";

const ZOOM_THRESHOLD = 12;

export function MapView({ points, from, to }: { points: MapPoint[], from?: string, to?: string }) {
  const t = useTranslations("map");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const adapterRef = useRef<ReturnType<typeof createMapboxAdapter> | null>(null);
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

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [0, 20],
      zoom: 2,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    map.on("load", () => {
      mapRef.current = map;
      adapterRef.current = createMapboxAdapter(map, t);
      
      setZoom(map.getZoom());
      map.on("zoom", () => {
        setZoom(map.getZoom());
      });
      map.on("moveend", () => {
        setZoom(map.getZoom());
      });

      // Initialize rendering once map is loaded
      if (adapterRef.current) {
        if (renderMode === "heatmap") {
          adapterRef.current.renderHeatmap(points);
        } else {
          adapterRef.current.renderExact(points);
        }

        if (points.length && !hasFittedRef.current) {
          adapterRef.current.fitBounds(points);
          hasFittedRef.current = true;
        }
      }
    });

    return () => {
      adapterRef.current?.clear();
      map.remove();
      mapRef.current = null;
      adapterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentRenderMode = useRef<Exclude<MapViewMode, "auto"> | null>(null);

  useEffect(() => {
    if (!adapterRef.current || !mapRef.current?.isStyleLoaded()) return;
    
    // Avoid redundant re-renders if the renderMode hasn't actually changed
    if (currentRenderMode.current === renderMode) return;
    currentRenderMode.current = renderMode;

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
    if (!adapterRef.current || !mapRef.current?.isStyleLoaded() || !points.length || hasFittedRef.current) return;
    adapterRef.current.fitBounds(points);
    hasFittedRef.current = true;
  }, [points]);

  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="relative h-[calc(100svh-64px)] w-full md:h-screen flex flex-col -mx-4 -mb-5 md:mx-0 md:mb-0">
      {/* Map Container */}
      <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full bg-[#1e1e1e] md:rounded-[12px]" />

      {/* Floating Controls */}
      <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 flex flex-col gap-3 md:left-6 md:top-6 md:max-w-sm">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-full border border-white/[0.05] bg-[var(--app-bg)]/80 p-1 shadow-lg backdrop-blur-xl">
            {[
              { key: "auto", label: t("autoMode") },
              { key: "heatmap", label: t("heatmapMode") },
              { key: "exact", label: t("exactMode") },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMode(opt.key as MapViewMode)}
                className={[
                  "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                  mode === opt.key
                    ? "bg-[var(--brand)] text-white shadow-sm"
                    : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.05] bg-[var(--app-bg)]/80 text-[var(--app-text)] shadow-lg backdrop-blur-xl transition-colors hover:bg-white/[0.04]"
            aria-label={t("filter")}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="pointer-events-auto animate-in fade-in slide-in-from-top-2 rounded-[16px] border border-white/[0.05] bg-[var(--app-bg)]/95 p-4 shadow-xl backdrop-blur-2xl">
            <div className="mb-4 flex items-center gap-2 text-[13px] font-medium text-[var(--app-text)]">
              <Calendar className="h-4 w-4 text-[var(--brand)]" />
              {t("timeFilter")}
            </div>
            <form className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-[12px] text-[var(--app-text-secondary)]">
                  {t("from")}
                  <input
                    type="date"
                    name="from"
                    defaultValue={from}
                    className="h-9 w-full rounded-[6px] border border-[var(--app-border)] bg-white/[0.02] px-3 text-[13px] text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[12px] text-[var(--app-text-secondary)]">
                  {t("to")}
                  <input
                    type="date"
                    name="to"
                    defaultValue={to}
                    className="h-9 w-full rounded-[6px] border border-[var(--app-border)] bg-white/[0.02] px-3 text-[13px] text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="h-9 w-full rounded-[6px] bg-[var(--brand)] text-[13px] font-medium text-white transition-colors hover:bg-[var(--brand-hover)]"
              >
                {t("applyFilter")}
              </button>
            </form>
          </div>
        )}

        <div className="pointer-events-none mt-1 self-start rounded-full border border-white/[0.02] bg-[var(--app-bg)]/60 px-3 py-1.5 text-[11px] font-medium text-[var(--app-text-muted)] backdrop-blur-md">
          {renderMode === "heatmap" ? t("heatmapLabel") : t("exactLabel")} (Zoom: {zoom.toFixed(1)})
        </div>
      </div>

      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center bg-[var(--app-bg)]/40 backdrop-blur-sm">
          <div className="rounded-[12px] border border-white/[0.05] bg-[var(--app-bg)]/90 px-6 py-4 text-center text-[13px] font-medium text-[var(--app-text)] shadow-xl">
            {t("noCoordinates")}
          </div>
        </div>
      )}
    </div>
  );
}
