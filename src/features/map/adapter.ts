import mapboxgl from "mapbox-gl";

import type { MapPoint } from "@/features/map/types";
import { formatDateInTimezone } from "@/lib/utils/formatDateInTimezone";

export interface MapAdapter {
  renderHeatmap(points: MapPoint[]): void;
  renderExact(points: MapPoint[]): void;
  clear(): void;
  fitBounds(points: MapPoint[]): void;
}

export function createMapboxAdapter(map: mapboxgl.Map, t: (key: string) => string, locale: string = "en"): MapAdapter {
  const markers: mapboxgl.Marker[] = [];
  const popups: mapboxgl.Popup[] = [];
  const HEATMAP_SOURCE_ID = 'heatmap-source';
  const HEATMAP_LAYER_ID = 'heatmap-layer';

  const clear = () => {
    for (const marker of markers) {
      marker.remove();
    }
    markers.length = 0;
    
    for (const popup of popups) {
      popup.remove();
    }
    popups.length = 0;

    if (map.getSource(HEATMAP_SOURCE_ID)) {
      (map.getSource(HEATMAP_SOURCE_ID) as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: []
      });
    }
  };

  const renderHeatmap = (points: MapPoint[]) => {
    clear();

    const geojson = {
      type: 'FeatureCollection',
      features: points.map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { weight: 1 }
      }))
    };

    if (map.getSource(HEATMAP_SOURCE_ID)) {
      (map.getSource(HEATMAP_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(geojson as any);
    } else {
      map.addSource(HEATMAP_SOURCE_ID, {
        type: 'geojson',
        data: geojson as any
      });
      map.addLayer({
        id: HEATMAP_LAYER_ID,
        type: 'heatmap',
        source: HEATMAP_SOURCE_ID,
        maxzoom: 15,
        paint: {
          // Increase the heatmap weight based on frequency
          'heatmap-weight': 1,
          // Increase the heatmap intensity by zoom level
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            12, 3
          ],
          // Color ramp from transparent purple to solid pink (matching previous UI)
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(139, 92, 246, 0)',
            0.2, 'rgba(139, 92, 246, 0.2)',
            0.5, 'rgba(139, 92, 246, 0.6)',
            0.8, 'rgba(244, 114, 182, 0.8)',
            1, 'rgba(244, 114, 182, 1)'
          ],
          // Adjust the heatmap radius by zoom level
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 8,
            4, 15,
            12, 35
          ],
          // Transition from heatmap to circle layer by zoom level
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 1,
            13, 0
          ]
        }
      });
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
        // Ensure proper width/height on Mapbox markers to show background colors
        el.style.width = "10px";
        el.style.height = "10px";
        el.className = "map-point-dot " + (p.precision === "exact" ? "map-point-dot-exact" : "map-point-dot-blur");
        
        const place = [p.locationLabel, p.city, p.country].filter(Boolean).join(" · ");
        const tz = p.timezone || "UTC";
        const time = formatDateInTimezone(p.startedAt, "MMM d, yyyy", tz, locale) + " " + formatDateInTimezone(p.startedAt, "h:mm a", tz, locale);
        const precisionText = p.precision === "exact" ? t("exactLocation") : p.precision === "city" ? t("cityLevel") : t("approximate");
        
        const popup = new mapboxgl.Popup({ offset: 10, closeButton: false, className: "custom-mapbox-popup" })
          .setHTML(`<div style="font-size:12px;color:#d0d6e0;font-family:inherit;padding:4px 2px;text-align:center;">${place || "Location"}<br/><span style="color:#8a8f98">${time}</span><br/><span style="color:#5e6ad2">${precisionText}</span></div>`);
        popups.push(popup);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
        markers.push(marker);

        // Hover logic for desktop, click logic for mobile
        let isHovered = false;

        el.addEventListener("mouseenter", () => {
          if (window.matchMedia("(hover: hover)").matches) {
            isHovered = true;
            popup.setLngLat([lng, lat]).addTo(map);
          }
        });

        el.addEventListener("mouseleave", () => {
          if (window.matchMedia("(hover: hover)").matches) {
            isHovered = false;
            setTimeout(() => {
              if (!isHovered) popup.remove();
            }, 100);
          }
        });

        popup.getElement()?.addEventListener("mouseenter", () => {
          isHovered = true;
        });

        popup.getElement()?.addEventListener("mouseleave", () => {
          isHovered = false;
          popup.remove();
        });

        el.addEventListener("click", () => {
          if (!window.matchMedia("(hover: hover)").matches) {
            if (popup.isOpen()) {
              popup.remove();
            } else {
              popup.setLngLat([lng, lat]).addTo(map);
            }
          }
        });
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
