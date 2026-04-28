"use client";

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
import { Star, MapPin, Clock, Heart, Navigation, PlusCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";

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
              toast.success("已创建");
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
            toast.success("已更新");
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
              时间与时长
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
                  toast.message("已设置开始时间为现在");
                }}
              >
                开始(现在)
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
                  toast.message("已填入一个 10 分钟示例区间");
                }}
              >
                完成(10分钟)
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 rounded-[12px] bg-white/[0.02] p-4 border border-white/[0.05]">
            <div className="space-y-2">
              <Label>开始时间</Label>
              <Input type="datetime-local" step="1" {...form.register("startedAt")} />
            </div>
            <div className="space-y-2">
              <Label>结束时间 <span className="text-[var(--app-text-muted)] font-normal">(可选)</span></Label>
              <Input
                type="datetime-local"
                step="1"
                {...form.register("endedAt", {
                  setValueAs: (v) =>
                    typeof v === "string" && v.trim().length === 0 ? null : v,
                })}
              />
            </div>
          </div>
        </div>

        <hr className="border-white/[0.05]" />

        {/* SECTION: Details */}
        <div className="space-y-6">
          <h3 className="text-[14px] font-semibold text-[var(--app-text)] flex items-center gap-2">
            <Heart className="h-4 w-4 text-[var(--brand)]" />
            详情
          </h3>

          <div className="space-y-4">
            {/* Partner */}
            <div className="space-y-2">
              <Label>对象 <span className="text-rose-400 font-normal">*</span></Label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => form.setValue("partnerId", "")}
                  className={cn(
                    "flex items-center justify-center rounded-full border px-4 py-1.5 text-[13px] transition-all",
                    !partnerId
                      ? "border-transparent bg-white/[0.1] text-[var(--app-text)] shadow-sm"
                      : "border-white/[0.05] bg-white/[0.02] text-[var(--app-text-muted)] hover:bg-white/[0.06] hover:text-[var(--app-text)]"
                  )}
                >
                  未选择
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
                        : "border-white/[0.05] bg-white/[0.02] text-[var(--app-text-muted)] hover:bg-white/[0.06] hover:text-[var(--app-text)]"
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 rounded-[12px] bg-white/[0.02] p-4 border border-white/[0.05]">
              <div className="space-y-3">
                <Label>评分 <span className="text-[var(--app-text-muted)] font-normal">(可选)</span></Label>
                <div className="flex h-10 items-center justify-between rounded-[8px] border border-white/[0.05] bg-white/[0.02] px-4">
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
                            : "fill-transparent text-white/[0.2] group-hover:text-white/[0.4]"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>心情 <span className="text-[var(--app-text-muted)] font-normal">(可选)</span></Label>
                <Input placeholder="例如：开心 / 兴奋" {...form.register("mood")} className="h-10 bg-white/[0.02]" />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <Label>标签 <span className="text-[var(--app-text-muted)] font-normal">(可点击选择或新增)</span></Label>
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

        <hr className="border-white/[0.05]" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--app-text)] flex items-center gap-2">
              <span className="h-4 w-4 flex items-center justify-center text-[var(--brand)] font-serif italic text-[16px]">N</span>
              私密备注
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes((v) => !v)}
              className="h-8 text-[12px] text-[var(--app-text-muted)]"
            >
              {showNotes ? "收起" : "展开添加备注"}
            </Button>
          </div>
          {showNotes ? (
            <Textarea
              placeholder="记录一些只有你能看到的细节（端到端加密保存）"
              className="min-h-[100px] resize-y bg-white/[0.02]"
              value={notes ?? ""}
              onChange={(e) =>
                form.setValue("notes", e.target.value ? e.target.value : null)
              }
            />
          ) : null}
        </div>

        <hr className="border-white/[0.05]" />

        {/* SECTION: Location */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--app-text)] flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[var(--brand)]" />
              发生地点
            </h3>
            <div className="flex items-center gap-2">
              <Label htmlFor="location-switch" className="text-[12px] text-[var(--app-text-muted)] font-normal cursor-pointer">
                {locationEnabled ? "已开启" : "已关闭"}
              </Label>
              <Switch
                id="location-switch"
                checked={locationEnabled}
                onCheckedChange={(checked) => form.setValue("locationEnabled", checked)}
              />
            </div>
          </div>

          {locationEnabled ? (
            <div className="rounded-[12px] bg-white/[0.02] p-4 border border-white/[0.05] space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-3 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>手动搜索位置</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-[12px]"
                      disabled={geoPending}
                      onClick={() => {
                        if (!navigator.geolocation) {
                          toast.error("当前浏览器不支持地理定位");
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
                              toast.message("已自动切换为 exact 精度，可手动改为 city/off");
                            }
                            
                            const place = await reverseGeocode(lat, lng);
                            if (place) {
                              form.setValue("locationLabel", place.label);
                              form.setValue("city", place.city);
                              form.setValue("country", place.country);
                              setLocationQuery(place.label ?? "");
                            }
                            toast.success("已获取当前位置");
                          } catch (err) {
                            console.error(err);
                            toast.error("获取位置信息失败");
                          } finally {
                            setGeoPending(false);
                          }
                        },
                        (err) => {
                          console.error(err);
                          setGeoPending(false);
                          toast.error("定位失败，请检查定位权限");
                        },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                      );
                      }}
                    >
                      <Navigation className="mr-1 h-3 w-3" />
                      {geoPending ? "定位中..." : "获取当前位置"}
                    </Button>
                  </div>
                  <Input
                    placeholder="输入地点关键词（如: 酒店 / 城市）"
                    className="bg-white/[0.02]"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                  />
                  {locationSearching ? (
                    <div className="text-[12px] text-[var(--app-text-muted)] animate-pulse">搜索中...</div>
                  ) : null}
                  {locationQuery.trim().length >= 2 && locationSuggestions.length ? (
                    <div className="max-h-48 space-y-1 overflow-auto rounded-[8px] border border-[var(--app-border-subtle)] p-1 bg-[var(--app-bg)]">
                      {locationSuggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full rounded-[6px] px-3 py-2 text-left hover:bg-white/[0.04] transition-colors"
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
                            toast.success("已选择位置");
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
                  <Label>精度</Label>
                  <select
                    className="h-10 w-full rounded-[6px] border border-[var(--app-border)] bg-white/[0.02] px-3 text-[14px] text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(113,112,255,0.4)]"
                    value={locationPrecision}
                    onChange={(e) =>
                      form.setValue(
                        "locationPrecision",
                        e.target.value as "off" | "city" | "exact"
                      )
                    }
                  >
                    <option value="off" className="bg-[var(--app-bg)]">隐藏位置 (off)</option>
                    <option value="city" className="bg-[var(--app-bg)]">城市级精度 (city)</option>
                    <option value="exact" className="bg-[var(--app-bg)]">精确坐标 (exact)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>地点名称 <span className="text-[var(--app-text-muted)] font-normal">(可选)</span></Label>
                  <Input
                    placeholder="例如：家里 / 某酒店"
                    className="bg-white/[0.02]"
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
                  <Label>地点备注 <span className="text-[var(--app-text-muted)] font-normal">(可选)</span></Label>
                  <Input
                    placeholder="例如：具体的房间号或其他相关说明"
                    className="bg-white/[0.02]"
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
                  <Label>城市 <span className="text-[var(--app-text-muted)] font-normal">(可选)</span></Label>
                  <Input
                    className="bg-white/[0.02]"
                    value={city ?? ""}
                    onChange={(e) =>
                      form.setValue("city", e.target.value ? e.target.value : null)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>国家 <span className="text-[var(--app-text-muted)] font-normal">(可选)</span></Label>
                  <Input
                    className="bg-white/[0.02]"
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
                    <span className="text-[var(--app-text-muted)]">当前坐标：</span>
                    <span className="font-mono text-[var(--app-text-subtle)] bg-white/[0.05] px-2 py-1 rounded">
                      {typeof latitude === "number" && typeof longitude === "number"
                        ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                        : "未设置"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex gap-3 border-t border-white/[0.05] bg-[#1a1f2e] p-4 backdrop-blur-md md:mx-0 md:mb-0 md:bg-transparent md:p-0 md:backdrop-blur-none md:border-none md:pt-4">
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
            取消
          </Button>
          <Button type="submit" variant="primary" className="flex-[2] md:flex-1 font-semibold shadow-lg shadow-[var(--brand)]/20" disabled={pending}>
            {pending ? "保存中..." : mode === "create" ? "创建记录" : "保存修改"}
          </Button>
        </div>
      </form>
  );
}
