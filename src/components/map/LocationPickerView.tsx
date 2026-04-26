"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, MapPin, Search } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  readQuickLogLocationDraft,
  setQuickLogReopenFlag,
  writeQuickLogLocationDraft,
  type QuickLogLocationDraft,
} from "@/lib/utils/quicklog-location-draft";

type PlaceSuggestion = {
  id: string;
  label: string;
  lat: number | null;
  lng: number | null;
  city: string | null;
  country: string | null;
  source: "mapbox" | "amap" | "nominatim";
  resultKind: "mapbox-suggest" | "amap-poi" | "amap-tip" | "nominatim";
  mapboxId?: string;
  mapboxSessionToken?: string;
};

function hasChineseChars(value: string) {
  return /[\u3400-\u9FFF]/.test(value);
}

function normalizeCountry(value: string | null | undefined) {
  if (!value) return null;
  const tokens = value
    .split(/[,/|;，、]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!tokens.length) return null;
  return tokens[0];
}

function cleanLocationLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  const parts = label.split(/[,/|;，、]+/);
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const normalized = trimmed.replace(/\s+/g, "").toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      cleaned.push(trimmed);
    }
  }
  return cleaned.join(", ");
}

function dedupeSuggestions(rows: PlaceSuggestion[]): PlaceSuggestion[] {
  const seen = new Set<string>();
  const result: PlaceSuggestion[] = [];

  for (const row of rows) {
    const key =
      typeof row.lat === "number" && typeof row.lng === "number"
        ? `${row.lat.toFixed(6)}:${row.lng.toFixed(6)}:${row.label.toLowerCase()}`
        : `${row.source}:${row.mapboxId ?? row.id}:${row.label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }

  return result;
}

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

function createMapboxSessionToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function scoreSuggestion(s: PlaceSuggestion, query: string): number {
  const q = query.trim().toLowerCase();
  let score = 0;

  if (typeof s.lat === "number" && typeof s.lng === "number") score += 2;
  if (q && s.label.toLowerCase().includes(q)) score += 3;

  if (s.resultKind === "amap-poi") score += 3;
  if (s.resultKind === "mapbox-suggest") score += 2;
  if (s.resultKind === "amap-tip") score += 1;

  return score;
}

function isLikelyChinaCoordinate(lat: number, lng: number) {
  return lat > 18 && lat < 54 && lng > 73 && lng < 136;
}

async function searchPlacesWithMapboxSearchBox(
  query: string,
  token: string,
  sessionToken: string
): Promise<PlaceSuggestion[]> {
  try {
    const url = new URL("https://api.mapbox.com/search/searchbox/v1/suggest");
    url.searchParams.set("q", query);
    url.searchParams.set("access_token", token);
    url.searchParams.set("session_token", sessionToken);
    url.searchParams.set("limit", "8");
    url.searchParams.set("language", "zh,en");
    url.searchParams.set("types", "poi,address,place,locality,neighborhood");

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      suggestions?: Array<{
        mapbox_id?: string;
        name?: string;
        full_address?: string;
        place_formatted?: string;
        context?: {
          place?: { name?: string };
          country?: { name?: string; country_code?: string };
        };
      }>;
    };

    return (data.suggestions ?? [])
      .map((item, index) => {
        if (!item.mapbox_id) return null;
        const city = cleanLocationLabel(item.context?.place?.name ?? null);
        const country = normalizeCountry(item.context?.country?.name ?? item.context?.country?.country_code ?? null);
        const label =
          cleanLocationLabel([item.name, item.place_formatted, item.full_address].filter(Boolean).join(", ")) ??
          item.full_address ??
          item.name ??
          query;

        return {
          id: `mapbox-${index}-${item.mapbox_id}`,
          label,
          lat: null,
          lng: null,
          city,
          country,
          source: "mapbox" as const,
          resultKind: "mapbox-suggest" as const,
          mapboxId: item.mapbox_id,
          mapboxSessionToken: sessionToken,
        };
      })
      .filter(isNotNull);
  } catch {
    return [];
  }
}

async function retrievePlaceFromMapboxSearchBox(
  mapboxId: string,
  token: string,
  sessionToken: string
): Promise<{ lat: number; lng: number; label: string | null; city: string | null; country: string | null } | null> {
  try {
    const url = new URL(`https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(mapboxId)}`);
    url.searchParams.set("access_token", token);
    url.searchParams.set("session_token", sessionToken);
    url.searchParams.set("language", "zh,en");

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: {
          name?: string;
          full_address?: string;
          place_formatted?: string;
          context?: {
            place?: { name?: string };
            country?: { name?: string; country_code?: string };
          };
        };
      }>;
    };

    const feature = data.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return null;

    const props = feature?.properties;
    return {
      lng: Number(coords[0]),
      lat: Number(coords[1]),
      label:
        cleanLocationLabel([props?.name, props?.place_formatted, props?.full_address].filter(Boolean).join(", ")) ??
        props?.full_address ??
        props?.name ??
        null,
      city: cleanLocationLabel(props?.context?.place?.name ?? null),
      country: normalizeCountry(props?.context?.country?.name ?? props?.context?.country?.country_code ?? null),
    };
  } catch {
    return null;
  }
}

async function searchPlacesWithAmap(
  query: string,
  key: string,
  options?: { region?: string; location?: { lng: number; lat: number } }
): Promise<PlaceSuggestion[]> {
  try {
    const region = cleanLocationLabel(options?.region ?? null) ?? "全国";
    const location =
      options?.location && Number.isFinite(options.location.lng) && Number.isFinite(options.location.lat)
        ? `${options.location.lng},${options.location.lat}`
        : "116.397428,39.90923";

    const tipsUrl = new URL("https://restapi.amap.com/v5/assistant/inputtips");
    tipsUrl.searchParams.set("key", key);
    tipsUrl.searchParams.set("keywords", query);
    tipsUrl.searchParams.set("page_size", "8");
    tipsUrl.searchParams.set("offset", "8");
    tipsUrl.searchParams.set("region", region);
    tipsUrl.searchParams.set("city_limit", "false");
    tipsUrl.searchParams.set("citylimit", "false");
    tipsUrl.searchParams.set("location", location);
    tipsUrl.searchParams.set("sortrule", "distance");

    const poiUrl = new URL("https://restapi.amap.com/v5/place/text");
    poiUrl.searchParams.set("key", key);
    poiUrl.searchParams.set("keywords", query);
    poiUrl.searchParams.set("page_size", "8");
    poiUrl.searchParams.set("offset", "8");
    poiUrl.searchParams.set("page_num", "1");
    poiUrl.searchParams.set("page", "1");
    poiUrl.searchParams.set("region", region);
    poiUrl.searchParams.set("city_limit", "false");
    poiUrl.searchParams.set("citylimit", "false");
    poiUrl.searchParams.set("location", location);
    poiUrl.searchParams.set("sortrule", "distance");
    poiUrl.searchParams.set("show_fields", "business,indoor,navi");

    const [tipsRes, poiRes] = await Promise.all([
      fetch(tipsUrl.toString(), { cache: "no-store" }),
      fetch(poiUrl.toString(), { cache: "no-store" }),
    ]);

    const tipsData = tipsRes.ok
      ? ((await tipsRes.json()) as {
          status?: string | number;
          tips?: Array<{
            id?: string;
            name?: string;
            district?: string;
            address?: string;
            cityname?: string;
            adname?: string;
            location?: string;
          }>;
        })
      : null;

    const tipResults =
      tipsData?.status === "1" || tipsData?.status === 1
        ? (tipsData.tips ?? [])
            .map((tip, index) => {
              if (!tip.location || !tip.location.includes(",")) return null;
              const [lngRaw, latRaw] = tip.location.split(",");
              const lng = Number(lngRaw);
              const lat = Number(latRaw);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

              const city = cleanLocationLabel(tip.cityname ?? tip.district ?? tip.adname ?? null);
              const label = cleanLocationLabel([tip.name, tip.adname, tip.cityname, tip.district, tip.address].filter(Boolean).join(", "));

              return {
                id: tip.id || `amap-tip-${index}-${lng}-${lat}`,
                label: label ?? tip.name ?? query,
                lat,
                lng,
                city,
                country: "China",
                source: "amap" as const,
                resultKind: "amap-tip" as const,
              };
            })
            .filter(isNotNull)
            // Keep inputtips as weak supplement; avoid crowding out place results.
            .slice(0, 3)
        : [];

    const poiData = poiRes.ok
      ? ((await poiRes.json()) as {
          status?: string | number;
          pois?: Array<{
            id?: string;
            name?: string;
            address?: string;
            pname?: string;
            cityname?: string;
            adname?: string;
            city?: string | string[];
            location?: string;
            ad_info?: { city?: string; adname?: string; province?: string };
          }>;
        })
      : null;

    const poiResults =
      poiData?.status === "1" || poiData?.status === 1
        ? (poiData.pois ?? [])
            .map((poi, index) => {
              if (!poi.location || !poi.location.includes(",")) return null;
              const [lngRaw, latRaw] = poi.location.split(",");
              const lng = Number(lngRaw);
              const lat = Number(latRaw);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

              const cityFromArray = Array.isArray(poi.city) ? poi.city[0] : poi.city;
              const city = cleanLocationLabel(poi.cityname ?? cityFromArray ?? poi.ad_info?.city ?? poi.adname ?? poi.ad_info?.adname ?? null);
              const label = cleanLocationLabel(
                [poi.name, poi.adname, poi.ad_info?.adname, poi.cityname, cityFromArray, poi.pname, poi.ad_info?.province, poi.address]
                  .filter(Boolean)
                  .join(", ")
              );

              return {
                id: poi.id || `amap-poi-${index}-${lng}-${lat}`,
                label: label ?? poi.name ?? query,
                lat,
                lng,
                city,
                country: "China",
                source: "amap" as const,
                resultKind: "amap-poi" as const,
              };
            })
            .filter(isNotNull)
        : [];

    const ranked = [...poiResults, ...tipResults].sort((a, b) => scoreSuggestion(b, query) - scoreSuggestion(a, query));
    return dedupeSuggestions(ranked).slice(0, 8);
  } catch {
    return [];
  }
}

async function searchPlacesWithNominatim(query: string): Promise<PlaceSuggestion[]> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "6");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "zh-CN");

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "accept-language": "zh-CN,zh;q=0.9" },
    });
    if (!res.ok) return [];

    const rows = (await res.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      address?: { city?: string; town?: string; village?: string; country?: string };
    }>;

    return rows
      .map((row) => ({
        id: String(row.place_id),
        label: cleanLocationLabel(row.display_name) ?? row.display_name,
        lat: Number(row.lat),
        lng: Number(row.lon),
        city: cleanLocationLabel(row.address?.city ?? row.address?.town ?? row.address?.village) ?? null,
        country: normalizeCountry(row.address?.country ?? null),
        source: "nominatim" as const,
        resultKind: "nominatim" as const,
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  } catch {
    return [];
  }
}

async function searchPlaces(
  query: string,
  options: {
    mapboxToken?: string;
    amapKey?: string;
    mapboxSessionToken?: string;
    amapRegion?: string;
    amapLocation?: { lng: number; lat: number };
  }
): Promise<PlaceSuggestion[]> {
  const providers: Promise<PlaceSuggestion[]>[] = [];

  if (options.mapboxToken && options.mapboxSessionToken) {
    providers.push(searchPlacesWithMapboxSearchBox(query, options.mapboxToken, options.mapboxSessionToken));
  }

  if (options.amapKey) {
    providers.push(
      searchPlacesWithAmap(query, options.amapKey, {
        region: options.amapRegion,
        location: options.amapLocation,
      })
    );
  }

  providers.push(searchPlacesWithNominatim(query));

  const settled = await Promise.allSettled(providers);
  const merged: PlaceSuggestion[] = [];

  for (const item of settled) {
    if (item.status === "fulfilled" && item.value.length > 0) {
      merged.push(...item.value);
    }
  }

  const ranked = merged.sort((a, b) => scoreSuggestion(b, query) - scoreSuggestion(a, query));
  return dedupeSuggestions(ranked).slice(0, 10);
}

async function reverseGeocode(lat: number, lng: number, amapKey?: string) {
  if (amapKey && isLikelyChinaCoordinate(lat, lng)) {
    try {
      const url = new URL("https://restapi.amap.com/v5/geocode/regeo");
      url.searchParams.set("key", amapKey);
      url.searchParams.set("location", `${lng},${lat}`);

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (res.ok) {
        const row = (await res.json()) as {
          status?: string | number;
          regeocode?: {
            formatted_address?: string;
            addressComponent?: {
              city?: string | string[];
              province?: string;
            };
          };
        };

        if (row.status === "1" || row.status === 1) {
          const cityRaw = Array.isArray(row.regeocode?.addressComponent?.city)
            ? row.regeocode?.addressComponent?.city?.[0]
            : row.regeocode?.addressComponent?.city;

          return {
            label: cleanLocationLabel(row.regeocode?.formatted_address ?? null),
            city: cleanLocationLabel(cityRaw ?? row.regeocode?.addressComponent?.province ?? null),
            country: "China",
          };
        }
      }
    } catch {
      // Fall back to Nominatim below.
    }
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "zh-CN");

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "accept-language": "zh-CN,zh;q=0.9" },
    });
    if (!res.ok) return null;

    const row = (await res.json()) as {
      display_name?: string;
      address?: { city?: string; town?: string; village?: string; country?: string };
    };

    return {
      label: cleanLocationLabel(row.display_name) ?? null,
      city: cleanLocationLabel(row.address?.city ?? row.address?.town ?? row.address?.village) ?? null,
      country: normalizeCountry(row.address?.country ?? null),
    };
  } catch {
    return null;
  }
}

export function LocationPickerView() {
  const router = useRouter();
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<mapboxgl.Map | null>(null);
  const markerRef = React.useRef<mapboxgl.Marker | null>(null);

  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [resolvingSuggestionId, setResolvingSuggestionId] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<PlaceSuggestion[]>([]);
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const suppressAutoSearchRef = React.useRef(false);
  const [selected, setSelected] = React.useState<QuickLogLocationDraft>(() => {
    const draft = readQuickLogLocationDraft();
    return (
      draft ?? {
        latitude: null,
        longitude: null,
        locationLabel: null,
        city: null,
        country: null,
        locationPrecision: "exact",
        updatedAt: Date.now(),
      }
    );
  });

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY;
  const mapboxSessionTokenRef = React.useRef(createMapboxSessionToken());

  const renewMapboxSession = React.useCallback(() => {
    mapboxSessionTokenRef.current = createMapboxSessionToken();
  }, []);

  const setMarkerAt = React.useCallback((lng: number, lat: number) => {
    if (!mapRef.current) return;

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: "#f43f5e", scale: 0.9 })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
      markerRef.current.getElement().style.filter = "drop-shadow(0 4px 10px rgba(244,63,94,0.45))";
      return;
    }

    markerRef.current.setLngLat([lng, lat]);
  }, []);

  React.useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapToken) return;

    mapboxgl.accessToken = mapToken;

    const centerLng = typeof selected.longitude === "number" ? selected.longitude : -78.8986;
    const centerLat = typeof selected.latitude === "number" ? selected.latitude : 35.994;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [centerLng, centerLat],
      zoom: typeof selected.longitude === "number" ? 13 : 11,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      mapRef.current = map;
      setMapLoaded(true);
      if (typeof selected.longitude === "number" && typeof selected.latitude === "number") {
        setMarkerAt(selected.longitude, selected.latitude);
      }
    });

    map.on("click", async (e) => {
      const lng = Number(e.lngLat.lng.toFixed(6));
      const lat = Number(e.lngLat.lat.toFixed(6));
      setMarkerAt(lng, lat);

      setSelected((prev) => ({ ...prev, longitude: lng, latitude: lat }));

      const place = await reverseGeocode(lat, lng, amapKey);
      if (place) {
        setSelected((prev) => ({
          ...prev,
          longitude: lng,
          latitude: lat,
          locationLabel: place.label,
          city: place.city,
          country: place.country,
        }));
      }
    });

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [mapToken, amapKey, selected.latitude, selected.longitude, setMarkerAt]);

  React.useEffect(() => {
    const q = query.trim();
    if (suppressAutoSearchRef.current) {
      setSuggestions([]);
      return;
    }

    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const rows = await searchPlaces(q, {
          mapboxToken: mapToken,
          amapKey,
          mapboxSessionToken: mapboxSessionTokenRef.current,
          amapRegion: selected.city ?? undefined,
          amapLocation:
            typeof selected.longitude === "number" && typeof selected.latitude === "number"
              ? { lng: selected.longitude, lat: selected.latitude }
              : undefined,
        });
        if (!cancelled) setSuggestions(rows);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, mapToken, amapKey, selected.city, selected.longitude, selected.latitude]);

  const confirm = () => {
    writeQuickLogLocationDraft({ ...selected, updatedAt: Date.now() });
    setQuickLogReopenFlag();
    router.back();
  };

  return (
    <div className="min-h-[100svh] bg-[#020617] pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-5">
        <div className="mb-3 flex items-center gap-2.5 sm:mb-4 sm:gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-[#0f172a] text-slate-400 hover:bg-slate-800 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-[30px] font-light leading-none text-slate-200 sm:text-[32px]">Select Location</h1>
        </div>

        <div className="relative mb-3 sm:mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={(e) => {
              suppressAutoSearchRef.current = false;
              setQuery(e.target.value);
            }}
            placeholder="Search for a place..."
            className="h-10 rounded-xl border border-slate-800 bg-[#0f172a] pl-10 text-[16px] text-slate-200 placeholder:text-slate-600 sm:h-11"
          />

          {searching ? <div className="mt-3 text-[12px] text-slate-500">Searching...</div> : null}
          {suggestions.length > 0 ? (
            <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 max-h-[44svh] space-y-1 overflow-auto rounded-xl border border-slate-800 bg-[#0a183b]/95 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:max-h-[55vh]">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={resolvingSuggestionId !== null}
                  onClick={async () => {
                    let picked = s;

                    if (
                      picked.source === "mapbox" &&
                      (picked.lat === null || picked.lng === null) &&
                      mapToken &&
                      picked.mapboxId &&
                      picked.mapboxSessionToken
                    ) {
                      setResolvingSuggestionId(picked.id);
                      try {
                        const resolved = await retrievePlaceFromMapboxSearchBox(
                          picked.mapboxId,
                          mapToken,
                          picked.mapboxSessionToken
                        );
                        if (!resolved) {
                          toast.error("Unable to resolve this location");
                          return;
                        }
                        picked = {
                          ...picked,
                          lat: resolved.lat,
                          lng: resolved.lng,
                          label: resolved.label ?? picked.label,
                          city: resolved.city ?? picked.city,
                          country: resolved.country ?? picked.country,
                        };
                      } finally {
                        setResolvingSuggestionId(null);
                      }
                    }

                    if (typeof picked.lat !== "number" || typeof picked.lng !== "number") {
                      toast.error("This result has no coordinates yet");
                      return;
                    }

                    setSelected((prev) => ({
                      ...prev,
                      latitude: picked.lat,
                      longitude: picked.lng,
                      locationLabel: picked.label,
                      city: picked.city,
                      country: picked.country,
                    }));

                    if (mapRef.current) {
                      mapRef.current.flyTo({
                        center: [picked.lng, picked.lat],
                        zoom: 14,
                        speed: 1,
                      });
                      setMarkerAt(picked.lng, picked.lat);
                    }

                    setQuery(picked.label);
                    setSuggestions([]);
                    suppressAutoSearchRef.current = true;
                    renewMapboxSession();
                    toast.success("Location selected");
                  }}
                  className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <div className="truncate text-[17px] leading-6 text-slate-200">{s.city ?? s.label.split(",")[0]}</div>
                    <div className="truncate text-[13px] leading-5 text-slate-500">{s.label}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
          {!suppressAutoSearchRef.current && !searching && query.trim().length >= 2 && suggestions.length === 0 ? (
            <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 rounded-xl border border-slate-800 bg-[#0a183b]/95 p-3 text-[13px] text-slate-400 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm">
              No matching places found. Try adding city/country keywords.
            </div>
          ) : null}
        </div>

        <div className="mb-3 overflow-hidden rounded-2xl border border-slate-800 bg-[#0f172a] sm:mb-4 sm:rounded-xl">
          {mapToken ? (
            <div ref={mapContainerRef} className="h-[50svh] min-h-[320px] max-h-[560px] w-full sm:h-[360px]" />
          ) : (
            <div className="flex h-[50svh] min-h-[320px] max-h-[560px] items-center justify-center bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.18),transparent_30%),linear-gradient(180deg,#1f2937_0%,#111827_100%)] text-[13px] text-slate-500 sm:h-[360px]">
              Missing NEXT_PUBLIC_MAPBOX_TOKEN
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4 sm:rounded-xl">
          <p className="mb-3 text-[11px] uppercase tracking-wider text-slate-500">Precision</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["exact", "Exact", "Precise coordinates"],
              ["city", "City Only", "Approximate area"],
              ["off", "Hidden", "No location"],
            ] as const).map(([value, label, desc]) => {
              const active = selected.locationPrecision === value;
              return (
                <button
                  key={value}
                  onClick={() => setSelected((prev) => ({ ...prev, locationPrecision: value }))}
                  className={`rounded-lg border px-3 py-2 transition-colors ${
                    active
                      ? "border-[#f43f5e] bg-[#f43f5e]/10 text-[#f43f5e]"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  <div className="text-[13px]">{label}</div>
                  <div className="mt-1 text-[11px] opacity-75">{desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-slate-800 bg-[#0f172a] p-4 sm:mt-4 sm:rounded-xl">
          <p className="text-[12px] text-slate-500">Selected Location</p>
          <p className="mt-1 break-words text-[15px] leading-6 text-slate-200 sm:text-[16px]">
            {selected.locationLabel || selected.city || "Loading..."}
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            {typeof selected.latitude === "number" && typeof selected.longitude === "number"
              ? `${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}`
              : "No coordinates yet"}
          </p>
        </div>

        <Button
          type="button"
          onClick={confirm}
          className="mt-3 h-12 w-full rounded-xl bg-[#f43f5e] text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:bg-[#f43f5e]/90 sm:mt-4"
        >
          <Check className="mr-2 h-4 w-4" />
          Confirm Location
        </Button>

        {mapToken && !mapLoaded ? (
          <p className="mt-2 text-center text-[12px] text-slate-500">Loading map...</p>
        ) : null}
      </div>
    </div>
  );
}
