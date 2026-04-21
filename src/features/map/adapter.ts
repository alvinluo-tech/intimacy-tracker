import mapboxgl from "mapbox-gl";

import type { MapPoint } from "@/features/map/types";

export interface MapAdapter {
  renderHeatmap(points: MapPoint[]): void;
  renderExact(points: MapPoint[]): void;
  clear(): void;
  fitBounds(points: MapPoint[]): void;
}

type WeightedPoint = {
  lat: number;
  lng: number;
  weight: number;
};

function aggregateHeatPoints(points: MapPoint[]) {
  const byKey = new Map<
    string,
    { latSum: number; lngSum: number; count: number; city: string | null; country: string | null }
  >();

  for (const p of points) {
    const key =
      p.city && p.country
        ? `${p.city}::${p.country}`
        : `${p.lat.toFixed(2)}::${p.lng.toFixed(2)}`;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, {
        latSum: p.lat,
        lngSum: p.lng,
        count: 1,
        city: p.city,
        country: p.country,
      });
      continue;
    }
    current.latSum += p.lat;
    current.lngSum += p.lng;
    current.count += 1;
  }

  const rows: WeightedPoint[] = [];
  for (const item of byKey.values()) {
    rows.push({
      lat: item.latSum / item.count,
      lng: item.lngSum / item.count,
      weight: item.count,
    });
  }

  return rows;
}

export function createMapboxAdapter(map: mapboxgl.Map): MapAdapter {
  const markers: mapboxgl.Marker[] = [];
  const popups: mapboxgl.Popup[] = [];

  const clear = () => {
    for (const marker of markers) {
      marker.remove();
    }
    markers.length = 0;
    
    for (const popup of popups) {
      popup.remove();
    }
    popups.length = 0;
  };

  const renderHeatmap = (points: MapPoint[]) => {
    clear();
    for (const p of aggregateHeatPoints(points)) {
      const radius = Math.min(46, 14 + p.weight * 3.5);
      
      const el = document.createElement("div");
      el.style.width = `${radius * 2}px`;
      el.style.height = `${radius * 2}px`;
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#8b5cf6";
      el.style.opacity = "0.18";
      el.style.pointerEvents = "none";
      el.style.position = "relative";
      
      const coreRadius = Math.max(6, radius / 3.5);
      const core = document.createElement("div");
      core.style.width = `${coreRadius * 2}px`;
      core.style.height = `${coreRadius * 2}px`;
      core.style.borderRadius = "50%";
      core.style.backgroundColor = "#f472b6";
      core.style.opacity = "0.35";
      core.style.position = "absolute";
      core.style.top = "50%";
      core.style.left = "50%";
      core.style.transform = "translate(-50%, -50%)";
      
      el.appendChild(core);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      markers.push(marker);
    }
  };

  const renderExact = (points: MapPoint[]) => {
    clear();
    const grouped = new Map<string, MapPoint[]>();
    for (const p of points) {
      const key = `${p.lat.toFixed(6)}::${p.lng.toFixed(6)}`;
      const arr = grouped.get(key);
      if (!arr) {
        grouped.set(key, [p]);
      } else {
        arr.push(p);
      }
    }

    for (const arr of grouped.values()) {
      const count = arr.length;
      const radius = count > 1 ? 0.00022 : 0;
      for (let i = 0; i < count; i++) {
        const p = arr[i];
        const angle = count > 1 ? (2 * Math.PI * i) / count : 0;
        const lat = p.lat + Math.sin(angle) * radius;
        const lng = p.lng + Math.cos(angle) * radius;
        
        const el = document.createElement("div");
        el.className = "map-point-dot " + (p.precision === "exact" ? "map-point-dot-exact" : "map-point-dot-blur");
        
        const place = [p.locationLabel, p.city, p.country].filter(Boolean).join(" · ");
        const time = new Date(p.startedAt).toLocaleString("zh-CN", { hour12: false });
        const precisionText = p.precision === "exact" ? "精确位置" : p.precision === "city" ? "城市级位置" : "模糊位置";
        
        const popup = new mapboxgl.Popup({ offset: 10, closeButton: false, className: "custom-mapbox-popup" })
          .setHTML(`<div style="font-size:12px;color:#d0d6e0;font-family:inherit;">${place || "Location"}<br/>${time}<br/>${precisionText}</div>`);
        popups.push(popup);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);
        markers.push(marker);
      }
    }
  };

  const fitBounds = (points: MapPoint[]) => {
    if (!points.length) return;
    
    const bounds = new mapboxgl.LngLatBounds();
    for (const p of points) {
      bounds.extend([p.lng, p.lat]);
    }
    
    map.fitBounds(bounds, { padding: 50, maxZoom: 12, duration: 800 });
  };

  return { renderHeatmap, renderExact, clear, fitBounds };
}
