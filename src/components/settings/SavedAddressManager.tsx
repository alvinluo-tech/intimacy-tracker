"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, PencilLine, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  createSavedAddressAction,
  updateSavedAddressAliasAction,
  deleteSavedAddressAction,
} from "@/features/addresses/actions";
import type { SavedAddress } from "@/features/addresses/types";

type SearchResult = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  city: string | null;
  country: string | null;
};

async function searchLocation(query: string): Promise<SearchResult[]> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
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
        label: row.display_name,
        lat: Number(row.lat),
        lng: Number(row.lon),
        city: row.address?.city ?? row.address?.town ?? row.address?.village ?? null,
        country: row.address?.country ?? null,
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  } catch {
    return [];
  }
}

function reverseGeocode(lat: number, lng: number): Promise<SearchResult[]> {
  return searchLocation(`${lat},${lng}`);
}

export function SavedAddressManager() {
  const t = useTranslations("settings");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [newAlias, setNewAlias] = useState("");
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const rows = await searchLocation(searchQuery.trim());
        if (!cancelled) setSearchResults(rows);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!showAddDialog) {
      // Clean up map when dialog closes
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      return;
    }

    // Wait for DOM to be ready
    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
      const isDark = document.documentElement.classList.contains("dark");

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11",
        center: [newLng ?? 104.06, newLat ?? 30.67], // Default to Chengdu or selected location
        zoom: newLat !== null ? 14 : 4,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

      // Click to select point
      map.on("click", async (e) => {
        const { lng, lat } = e.lngLat;
        setNewLat(lat);
        setNewLng(lng);

        // Place/update marker
        if (markerRef.current) markerRef.current.remove();
        const el = document.createElement("div");
        el.className = "w-7 h-7 rounded-full bg-rose-500 border-2 border-white shadow-lg flex items-center justify-center";
        el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
        markerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);

        // Reverse geocode
        try {
          const result = await reverseGeocode(lat, lng);
          if (result.length > 0) {
            const r = result[0];
            setNewLabel(r.label);
            setNewCity(r.city ?? "");
            setNewCountry(r.country ?? "");
            if (!newAlias) setNewAlias(r.label.slice(0, 30));
          }
        } catch { /* ignore */ }
      });

      // Place initial marker if coordinates exist
      if (newLat !== null && newLng !== null) {
        const el = document.createElement("div");
        el.className = "w-7 h-7 rounded-full bg-rose-500 border-2 border-white shadow-lg flex items-center justify-center";
        el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
        markerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([newLng, newLat])
          .addTo(map);
      }

      mapRef.current = map;
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddDialog]);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("saved_addresses")
        .select("id,user_id,alias,latitude,longitude,location_label,city,country,location_precision,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setAddresses(
          data.map((row) => ({
            id: row.id,
            userId: row.user_id,
            alias: row.alias,
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
            locationLabel: row.location_label,
            city: row.city,
            country: row.country,
            locationPrecision: (row.location_precision ?? "exact") as "off" | "city" | "exact",
            createdAt: row.created_at,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleAdd = async () => {
    if (!newAlias.trim()) { toast.error("Alias is required"); return; }
    if (newLat === null || newLng === null) { toast.error("Search and select a location first"); return; }

    setPending(true);
    const res = await createSavedAddressAction({
      alias: newAlias.trim(),
      latitude: newLat,
      longitude: newLng,
      locationLabel: newLabel.trim() || null,
      city: newCity.trim() || null,
      country: newCountry.trim() || null,
      locationPrecision: "exact",
    });
    setPending(false);

    if (res.ok) {
      toast.success(t("addressSaved"));
      setShowAddDialog(false);
      resetForm();
      // Invalidate cache by re-fetching
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("saved_addresses")
          .select("id,user_id,alias,latitude,longitude,location_label,city,country,location_precision,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (data) {
          setAddresses(
            data.map((row) => ({
              id: row.id,
              userId: row.user_id,
              alias: row.alias,
              latitude: Number(row.latitude),
              longitude: Number(row.longitude),
              locationLabel: row.location_label,
              city: row.city,
              country: row.country,
              locationPrecision: (row.location_precision ?? "exact") as "off" | "city" | "exact",
              createdAt: row.created_at,
            }))
          );
        }
      }
    } else {
      toast.error(res.error);
    }
  };

  const handleEditAlias = async (id: string, alias: string) => {
    setPending(true);
    const res = await updateSavedAddressAliasAction({ id, alias: alias.trim() });
    setPending(false);
    if (res.ok) {
      toast.success(t("aliasUpdated"));
      setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, alias: alias.trim() } : a)));
      setEditingId(null);
    } else {
      toast.error(res.error);
    }
  };

  const handleDelete = async (id: string) => {
    setPending(true);
    const res = await deleteSavedAddressAction({ id });
    setPending(false);
    if (res.ok) {
      toast.success(t("addressDeleted"));
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } else {
      toast.error(res.error);
    }
  };

  const resetForm = () => {
    setNewAlias("");
    setNewLat(null);
    setNewLng(null);
    setNewLabel("");
    setNewCity("");
    setNewCountry("");
    setSearchQuery("");
    setSearchResults([]);
  };

  const locationPreview = (addr: SavedAddress) =>
    addr.locationLabel || addr.city || addr.country || `${addr.latitude.toFixed(4)}, ${addr.longitude.toFixed(4)}`;

  if (loading) {
    return <div className="h-20 animate-pulse rounded-2xl bg-surface/80" />;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface/80 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-muted" />
          <div>
            <div className="text-[18px] font-light text-content">{t("savedAddresses")}</div>
            <div className="text-[14px] text-muted">{t("savedAddressesDescription")}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowAddDialog(true); }}
          className="flex h-9 items-center gap-1.5 rounded-xl bg-rose-500 px-3 text-[13px] text-white shadow-[0_0_12px_rgba(244,63,94,0.28)] transition-colors hover:bg-rose-400"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("addAddress")}
        </button>
      </div>

      {addresses.length === 0 ? (
        <p className="py-6 text-center text-[14px] text-muted">{t("noAddresses")}</p>
      ) : (
        <div className="space-y-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface/60 px-4 py-3 transition-colors hover:border-border"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0 text-rose-400" />
                <div className="min-w-0">
                  {editingId === addr.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        defaultValue={addr.alias}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditingId(null);
                          if (e.key === "Enter") {
                            handleEditAlias(addr.id, (e.target as HTMLInputElement).value);
                          }
                        }}
                        onBlur={(e) => handleEditAlias(addr.id, e.target.value)}
                        className="h-8 w-40 rounded-lg border border-rose-500/50 bg-surface px-2 text-[14px] text-content outline-none"
                      />
                    </div>
                  ) : (
                    <p className="truncate text-[15px] font-medium text-content">{addr.alias}</p>
                  )}
                  <p className="truncate text-[12px] text-muted">{locationPreview(addr)}</p>
                </div>
              </div>
              <div className="ml-3 flex items-center gap-1">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setEditingId(addr.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-content"
                >
                  <PencilLine className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleDelete(addr.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-destructive/30 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-[18px] font-light text-content">{t("addAddress")}</h4>
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-content"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Interactive Map - always visible */}
              <div>
                <label className="mb-1 block text-[13px] text-muted">{t("tapMapToSelect")}</label>
                <div className="overflow-hidden rounded-xl border border-border">
                  <div ref={mapContainerRef} className="h-[200px] w-full" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[13px] text-muted">{t("searchAddress")}</label>
                <div ref={searchRef} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("searchAddressPlaceholder")}
                      className="h-11 w-full rounded-xl border border-border bg-surface/70 pl-9 pr-3 text-[14px] text-content outline-none transition-colors placeholder:text-muted focus:border-rose-500/50"
                    />
                    {searching && <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-border border-t-rose-400" />}
                  </div>
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border bg-surface p-1 shadow-lg">
                      {searchResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className="w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface"
                          onClick={() => {
                            setNewLat(r.lat);
                            setNewLng(r.lng);
                            setNewLabel(r.label);
                            setNewCity(r.city ?? "");
                            setNewCountry(r.country ?? "");
                            if (!newAlias) setNewAlias(r.label.slice(0, 30));
                            setSearchQuery(r.label);
                            setSearchResults([]);
                            // Fly map and place marker
                            if (mapRef.current) {
                              mapRef.current.flyTo({ center: [r.lng, r.lat], zoom: 14 });
                              if (markerRef.current) markerRef.current.remove();
                              const el = document.createElement("div");
                              el.className = "w-7 h-7 rounded-full bg-rose-500 border-2 border-white shadow-lg flex items-center justify-center";
                              el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
                              markerRef.current = new mapboxgl.Marker({ element: el })
                                .setLngLat([r.lng, r.lat])
                                .addTo(mapRef.current);
                            }
                          }}
                        >
                          <div className="text-[14px] font-medium text-content">{r.label}</div>
                          <div className="mt-0.5 text-[12px] text-muted">
                            {r.city || r.country ? `${r.city ? r.city + ", " : ""}${r.country ?? ""}` : `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {newLat !== null && newLng !== null && (
                <>
                  <div className="rounded-xl bg-surface/50 px-3 py-2 text-[13px] text-muted">
                    {newLabel}{newCity ? ` — ${newCity}` : ""}{newCountry ? `, ${newCountry}` : ""}
                    <span className="ml-2 text-muted">({newLat.toFixed(4)}, {newLng.toFixed(4)})</span>
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] text-muted">{t("alias")}</label>
                    <input
                      value={newAlias}
                      onChange={(e) => setNewAlias(e.target.value)}
                      placeholder={t("aliasPlaceholder")}
                      className="h-11 w-full rounded-xl border border-border bg-surface/70 px-3 text-[14px] text-content outline-none transition-colors placeholder:text-muted focus:border-rose-500/50"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {["home", "office", "hotel", "gym", "parents", "friend"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setNewAlias(t(`presetAlias.${preset}`))}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                            newAlias === t(`presetAlias.${preset}`)
                              ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
                              : "border-border bg-surface/50 text-muted hover:border-border hover:text-content"
                          }`}
                        >
                          {t(`presetAlias.${preset}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="h-10 rounded-xl bg-surface px-4 text-[14px] text-content transition-colors hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={handleAdd}
                className="h-10 rounded-xl bg-rose-500 px-4 text-[14px] text-white shadow-[0_0_12px_rgba(244,63,94,0.28)] transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("addAddress")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
