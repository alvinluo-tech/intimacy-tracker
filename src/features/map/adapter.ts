import L from "leaflet";

import type { MapPoint } from "@/features/map/types";

export interface MapAdapter {
  renderPoints(points: MapPoint[]): void;
  clear(): void;
  fitBounds(): void;
}

type ClusterGroup = L.LayerGroup & {
  addLayer(layer: L.Layer): ClusterGroup;
  clearLayers(): ClusterGroup;
  getLayers(): L.Layer[];
};

export function createLeafletMapAdapter(map: L.Map): MapAdapter {
  const cluster = ((L as unknown as { markerClusterGroup?: () => ClusterGroup })
    .markerClusterGroup?.() ?? L.layerGroup()) as ClusterGroup;
  cluster.addTo(map);

  const markerIcon = L.divIcon({
    className: "",
    html: '<span class="map-point-dot"></span>',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });

  const clear = () => {
    cluster.clearLayers();
  };

  const renderPoints = (points: MapPoint[]) => {
    clear();
    for (const p of points) {
      const marker = L.marker([p.lat, p.lng], { icon: markerIcon });
      const place = [p.locationLabel, p.city, p.country].filter(Boolean).join(" · ");
      const time = new Date(p.startedAt).toLocaleString("zh-CN", { hour12: false });
      marker.bindPopup(
        `<div style="font-size:12px;color:#d0d6e0">${place || "Location"}<br/>${time}</div>`
      );
      cluster.addLayer(marker);
    }
  };

  const fitBounds = () => {
    const markers = cluster.getLayers();
    if (!markers.length) return;
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds(), { padding: [24, 24], maxZoom: 12 });
  };

  return { renderPoints, clear, fitBounds };
}
