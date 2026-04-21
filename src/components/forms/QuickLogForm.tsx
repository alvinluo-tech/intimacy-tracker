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
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function isoLocalOffsetMinutes(minutes: number) {
  const d = new Date(Date.now() + minutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function toIsoZ(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
}

async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
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
      country: normalizeCountry(row.address?.country ?? null),
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

async function reverseGeocode(lat: number, lng: number) {
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
    label: row.display_name ?? null,
    city: row.address?.city ?? row.address?.town ?? row.address?.village ?? null,
    country: normalizeCountry(row.address?.country ?? null),
  };
}

export function QuickLogForm({
  mode,
  encounterId,
  initial,
  partners,
  tags,
}: {
  mode: "create" | "edit";
  encounterId?: string;
  initial?: Partial<EncounterFormValues>;
  partners: Partner[];
  tags: Tag[];
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
      partnerId: initial?.partnerId ?? null,
      startedAt: initial?.startedAt ?? isoLocalNow(),
      endedAt: initial?.endedAt ?? null,
      durationMinutes: initial?.durationMinutes ?? null,
      locationEnabled: initial?.locationEnabled ?? false,
      locationPrecision: initial?.locationPrecision ?? "off",
      latitude: initial?.latitude ?? null,
      longitude: initial?.longitude ?? null,
      locationLabel: initial?.locationLabel ?? null,
      city: initial?.city ?? null,
      country: initial?.country ?? null,
      rating: initial?.rating ?? null,
      mood: initial?.mood ?? null,
      notes: initial?.notes ?? null,
      tagIds: initial?.tagIds ?? [],
      tagNames: initial?.tagNames ?? [],
    },
  });

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
    <Card className="p-5">
      <form
        className="space-y-5"
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
              router.push(`/records/${res.id}/edit`);
              return;
            }

            const res = await updateEncounterAction(encounterId as string, payload);
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("已更新");
            router.push(`/records/${encounterId}`);
          });
        })}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              form.setValue("startedAt", isoLocalNow());
              form.setValue("endedAt", null);
              toast.message("已设置开始时间为现在");
            }}
          >
            开始（现在）
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              form.setValue("endedAt", isoLocalNow());
              toast.message("已设置结束时间为现在");
            }}
          >
            结束（现在）
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const start = isoLocalOffsetMinutes(-10);
              const end = isoLocalNow();
              form.setValue("startedAt", start);
              form.setValue("endedAt", end);
              toast.message("已填入一个 10 分钟示例区间");
            }}
          >
            现在完成（10 分钟）
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>开始时间</Label>
            <Input type="datetime-local" {...form.register("startedAt")} />
          </div>
          <div className="space-y-2">
            <Label>结束时间（可选）</Label>
            <Input
              type="datetime-local"
              {...form.register("endedAt", {
                setValueAs: (v) =>
                  typeof v === "string" && v.trim().length === 0 ? null : v,
              })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>对象（可选）</Label>
            <select
              className="h-10 w-full rounded-[6px] border border-[var(--app-border)] bg-white/[0.02] px-3 text-[14px] text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(113,112,255,0.4)]"
              value={partnerId ?? ""}
              onChange={(e) =>
                form.setValue("partnerId", e.target.value ? e.target.value : null)
              }
            >
              <option value="">无</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>评分（1-5，可选）</Label>
            <Input
              type="number"
              min={1}
              max={5}
              inputMode="numeric"
              value={rating ?? ""}
              onChange={(e) =>
                form.setValue(
                  "rating",
                  e.target.value ? Number(e.target.value) : null
                )
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>心情（可选）</Label>
          <Input placeholder="例如：calm / excited" {...form.register("mood")} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>标签</Label>
            <div className="text-[12px] text-[var(--app-text-subtle)]">
              可点击选择或新增
            </div>
          </div>
          <TagSelector
            available={tags}
            value={tagIds}
            onChange={(next) => form.setValue("tagIds", next)}
            newNames={tagNames}
            onNewNamesChange={(next) => form.setValue("tagNames", next)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>备注（默认折叠）</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes((v) => !v)}
            >
              {showNotes ? "收起" : "展开"}
            </Button>
          </div>
          {showNotes ? (
            <Textarea
              placeholder="备注会在服务端加密后保存"
              value={notes ?? ""}
              onChange={(e) =>
                form.setValue("notes", e.target.value ? e.target.value : null)
              }
            />
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>地点（默认关闭）</Label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={locationEnabled}
                onChange={(e) => form.setValue("locationEnabled", e.target.checked)}
              />
              <span className="text-[13px] text-[var(--app-text-secondary)]">
                记录地点
              </span>
            </label>
          </div>
          {locationEnabled ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>位置操作</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={geoPending}
                    onClick={() => {
                      if (!navigator.geolocation) {
                        toast.error("当前浏览器不支持地理定位");
                        return;
                      }
                      setGeoPending(true);
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          const lat = Number(pos.coords.latitude.toFixed(6));
                          const lng = Number(pos.coords.longitude.toFixed(6));
                          form.setValue("latitude", lat);
                          form.setValue("longitude", lng);
                          try {
                            const place = await reverseGeocode(lat, lng);
                            if (place) {
                              form.setValue("locationLabel", place.label);
                              form.setValue("city", place.city);
                              form.setValue("country", place.country);
                              setLocationQuery(place.label ?? "");
                            }
                          } finally {
                            setGeoPending(false);
                          }
                          toast.success("已获取当前位置");
                        },
                        () => {
                          setGeoPending(false);
                          toast.error("定位失败，请检查定位权限");
                        },
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }}
                  >
                    {geoPending ? "定位中..." : "获取当前位置"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>手动搜索位置</Label>
                <Input
                  placeholder="输入地点关键词（如: Shanghai Tower）"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                />
                {locationSearching ? (
                  <div className="text-[12px] text-[var(--app-text-muted)]">搜索中...</div>
                ) : null}
                {locationQuery.trim().length >= 2 && locationSuggestions.length ? (
                  <div className="max-h-48 space-y-2 overflow-auto rounded-[8px] border border-[var(--app-border-subtle)] p-2">
                    {locationSuggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full rounded-[6px] border border-transparent bg-white/[0.02] px-3 py-2 text-left hover:border-[var(--app-border-subtle)]"
                        onClick={() => {
                          form.setValue("latitude", s.lat);
                          form.setValue("longitude", s.lng);
                          form.setValue("locationLabel", s.label.slice(0, 120));
                          form.setValue("city", s.city);
                          form.setValue("country", s.country);
                          setLocationQuery(s.label);
                          setLocationSuggestions([]);
                          toast.success("已选择位置");
                        }}
                      >
                        <div className="text-[13px] text-[var(--app-text)]">{s.label}</div>
                        <div className="text-[11px] text-[var(--app-text-muted)]">
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
                  <option value="off">off</option>
                  <option value="city">city</option>
                  <option value="exact">exact</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>地点名（可选）</Label>
                <Input
                  placeholder="例如：Home"
                  value={locationLabel ?? ""}
                  onChange={(e) =>
                    form.setValue(
                      "locationLabel",
                      e.target.value ? e.target.value : null
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>城市（可选）</Label>
                <Input
                  value={city ?? ""}
                  onChange={(e) =>
                    form.setValue("city", e.target.value ? e.target.value : null)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>国家（可选）</Label>
                <Input
                  value={country ?? ""}
                  onChange={(e) =>
                    form.setValue(
                      "country",
                      e.target.value ? e.target.value : null
                    )
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>坐标</Label>
                <div className="text-[12px] text-[var(--app-text-muted)]">
                  {typeof latitude === "number" && typeof longitude === "number"
                    ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                    : "未设置"}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" disabled={pending}>
            {mode === "create" ? "创建记录" : "保存修改"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => router.back()}
          >
            取消
          </Button>
        </div>
      </form>
    </Card>
  );
}
