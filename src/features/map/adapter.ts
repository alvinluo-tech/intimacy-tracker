import L from "leaflet";

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

export function createLeafletMapAdapter(map: L.Map): MapAdapter {
  const heatLayer = L.layerGroup().addTo(map);
  const exactLayer = L.layerGroup().addTo(map);

  const markerIconExact = L.divIcon({
    className: "",
    html: '<span class="map-point-dot map-point-dot-exact"></span>',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });

  const markerIconBlur = L.divIcon({
    className: "",
    html: '<span class="map-point-dot map-point-dot-blur"></span>',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });

  const clear = () => {
    heatLayer.clearLayers();
    exactLayer.clearLayers();
  };

  const renderHeatmap = (points: MapPoint[]) => {
    clear();
    for (const p of aggregateHeatPoints(points)) {
      const radius = Math.min(46, 14 + p.weight * 3.5);
      const circle = L.circleMarker([p.lat, p.lng], {
        radius,
        stroke: false,
        fillOpacity: 0.18,
        fillColor: "#8b5cf6",
      });
      heatLayer.addLayer(circle);

      const core = L.circleMarker([p.lat, p.lng], {
        radius: Math.max(6, radius / 3.5),
        stroke: false,
        fillOpacity: 0.35,
        fillColor: "#f472b6",
      });
      heatLayer.addLayer(core);
    }
  };

  const renderExact = (points: MapPoint[]) => {
    clear();
    for (const p of points) {
      const icon = p.precision === "exact" ? markerIconExact : markerIconBlur;
      const marker = L.marker([p.lat, p.lng], { icon });
      const place = [p.locationLabel, p.city, p.country].filter(Boolean).join(" · ");
      const time = new Date(p.startedAt).toLocaleString("zh-CN", { hour12: false });
      const precisionText =
        p.precision === "exact" ? "精确位置" : p.precision === "city" ? "城市级位置" : "模糊位置";
      marker.bindPopup(
        `<div style="font-size:12px;color:#d0d6e0">${place || "Location"}<br/>${time}<br/>${precisionText}</div>`
      );
      exactLayer.addLayer(marker);
    }
  };

  const fitBounds = (points: MapPoint[]) => {
    if (!points.length) return;
    const group = L.featureGroup(points.map((p) => L.marker([p.lat, p.lng])));
    map.fitBounds(group.getBounds(), { padding: [24, 24], maxZoom: 12 });
  };

  return { renderHeatmap, renderExact, clear, fitBounds };
}
