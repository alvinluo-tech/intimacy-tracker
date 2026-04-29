"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  encounterFormSchema,
  type EncounterFormValues,
} from "@/lib/validators/encounter";
import type { Partner, Tag } from "@/features/records/types";
import { createEncounterAction, updateEncounterAction } from "@/features/records/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagSelector } from "@/components/timeline/TagSelector";
import { Star, MapPin, Clock, Heart, Navigation, PlusCircle, Bookmark, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { createSavedAddressAction } from "@/features/addresses/actions";
import type { SavedAddress } from "@/features/addresses/types";

type PlaceSuggestion = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  city: string | null;
  country: string | null;
};

function normalizeCountry(value: string | null | undefined) {
  if (!value) return null;
  const tokens = value
    .split(/[,/|;，、]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!tokens.length) return null;
  return tokens[0];
}

function isoLocalNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

function formatDateForInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

function isoLocalOffsetMinutes(minutes: number) {
  const d = new Date(Date.now() + minutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

function toIsoZ(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
}

function cleanLocationLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  // Split by comma, slash, semicolon, or vertical bar
  const parts = label.split(/[,/|;，、]+/);
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    // Normalize string to check for duplicates (ignore spaces and lowercase)
    const normalized = trimmed.replace(/\s+/g, "").toLowerCase();
    
    // Simplistic deduplication for Simplified/Traditional variants 
    // that are often concatenated like "法国本土/法国本土" or "马赛, 馬賽"
    if (!seen.has(normalized)) {
      seen.add(normalized);
      cleaned.push(trimmed);
    }
  }

  return cleaned.join(", ");
}

async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
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
        label: cleanLocationLabel(row.display_name) ?? row.display_name,
        lat: Number(row.lat),
        lng: Number(row.lon),
        city: cleanLocationLabel(row.address?.city ?? row.address?.town ?? row.address?.village) ?? null,
        country: normalizeCountry(row.address?.country ?? null),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  } catch (err) {
    console.error("Failed to search places:", err);
    return [];
  }
}

async function reverseGeocode(lat: number, lng: number) {
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
  } catch (err) {
    console.error("Failed to reverse geocode:", err);
    return null;
  }
}

export function QuickLogForm({
  mode,
  encounterId,
  initial,
  partners,
  tags,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  encounterId?: string;
  initial?: Omit<Partial<EncounterFormValues>, "startedAt" | "endedAt"> & {
    durationMinutes?: number | null;
    startedAt?: Date | string;
    endedAt?: Date | string | null;
  };
  partners: Partner[];
  tags: Tag[];
  onSuccess?: (id: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [showNotes, setShowNotes] = React.useState(Boolean(initial?.notes));
  const [pending, startTransition] = React.useTransition();
  const [geoPending, setGeoPending] = React.useState(false);
  const [locationQuery, setLocationQuery] = React.useState(initial?.locationLabel ?? "");
  const [locationSearching, setLocationSearching] = React.useState(false);
  const [locationSuggestions, setLocationSuggestions] = React.useState<PlaceSuggestion[]>([]);
  const [savedAddresses, setSavedAddresses] = React.useState<SavedAddress[]>([]);
  const [showAliasInput, setShowAliasInput] = React.useState(false);
  const [aliasInput, setAliasInput] = React.useState("");

  React.useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("saved_addresses")
        .select("id,user_id,alias,latitude,longitude,location_label,city,country,location_precision,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) {
        setSavedAddresses(
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
    })();
  }, []);

  const form = useForm<EncounterFormValues>({
    resolver: zodResolver(encounterFormSchema),
    defaultValues: {
      partnerId: "",
      startedAt: isoLocalNow(),
      endedAt: null,
      durationMinutes: null,
      locationEnabled: false,
      locationPrecision: typeof window !== "undefined" && ["off", "city", "exact"].includes(localStorage.getItem("encounter_location_mode") ?? "") ? localStorage.getItem("encounter_location_mode") as "off" | "city" | "exact" : "off",
      latitude: null,
      longitude: null,
      locationLabel: null,
      locationNotes: null,
      city: null,
      country: null,
      rating: null,
      mood: null,
      notes: null,
      tagIds: [],
      tagNames: [],
      shareNotesWithPartner: false,
      photos: [],
    },
  });

  // Reset form when initial data changes (for edit mode)
  React.useEffect(() => {
    console.log("QuickLogForm useEffect - mode:", mode, "initial:", initial);
    if (mode === "edit" && initial) {
      console.log("Resetting form with initial data:", initial);
      form.reset({
        partnerId: initial.partnerId ?? "",
        startedAt: initial.startedAt ? (typeof initial.startedAt === "string" ? initial.startedAt : formatDateForInput(initial.startedAt)) : isoLocalNow(),
        endedAt: initial.endedAt ? (typeof initial.endedAt === "string" ? initial.endedAt : formatDateForInput(initial.endedAt)) : null,
        durationMinutes: initial.durationMinutes ?? null,
        locationEnabled: initial.locationEnabled ?? false,
        locationPrecision: initial.locationPrecision ?? "off",
        latitude: initial.latitude ?? null,
        longitude: initial.longitude ?? null,
        locationLabel: initial.locationLabel ?? null,
        locationNotes: initial.locationNotes ?? null,
        city: initial.city ?? null,
        country: initial.country ?? null,
        rating: initial.rating ?? null,
        mood: initial.mood ?? null,
        notes: initial.notes ?? null,
        tagIds: initial.tagIds ?? [],
        tagNames: initial.tagNames ?? [],
        shareNotesWithPartner: initial.shareNotesWithPartner ?? false,
        photos: initial.photos ?? [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, mode]);

  const locationEnabled =
    useWatch({
      control: form.control,
      name: "locationEnabled",
    }) ?? false;
  const tagIds = useWatch({ control: form.control, name: "tagIds" }) ?? [];
  const tagNames = useWatch({ control: form.control, name: "tagNames" }) ?? [];
  const partnerId = useWatch({ control: form.control, name: "partnerId" });
  const locationPrecision =
    useWatch({
      control: form.control,
      name: "locationPrecision",
    }) ?? "off";
  const rating = useWatch({ control: form.control, name: "rating" });
  const notes = useWatch({ control: form.control, name: "notes" });
  const locationLabel = useWatch({
    control: form.control,
    name: "locationLabel",
  });
  const locationNotes = useWatch({ control: form.control, name: "locationNotes" });
  const latitude = useWatch({ control: form.control, name: "latitude" });
  const longitude = useWatch({ control: form.control, name: "longitude" });
  const city = useWatch({ control: form.control, name: "city" });
  const country = useWatch({ control: form.control, name: "country" });

  const t = useTranslations("encounter");
  const tc = useTranslations("common");

  React.useEffect(() => {
    if (!locationEnabled) {
      return;
    }
    const q = locationQuery.trim();
    if (q.length < 2) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLocationSearching(true);
      try {
        const rows = await searchPlaces(q);
        if (!cancelled) setLocationSuggestions(rows);
      } catch {
        if (!cancelled) setLocationSuggestions([]);
      } finally {
        if (!cancelled) setLocationSearching(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [locationEnabled, locationQuery]);

  const saveAlias = async (alias: string) => {
    if (!alias.trim() || latitude == null || longitude == null) return;
    const res = await createSavedAddressAction({
      alias: alias.trim(),
      latitude,
      longitude,
      locationLabel: locationLabel ?? undefined,
      city: city ?? undefined,
      country: country ?? undefined,
      locationPrecision: locationPrecision ?? undefined,
    });
    if (res.ok) {
      toast.success(t("addressSaved"));
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("saved_addresses")
          .select("id,user_id,alias,latitude,longitude,location_label,city,country,location_precision,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (data) {
          setSavedAddresses(
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

  return (
    <form
      className="space-y-8 pb-4"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
            const payload: EncounterFormValues = {
              ...values,
              startedAt: toIsoZ(values.startedAt),
              endedAt: values.endedAt ? toIsoZ(values.endedAt) : null,
            };

            if (mode === "create") {
              const res = await createEncounterAction(payload);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success(t("createSuccess"));
              if (onSuccess) {
                onSuccess(res.id);
              } else {
                router.push(`/records/${res.id}/edit`);
              }
              return;
            }

            const res = await updateEncounterAction(encounterId as string, payload);
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success(t("updateSuccess"));
            if (onSuccess) {
              onSuccess(encounterId as string);
            } else {
              router.push(`/records/${encounterId}`);
            }
          });
        })}
      >
        {/* SECTION: Time */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--app-text)] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--brand)]" />
{t("timeAndDuration")}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[12px]"
                onClick={() => {
                  form.setValue("startedAt", isoLocalNow());
                  form.setValue("endedAt", null);
                  toast.message(t("startTimeNow"));
                }}
              >
                {t("startNow")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[12px]"
                onClick={() => {
                  const start = isoLocalOffsetMinutes(-10);
                  const end = isoLocalNow();
                  form.setValue("startedAt", start);
                  form.setValue("endedAt", end);
                  toast.message(t("tenMinInterval"));
                }}
              >
                {t("completeWithDuration")}
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 rounded-[12px] bg-surface/2 p-4 border border-border/5">
            <div className="space-y-2">
              <Label>{t("startTime")}</Label>
              <Input type="datetime-local" step="1" className="h-12 text-[16px]" {...form.register("startedAt")} />
            </div>
            <div className="space-y-2">
              <Label>{t("endTime")} <span className="text-[var(--app-text-muted)] font-normal">({t("optional")})</span></Label>
              <Input
                type="datetime-local"
                step="1"
                className="h-12 text-[16px]"
                {...form.register("endedAt", {
                  setValueAs: (v) =>
                    typeof v === "string" && v.trim().length === 0 ? null : v,
                })}
              />
            </div>
          </div>
        </div>

        <hr className="border-border/5" />

        {/* SECTION: Details */}
        <div className="space-y-6">
          <h3 className="text-[14px] font-semibold text-[var(--app-text)] flex items-center gap-2">
            <Heart className="h-4 w-4 text-[var(--brand)]" />
{t("details")}
          </h3>

          <div className="space-y-4">
            {/* Partner */}
            <div className="space-y-2">
              <Label>{t("partner")} <span className="text-rose-400 font-normal">*</span></Label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => form.setValue("partnerId", "")}
                  className={cn(
                    "flex items-center justify-center rounded-full border px-4 py-1.5 text-[13px] transition-all",
                    !partnerId
                      ? "border-transparent bg-surface/10 text-[var(--app-text)] shadow-sm"
                      : "border-border/5 bg-surface/2 text-[var(--app-text-muted)] hover:bg-surface/6 hover:text-[var(--app-text)]"
                  )}
                >
                  {t("notSelected")}
                </button>
                {partners.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => form.setValue("partnerId", p.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-all",
                      partnerId === p.id
                        ? "border-transparent text-white shadow-sm"
                        : "border-border/5 bg-surface/2 text-[var(--app-text-muted)] hover:bg-surface/6 hover:text-[var(--app-text)]"
                    )}
                    style={
                      partnerId === p.id
                        ? { backgroundColor: p.color || "var(--brand)" }
                        : {}
                    }
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: p.color || "var(--brand)" }}
                      />
                    )}
                    {p.nickname}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating & Mood */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 rounded-[12px] bg-surface/2 p-4 border border-border/5">
              <div className="space-y-3">
                <Label>{t("rating")} <span className="text-[var(--app-text-muted)] font-normal">({t("optional")})</span></Label>
                <div className="flex h-10 items-center justify-between rounded-[8px] border border-border/5 bg-surface/2 px-4">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => form.setValue("rating", rating === val ? null : val)}
                      className="group p-1 transition-transform hover:scale-110 focus-visible:outline-none"
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          rating && val <= rating
                            ? "fill-[#f59e0b] text-[#f59e0b]"
                            : "fill-transparent text-muted/20 group-hover:text-muted/40"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>{t("mood")} <span className="text-[var(--app-text-muted)] font-normal">({t("optional")})</span></Label>
                <Input placeholder={t("moodPlaceholder")} {...form.register("mood")} className="h-10 bg-surface/2" />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <Label>{t("tags")} <span className="text-[var(--app-text-muted)] font-normal">({t("tagsHint")})</span></Label>
              <TagSelector
                available={tags}
                value={tagIds}
                onChange={(next) => form.setValue("tagIds", next)}
                newNames={tagNames}
                onNewNamesChange={(next) => form.setValue("tagNames", next)}
              />
            </div>
          </div>
        </div>

        <hr className="border-border/5" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--app-text)] flex items-center gap-2">
              <span className="h-4 w-4 flex items-center justify-center text-[var(--brand)] font-serif italic text-[16px]">N</span>
{t("privateNotes")}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes((v) => !v)}
              className="h-8 text-[12px] text-[var(--app-text-muted)]"
            >
              {showNotes ? t("collapse") : t("expandNotes")}
            </Button>
          </div>
          {showNotes ? (
            <Textarea
              placeholder={t("notesPlaceholder")}
              className="min-h-[100px] resize-y bg-surface/2"
              value={notes ?? ""}
              onChange={(e) =>
                form.setValue("notes", e.target.value ? e.target.value : null)
              }
            />
          ) : null}
        </div>

        <hr className="border-border/5" />

        {/* SECTION: Location */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--app-text)] flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[var(--brand)]" />
{t("location")}
            </h3>
            <div className="flex items-center gap-2">
              <Label htmlFor="location-switch" className="text-[12px] text-[var(--app-text-muted)] font-normal cursor-pointer">
                {locationEnabled ? t("enabled") : t("disabled")}
              </Label>
              <Switch
                id="location-switch"
                checked={locationEnabled}
                onCheckedChange={(checked) => form.setValue("locationEnabled", checked)}
              />
            </div>
          </div>

          {locationEnabled ? (
            <div className="rounded-[12px] bg-surface/2 p-4 border border-border/5 space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-3 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>{t("searchLocation")}</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-[12px]"
                      disabled={geoPending}
                      onClick={() => {
                        if (!navigator.geolocation) {
                          toast.error(t("geoNotSupported"));
                          return;
                        }
                        setGeoPending(true);
                        navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          try {
                            const lat = Number(pos.coords.latitude.toFixed(6));
                            const lng = Number(pos.coords.longitude.toFixed(6));
                            form.setValue("latitude", lat);
                            form.setValue("longitude", lng);
                            if (form.getValues("locationPrecision") === "off") {
                              form.setValue("locationPrecision", "exact");
                              toast.message(t("autoPrecision"));
                            }
                            
                            const place = await reverseGeocode(lat, lng);
                            if (place) {
                              form.setValue("locationLabel", place.label);
                              form.setValue("city", place.city);
                              form.setValue("country", place.country);
                              setLocationQuery(place.label ?? "");
                            }
                            toast.success(t("currentLocationObtained"));
                          } catch (err) {
                            console.error(err);
                            toast.error(t("locationFetchFailed"));
                          } finally {
                            setGeoPending(false);
                          }
                        },
                        (err) => {
                          console.error(err);
                          setGeoPending(false);
                          toast.error(t("geoPermissionDenied"));
                        },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                      );
                      }}
                    >
                      <Navigation className="mr-1 h-3 w-3" />
                      {geoPending ? t("geoLocating") : t("useCurrentLocation")}
                    </Button>
                  </div>

                  {savedAddresses.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {savedAddresses.slice(0, 5).map((addr) => {
                        const lat = form.watch("latitude");
                        const lng = form.watch("longitude");
                        const isSelected =
                          typeof lat === "number" &&
                          typeof lng === "number" &&
                          Math.abs(lat - addr.latitude) < 0.0001 &&
                          Math.abs(lng - addr.longitude) < 0.0001;
                        return (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => {
                              form.setValue("latitude", addr.latitude);
                              form.setValue("longitude", addr.longitude);
                              if (form.getValues("locationPrecision") === "off") {
                                form.setValue("locationPrecision", "exact");
                              }
                              form.setValue("locationLabel", addr.locationLabel);
                              form.setValue("city", addr.city);
                              form.setValue("country", addr.country);
                              form.setValue("locationEnabled", true);
                              setLocationQuery(addr.locationLabel ?? "");
                              toast.success(t("locationSelected"));
                            }}
                            className={`rounded-full border px-3 py-1.5 text-[12px] transition-all ${
                              isSelected
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border bg-surface/30 text-muted hover:border-border"
                            }`}
                          >
                            {addr.alias}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  <Input
                    placeholder={t("searchLocationPlaceholder")}
                    className="bg-surface/2"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                  />
                  {locationSearching ? (
                    <div className="text-[12px] text-[var(--app-text-muted)] animate-pulse">{t("searching")}</div>
                  ) : null}
                  {locationQuery.trim().length >= 2 && locationSuggestions.length ? (
                    <div className="max-h-48 space-y-1 overflow-auto rounded-[8px] border border-[var(--app-border-subtle)] p-1 bg-[var(--app-bg)]">
                      {locationSuggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full rounded-[6px] px-3 py-2 text-left hover:bg-muted/5 transition-colors"
                          onClick={() => {
                            form.setValue("latitude", s.lat);
                            form.setValue("longitude", s.lng);
                            if (form.getValues("locationPrecision") === "off") {
                              form.setValue("locationPrecision", "exact");
                            }
                            form.setValue("locationLabel", s.label.slice(0, 120));
                            form.setValue("city", s.city);
                            form.setValue("country", s.country);
                            setLocationQuery(s.label);
                            setLocationSuggestions([]);
                            toast.success(t("locationSelected"));
                          }}
                        >
                          <div className="text-[13px] text-[var(--app-text)] font-medium">{s.label}</div>
                          <div className="text-[11px] text-[var(--app-text-muted)] mt-0.5">
                            {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>{t("precision")}</Label>
                  <select
                    className="h-10 w-full rounded-[6px] border border-[var(--app-border)] bg-surface/2 px-3 text-[14px] text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(113,112,255,0.4)]"
                    value={locationPrecision}
                    onChange={(e) =>
                      form.setValue(
                        "locationPrecision",
                        e.target.value as "off" | "city" | "exact"
                      )
                    }
                  >
                    <option value="off" className="bg-[var(--app-bg)]">{t("precisionOff")}</option>
                    <option value="city" className="bg-[var(--app-bg)]">{t("precisionCity")}</option>
                    <option value="exact" className="bg-[var(--app-bg)]">{t("precisionExact")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t("locationName")} <span className="text-[var(--app-text-muted)] font-normal">({t("optional")})</span></Label>
                  <Input
                    placeholder={t("locationNamePlaceholder")}
                    className="bg-surface/2"
                    value={locationLabel ?? ""}
                    onChange={(e) =>
                      form.setValue(
                        "locationLabel",
                        e.target.value ? e.target.value : null
                      )
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t("locationNotes")} <span className="text-[var(--app-text-muted)] font-normal">({t("optional")})</span></Label>
                  <Input
                    placeholder={t("locationNotesPlaceholder")}
                    className="bg-surface/2"
                    value={locationNotes ?? ""}
                    onChange={(e) =>
                      form.setValue(
                        "locationNotes",
                        e.target.value ? e.target.value : null
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("city")} <span className="text-[var(--app-text-muted)] font-normal">({t("optional")})</span></Label>
                  <Input
                    className="bg-surface/2"
                    value={city ?? ""}
                    onChange={(e) =>
                      form.setValue("city", e.target.value ? e.target.value : null)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("country")} <span className="text-[var(--app-text-muted)] font-normal">({t("optional")})</span></Label>
                  <Input
                    className="bg-surface/2"
                    value={country ?? ""}
                    onChange={(e) =>
                      form.setValue(
                        "country",
                        e.target.value ? e.target.value : null
                      )
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2 pt-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--app-text-muted)]">{t("currentCoords")}</span>
                    <span className="font-mono text-[var(--app-text-subtle)] bg-muted/5 px-2 py-1 rounded">
                      {typeof latitude === "number" && typeof longitude === "number"
                        ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                        : t("notSet")}
                    </span>
                  </div>
                  {typeof latitude === "number" && typeof longitude === "number" ? (
                    showAliasInput ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={aliasInput}
                          onChange={(e) => setAliasInput(e.target.value)}
                          placeholder={t("aliasPlaceholder")}
                          className="flex-1 rounded-[6px] border border-border/10 bg-surface/2 px-2 py-1.5 text-[12px] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] focus:border-[var(--brand)] focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              saveAlias(aliasInput);
                              setShowAliasInput(false);
                            }
                            if (e.key === "Escape") setShowAliasInput(false);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            saveAlias(aliasInput);
                            setShowAliasInput(false);
                          }}
                          disabled={!aliasInput.trim()}
                          className="rounded-[6px] bg-[var(--brand)] px-3 py-1.5 text-[12px] text-white disabled:opacity-50"
                        >
                          {t("saveToAddresses")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAliasInput(false)}
                          className="rounded-[6px] bg-surface/2 p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAliasInput("");
                          setShowAliasInput(true);
                        }}
                        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-[6px] border border-border/6 bg-surface/2 px-3 py-1.5 text-[12px] text-[var(--app-text-muted)] transition-colors hover:border-border/12 hover:text-[var(--app-text)]"
                      >
                        <Bookmark className="h-3 w-3" />
                        {t("saveToAddresses")}
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex gap-3 border-t border-border/5 bg-surface p-4 backdrop-blur-md md:mx-0 md:mb-0 md:bg-transparent md:p-0 md:backdrop-blur-none md:border-none md:pt-4">
          <Button
            type="button"
            variant="ghost"
            className="flex-1 md:flex-none md:w-24"
            disabled={pending}
            onClick={() => {
              if (onCancel) {
                onCancel();
              } else {
                router.back();
              }
            }}
          >
{tc("cancel")}
          </Button>
          <Button type="submit" variant="primary" className="flex-[2] md:flex-1 font-semibold shadow-lg shadow-[var(--brand)]/20" disabled={pending}>
            {pending ? t("saving") : mode === "create" ? t("create") : t("saveChanges")}
          </Button>
        </div>
      </form>
  );
}
