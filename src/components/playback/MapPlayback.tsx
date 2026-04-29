"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";

import { useMapStore } from "@/stores/map-store";
import type { PlaybackEncounter } from "@/features/playback/types";

const ZOOM_MAP = { nation: 4, city: 8, point: 11 } as const;
const TRAVEL_FRAMES = 300;
const LINGER_MS = 700;
const BASE_SEGMENT_DURATION = 2500;
const MIN_DURATION = 1500;
const MAX_DURATION = 6000;
const LOOK_AHEAD_FACTOR = 0.12;
const SNAP_DISTANCE_KM = 0.5;
const SAME_LOCATION_KM = 0.3;

type ArcFrame = {
  coords: [number, number];
  bearing: number;
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return a + diff * t;
}

function lingerZoomCurve(t: number, baseZoom: number): number {
  if (t < 0.3) {
    return baseZoom - 0.35 * (t / 0.3);
  }
  const t2 = (t - 0.3) / 0.7;
  return baseZoom - 0.35 + 1.15 * easeInOutCubic(t2);
}

function buildArcFrames(
  from: [number, number],
  to: [number, number],
  n: number
): { frames: ArcFrame[]; arcCoords: [number, number][] } {
  const arc = turf.greatCircle(turf.point(from), turf.point(to), {
    npoints: Math.max(n, 50),
  }) as any;
  const totalDist = turf.length(arc, { units: "kilometers" });
  const frames: ArcFrame[] = [];

  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const dist = totalDist * t;
    const pt = turf.along(arc, dist, { units: "kilometers" });
    const coords = pt.geometry.coordinates as [number, number];
    const prevDist = Math.max(0, dist - 0.05);
    const prevPt = turf.along(arc, prevDist, { units: "kilometers" });
    const bearing = turf.bearing(prevPt, pt);
    frames.push({ coords, bearing });
  }

  return { frames, arcCoords: frames.map((f) => f.coords) };
}

function calcSegmentDuration(distKm: number, speed: number): number {
  const raw = BASE_SEGMENT_DURATION + Math.log10(distKm / 100 + 1) * 2000;
  return Math.min(Math.max(raw, MIN_DURATION), MAX_DURATION) / speed;
}

function calcMidZoom(distKm: number, baseZoom: number): number {
  if (distKm < 200)  return baseZoom - 0.5;
  if (distKm < 800)  return baseZoom - 1.5;
  if (distKm < 2000) return baseZoom - 2.5;
  if (distKm < 5000) return baseZoom - 3.0;
  return baseZoom - 3.5;
}

function pitchCurve(t: number, distKm: number): number {
  const maxFlat = 1000;
  if (distKm < maxFlat) return 50;
  if (t < 0.3) return 50 - 50 * (t / 0.3);
  if (t < 0.7) return 0;
  return (t - 0.7) / 0.3 * 50;
}

function bearingCurve(t: number, distKm: number, frameBearing: number, startBearing: number): number {
  if (distKm < 1000) return frameBearing;
  if (t < 0.25) return lerpAngle(frameBearing, startBearing, t / 0.25);
  if (t < 0.75) return startBearing;
  return lerpAngle(startBearing, frameBearing, (t - 0.75) / 0.25);
}

function zoomCurve(t: number, startZoom: number, endZoom: number, distKm: number): number {
  const midZoom = calcMidZoom(distKm, Math.min(startZoom, endZoom));
  if (t < 0.5) {
    return startZoom + (midZoom - startZoom) * easeInOutCubic(t * 2);
  }
  return midZoom + (endZoom - midZoom) * easeInOutCubic((t - 0.5) * 2);
}

export function MapPlayback({ encounters }: { encounters: PlaybackEncounter[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const markerElRef = useRef<HTMLDivElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const animFrameRef = useRef<number>(0);
  const animStartRef = useRef<number>(0);
  const phaseRef = useRef<"travel" | "linger" | null>(null);
  const prevBearingRef = useRef<number>(0);
  const startBearingRef = useRef<number>(0);

  const { currentIndex, isPlaying, playbackSpeed, zoomLevel, setCurrentIndex, setIsPlaying } = useMapStore();

  function cancelAnim() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    animStartRef.current = 0;
    phaseRef.current = null;
  }

  function setHistoryPoints(upToIndex: number) {
    const source = mapRef.current?.getSource("history-points") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: encounters.slice(0, upToIndex).map((e) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [e.longitude, e.latitude] },
        properties: { id: e.id },
      })),
    });
  }

  function setSource(sourceId: string, data: GeoJSON.GeoJSON) {
    const source = mapRef.current?.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(data);
  }

  function startSegment(fromIdx: number, toIdx: number) {
    if (!mapRef.current || toIdx >= encounters.length) return;
    cancelAnim();

    const from: [number, number] = [encounters[fromIdx].longitude, encounters[fromIdx].latitude];
    const to: [number, number] = [encounters[toIdx].longitude, encounters[toIdx].latitude];
    const distKm = turf.distance(turf.point(from), turf.point(to), { units: "kilometers" });

    if (distKm < SAME_LOCATION_KM) {
      cancelAnim();
      markerRef.current?.setLngLat(to);
      setSource("arc-current", emptyLine);
      const targetZoom = ZOOM_MAP[zoomLevel];
      phaseRef.current = "linger";
      animStartRef.current = 0;

      function sameLocationLinger(time: number) {
        if (!mapRef.current) { animFrameRef.current = 0; return; }
        if (!animStartRef.current) animStartRef.current = time;

        const elapsed = time - animStartRef.current;
        const progress = Math.min(elapsed / LINGER_MS, 1);

        mapRef.current.easeTo({
          center: to,
          zoom: lingerZoomCurve(easeInOutCubic(progress), targetZoom),
          bearing: mapRef.current.getBearing(),
          pitch: 50,
          duration: 60,
          easing: (t) => t,
        });

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(sameLocationLinger);
        } else {
          animFrameRef.current = 0;
          phaseRef.current = null;
          setCurrentIndex(toIdx);
        }
      }

      animFrameRef.current = requestAnimationFrame(sameLocationLinger);
      return;
    }

    if (distKm < SNAP_DISTANCE_KM) {
      cancelAnim();
      markerRef.current?.setLngLat(to);
      mapRef.current.jumpTo({ center: to, zoom: ZOOM_MAP[zoomLevel], pitch: 50 });
      setSource("arc-current", emptyLine);
      const completedCoords: [number, number][] = encounters.slice(0, fromIdx + 1).map((e) => [e.longitude, e.latitude]);
      setSource("arc-completed", makeLine(completedCoords));
      setCurrentIndex(toIdx);
      if (toIdx >= encounters.length - 1) {
        setIsPlaying(false);
      }
      return;
    }

    const { frames, arcCoords } = buildArcFrames(from, to, TRAVEL_FRAMES);
    const completedCoords: [number, number][] = encounters.slice(0, fromIdx + 1).map((e) => [e.longitude, e.latitude]);

    const startZoom = mapRef.current.getZoom();
    const endZoom = ZOOM_MAP[zoomLevel];
    const duration = calcSegmentDuration(distKm, playbackSpeed);
    const totalFrames = TRAVEL_FRAMES;

    prevBearingRef.current = frames[0].bearing;
    startBearingRef.current = frames[0].bearing;
    animStartRef.current = 0;
    phaseRef.current = "travel";

    setSource("arc-completed", makeLine(completedCoords));

    function travelFrame(time: number) {
      if (!mapRef.current) { animFrameRef.current = 0; return; }
      if (!animStartRef.current) animStartRef.current = time;

      const elapsed = time - animStartRef.current;
      const rawProgress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(rawProgress);
      const idx = Math.min(Math.round(eased * totalFrames), totalFrames);
      const f = frames[idx];

      markerRef.current?.setLngLat(f.coords);

      const smoothBearing = lerpAngle(prevBearingRef.current, f.bearing, 0.3);
      if (markerElRef.current) {
        markerElRef.current.style.transform = `rotate(${smoothBearing}deg)`;
      }
      prevBearingRef.current = smoothBearing;

      const drawn = arcCoords.slice(0, idx + 1);
      setSource("arc-current", makeLine(drawn));

      const lookAheadIdx = Math.min(idx + Math.floor(totalFrames * LOOK_AHEAD_FACTOR), totalFrames);
      const camTarget = frames[lookAheadIdx].coords;
      const zoom = zoomCurve(eased, startZoom, endZoom, distKm);
      const pitch = pitchCurve(eased, distKm);
      const cameraBearing = bearingCurve(eased, distKm, smoothBearing, startBearingRef.current);

      if (distKm < 1000) {
        mapRef.current.easeTo({
          center: camTarget,
          zoom,
          pitch,
          bearing: cameraBearing,
          duration: 60,
          easing: (t) => t,
        });
      } else {
        mapRef.current.jumpTo({
          center: camTarget,
          zoom,
          pitch,
          bearing: cameraBearing,
        });
      }

      if (rawProgress < 1) {
        animFrameRef.current = requestAnimationFrame(travelFrame);
      } else {
        phaseRef.current = "linger";
        animStartRef.current = 0;
        setSource("arc-current", makeLine(arcCoords));
        animFrameRef.current = requestAnimationFrame(lingerFrame);
      }
    }

    function lingerFrame(time: number) {
      if (!mapRef.current) { animFrameRef.current = 0; return; }
      if (!animStartRef.current) animStartRef.current = time;

      const elapsed = time - animStartRef.current;
      const progress = Math.min(elapsed / LINGER_MS, 1);
      const eased = easeInOutCubic(progress);
      const lastFrame = frames[totalFrames];
      const baseZoom = ZOOM_MAP[zoomLevel];

      markerRef.current?.setLngLat(lastFrame.coords);

      mapRef.current.easeTo({
        center: lastFrame.coords,
        zoom: lingerZoomCurve(eased, baseZoom),
        bearing: lastFrame.bearing,
        pitch: 50,
        duration: 60,
        easing: (t) => t,
      });

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(lingerFrame);
      } else {
        animFrameRef.current = 0;
        phaseRef.current = null;
        const allCoords: [number, number][] = encounters.slice(0, toIdx + 1).map((e) => [e.longitude, e.latitude]);
        setSource("arc-completed", makeLine(allCoords));
        setSource("arc-current", emptyLine);
        setCurrentIndex(toIdx);
        if (toIdx >= encounters.length - 1) {
          setIsPlaying(false);
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(travelFrame);
  }

  const emptyLine: GeoJSON.Feature<GeoJSON.LineString> = {
    type: "Feature",
    geometry: { type: "LineString", coordinates: [] },
    properties: {},
  };

  function makeLine(coords: [number, number][]): GeoJSON.Feature<GeoJSON.LineString> {
    return { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} };
  }

  function setCompletedArc(coords: [number, number][]) {
    setSource("arc-completed", makeLine(coords));
  }

  function setCurrentArc(coords: [number, number][]) {
    setSource("arc-current", coords.length > 0 ? makeLine(coords) : emptyLine);
  }

  // ---- Map initialization ----
  useEffect(() => {
    if (mapRef.current || !containerRef.current || !encounters.length) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [encounters[0].longitude, encounters[0].latitude],
      zoom: 4,
      pitch: 45,
    });

    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    map.on("load", () => {
      map.addSource("history-points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "history-points-layer",
        type: "circle",
        source: "history-points",
        paint: {
          "circle-radius": 6,
          "circle-color": "#94a3b8",
          "circle-opacity": 0.6,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#1e293b",
        },
      });

      map.addSource("arc-completed", {
        type: "geojson",
        data: emptyLine,
      });
      map.addLayer({
        id: "arc-completed-layer",
        type: "line",
        source: "arc-completed",
        paint: {
          "line-color": "#f43f5e",
          "line-width": 2.5,
          "line-opacity": 0.35,
        },
      });
      map.addLayer({
        id: "arc-completed-glow",
        type: "line",
        source: "arc-completed",
        paint: {
          "line-width": 10,
          "line-opacity": 0.1,
          "line-color": "#f43f5e",
          "line-blur": 4,
        },
      });

      map.addSource("arc-current", {
        type: "geojson",
        data: emptyLine,
        lineMetrics: true,
      });
      map.addLayer({
        id: "arc-current-layer",
        type: "line",
        source: "arc-current",
        paint: {
          "line-width": 2.5,
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0,
            "rgba(244, 63, 94, 0.05)",
            0.4,
            "rgba(244, 63, 94, 0.35)",
            0.75,
            "rgba(244, 63, 94, 0.7)",
            1,
            "#f43f5e",
          ],
        },
      });
      map.addLayer({
        id: "arc-current-glow",
        type: "line",
        source: "arc-current",
        paint: {
          "line-width": 10,
          "line-opacity": 0.12,
          "line-color": "#f43f5e",
          "line-blur": 4,
        },
      });

      map.on("click", "arc-current-layer", (e) => {
        if (e.lngLat) map.flyTo({ center: e.lngLat, zoom: 12 });
      });

      mapRef.current = map;
      setMapLoaded(true);
    });

    map.on("dragstart", () => setIsPlaying(false));

    return () => {
      cancelAnim();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      markerElRef.current = null;
      setMapLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounters]);

  // ---- Main state effect ----
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !encounters[currentIndex]) return;

    cancelAnim();

    setHistoryPoints(currentIndex);

    if (currentIndex > 0) {
      setCompletedArc(encounters.slice(0, currentIndex + 1).map((e) => [e.longitude, e.latitude]));
      setCurrentArc([]);
    } else {
      setCompletedArc([]);
      setCurrentArc([]);
    }

    if (!markerRef.current) {
      const el = document.createElement("div");
      el.className = "playback-current-marker";
      const dot = document.createElement("div");
      dot.className = "playback-current-marker-dot";
      el.appendChild(dot);
      markerElRef.current = el;
      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([encounters[currentIndex].longitude, encounters[currentIndex].latitude])
        .addTo(mapRef.current);
    } else {
      markerRef.current.setLngLat([encounters[currentIndex].longitude, encounters[currentIndex].latitude]);
      if (markerElRef.current) markerElRef.current.style.transform = "";
    }

    if (isPlaying && currentIndex < encounters.length - 1) {
      startSegment(currentIndex, currentIndex + 1);
    } else {
      mapRef.current.flyTo({
        center: [encounters[currentIndex].longitude, encounters[currentIndex].latitude],
        zoom: ZOOM_MAP[zoomLevel],
        speed: 0.8,
        curve: 1.2,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isPlaying, mapLoaded]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}
