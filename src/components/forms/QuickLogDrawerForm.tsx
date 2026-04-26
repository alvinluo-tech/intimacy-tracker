"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  Image as ImageIcon,
  Lock,
  MapPin,
  MoreVertical,
  Navigation,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Picker from "react-mobile-picker";

import type { Partner, Tag } from "@/features/records/types";
import { createEncounterAction } from "@/features/records/actions";
import type { EncounterFormValues } from "@/lib/validators/encounter";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  readQuickLogLocationDraft,
  setQuickLogReopenFlag,
} from "@/lib/utils/quicklog-location-draft";

type PlaceSuggestion = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  city: string | null;
  country: string | null;
};

type PhotoFile = {
  id: string;
  url: string;
  file: File;
  isPrivate: boolean;
};

const MOOD_EMOJIS = ["😞", "😐", "🙂", "😊", "🥰"];
const MOOD_LABELS = ["Very Sad", "Neutral", "Happy", "Very Happy", "Love"];

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

function toIsoZ(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
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
  } catch {
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
  } catch {
    return null;
  }
}

export function QuickLogDrawerForm({
  partners,
  tags,
  defaultSelectionId,
  defaultLocationMode,
  recordedDuration,
  recordedStartTime,
  onClose,
  onSuccess,
}: {
  partners: Partner[];
  tags: Tag[];
  defaultSelectionId?: string;
  defaultLocationMode: "off" | "city" | "exact";
  recordedDuration?: number | null;
  recordedStartTime?: Date | null;
  onClose: () => void;
  onSuccess?: (id: string) => void;
}) {
  const router = useRouter();

  const [pending, startTransition] = React.useTransition();
  const [selectedPartnerOptionId, setSelectedPartnerOptionId] = React.useState<string | null>(
    defaultSelectionId ?? null
  );
  const [partnerPickerOpen, setPartnerPickerOpen] = React.useState(false);

  const partnerOptions = React.useMemo(
    () =>
      partners.map((p) => ({
        id: p.id,
        label: p.nickname,
        color: p.color,
        partnerId: p.id,
        source: p.source ?? "local",
      })),
    [partners]
  );

  const selectedPartnerOption = React.useMemo(
    () => partnerOptions.find((o) => o.id === selectedPartnerOptionId) ?? null,
    [partnerOptions, selectedPartnerOptionId]
  );

  const [moodIndex, setMoodIndex] = React.useState<number | null>(null);
  const [rating, setRating] = React.useState<number | null>(null);

  const initialDuration = recordedDuration ?? 25;
  const initHours = clamp(Math.floor(initialDuration / 60), 0, 23);
  const initMinutes = clamp(initialDuration % 60, 0, 59);

  const [startTime, setStartTime] = React.useState<Date>(recordedStartTime ?? new Date());
  const [hours, setHours] = React.useState(initHours);
  const [minutes, setMinutes] = React.useState(initMinutes);
  const [seconds, setSeconds] = React.useState(0);

  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [showCustomTag, setShowCustomTag] = React.useState(false);
  const [customTag, setCustomTag] = React.useState("");

  const [locationPrecision, setLocationPrecision] = React.useState<"off" | "city" | "exact">(defaultLocationMode);
  const [locationLabel, setLocationLabel] = React.useState<string | null>(null);
  const [city, setCity] = React.useState<string | null>(null);
  const [country, setCountry] = React.useState<string | null>(null);
  const [latitude, setLatitude] = React.useState<number | null>(null);
  const [longitude, setLongitude] = React.useState<number | null>(null);

  const [notesExpanded, setNotesExpanded] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [shareNotesWithPartner, setShareNotesWithPartner] = React.useState(false);
  const [photos, setPhotos] = React.useState<PhotoFile[]>([]);
  const [timePickerExpanded, setTimePickerExpanded] = React.useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = React.useState<string | null>(null);

  const presetTags = React.useMemo(
    () => ["Home", "Travel", "Hotel", "Weekend", "Spontaneous", "Romantic", "Adventurous"],
    []
  );

  const allTagNames = React.useMemo(
    () => Array.from(new Set([...presetTags, ...tags.map((t) => t.name)])),
    [presetTags, tags]
  );

  React.useEffect(() => {
    const draft = readQuickLogLocationDraft();
    if (!draft) return;
    setLocationPrecision(draft.locationPrecision);
    setLocationLabel(draft.locationLabel);
    setCity(draft.city);
    setCountry(draft.country);
    setLatitude(draft.latitude);
    setLongitude(draft.longitude);
  }, []);

  React.useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    };
  }, [photos]);

  const adjustDuration = (field: "hours" | "minutes" | "seconds", delta: number) => {
    if (field === "hours") setHours((v) => clamp(v + delta, 0, 23));
    if (field === "minutes") setMinutes((v) => clamp(v + delta, 0, 59));
    if (field === "seconds") setSeconds((v) => clamp(v + delta, 0, 59));
  };

  const quickAdjust = (secondsToAdd: number) => {
    const total = Math.max(0, hours * 3600 + minutes * 60 + seconds + secondsToAdd);
    const hh = clamp(Math.floor(total / 3600), 0, 23);
    const rem = total % 3600;
    const mm = clamp(Math.floor(rem / 60), 0, 59);
    const ss = clamp(rem % 60, 0, 59);
    setHours(hh);
    setMinutes(mm);
    setSeconds(ss);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (!t) {
      setShowCustomTag(false);
      return;
    }
    setSelectedTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setCustomTag("");
    setShowCustomTag(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos: PhotoFile[] = files.map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      file,
      isPrivate: false,
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return prev.filter((p) => p.id !== id);
    });
    setPhotoMenuOpen(null);
  };

  const handleTogglePhotoPrivacy = (id: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isPrivate: !p.isPrivate } : p))
    );
    setPhotoMenuOpen(null);
  };

  const durationMinutes = Number(((hours * 3600 + minutes * 60 + seconds) / 60).toFixed(2));
  const locationEnabled = locationPrecision !== "off";

  const handleSave = () => {
    if (rating === null) return;

    const knownTagMap = new Map(tags.map((t) => [t.name.toLowerCase(), t.id]));
    const tagIds: string[] = [];
    const tagNames: string[] = [];

    for (const name of selectedTags) {
      const id = knownTagMap.get(name.toLowerCase());
      if (id) tagIds.push(id);
      else tagNames.push(name);
    }

    const payload: EncounterFormValues = {
      partnerId: selectedPartnerOption?.partnerId ?? null,
      startedAt: toIsoZ(formatDateForInput(startTime)),
      endedAt: null,
      durationMinutes,
      locationEnabled,
      locationPrecision,
      latitude: locationEnabled ? latitude : null,
      longitude: locationEnabled ? longitude : null,
      locationLabel: locationEnabled ? locationLabel : null,
      locationNotes: null,
      city: locationEnabled ? city : null,
      country: locationEnabled ? country : null,
      rating,
      mood: moodIndex ? MOOD_LABELS[moodIndex - 1] : null,
      notes: notes.trim() ? notes.trim() : null,
      tagIds,
      tagNames,
      shareNotesWithPartner,
    };

    startTransition(async () => {
      const res = await createEncounterAction(payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("已创建");
      if (onSuccess) onSuccess(res.id);
      else router.push(`/records/${res.id}/edit`);
    });
  };

  return (
    <div className="space-y-6 px-4 pb-4 pt-2">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">Partner</p>
          <button
            type="button"
            onClick={() => setPartnerPickerOpen(true)}
            className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-[12px] text-slate-300 transition-colors hover:bg-slate-700"
          >
            选择其他伴侣
          </button>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          {selectedPartnerOption ? (
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                style={{
                  background:
                    selectedPartnerOption.source === "local"
                      ? selectedPartnerOption.color || "#64748b"
                      : "linear-gradient(to bottom right, #f43f5e, #a855f7)",
                }}
              >
                <span className="text-[12px] font-light">
                  {selectedPartnerOption.label.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] text-slate-200">{selectedPartnerOption.label}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {selectedPartnerOption.source === "bound" ? "绑定伴侣" : "本地伴侣"}
                </div>
              </div>
              <div className="rounded-full bg-[#f43f5e]/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#f43f5e]">
                Default
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-slate-500">未选择伴侣（可继续保存记录）</div>
          )}
        </div>
      </div>

      {partnerPickerOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-2xl border border-slate-800 bg-[#0f172a] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <Users className="h-4 w-4" />
                <span className="text-[14px]">选择伴侣</span>
              </div>
              <button
                type="button"
                onClick={() => setPartnerPickerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedPartnerOptionId(null);
                  setPartnerPickerOpen(false);
                }}
                className={`w-full rounded-lg border px-3 py-2 text-left text-[13px] transition-colors ${
                  selectedPartnerOptionId === null
                    ? "border-[#f43f5e]/40 bg-[#f43f5e]/10 text-[#f43f5e]"
                    : "border-slate-700 bg-slate-900/60 text-slate-400 hover:bg-slate-800"
                }`}
              >
                未选择伴侣
              </button>

              {partnerOptions.map((option) => {
                const selected = selectedPartnerOptionId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setSelectedPartnerOptionId(option.id);
                      setPartnerPickerOpen(false);
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                      selected
                        ? "border-[#f43f5e]/40 bg-[#f43f5e]/10"
                        : "border-slate-700 bg-slate-900/60 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`truncate text-[13px] ${selected ? "text-[#f43f5e]" : "text-slate-200"}`}>
                          {option.label}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {option.source === "bound" ? "绑定伴侣" : "本地伴侣"}
                        </div>
                      </div>
                      {selected && <Crown className="h-4 w-4 text-[#f43f5e]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">Mood</p>
        <div className="flex justify-between gap-2">
          {MOOD_EMOJIS.map((emoji, idx) => {
            const selected = moodIndex === idx + 1;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => setMoodIndex(idx + 1)}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border text-[24px] transition-all ${
                  selected
                    ? "scale-110 border-[#f43f5e]/30 bg-[#f43f5e]/10"
                    : "border-transparent bg-slate-800/30 grayscale hover:bg-slate-800/50"
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">Timeline</p>
          <button
            type="button"
            onClick={() => setTimePickerExpanded(!timePickerExpanded)}
            className="flex items-center gap-1 text-[11px] text-[#f43f5e] hover:text-[#f43f5e]/80"
          >
            <Calendar size={12} />
            {startTime.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </button>
        </div>

        {timePickerExpanded && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] text-slate-500">Date</label>
              <Input
                type="date"
                value={formatDateForInput(startTime).split("T")[0]}
                onChange={(e) => {
                  const [datePart] = e.target.value.split("T");
                  const [_, timePart] = formatDateForInput(startTime).split("T");
                  setStartTime(new Date(`${datePart}T${timePart}`));
                }}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] text-slate-500">Time</label>
              <Input
                type="time"
                value={formatDateForInput(startTime).split("T")[1]?.slice(0, 5) || "00:00"}
                onChange={(e) => {
                  const [datePart] = formatDateForInput(startTime).split("T");
                  setStartTime(new Date(`${datePart}T${e.target.value}:00`));
                }}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
            <button
              type="button"
              onClick={() => setTimePickerExpanded(false)}
              className="w-full rounded-lg bg-[#f43f5e] py-2 text-[12px] text-white hover:bg-[#f43f5e]/90"
            >
              Confirm
            </button>
          </div>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="mb-3 text-[11px] text-slate-500">Duration</p>
          <Picker
            value={{ hours, minutes, seconds }}
            onChange={(newValue) => {
              setHours(newValue.hours);
              setMinutes(newValue.minutes);
              setSeconds(newValue.seconds);
            }}
            height={180}
            wheelMode="natural"
            className="flex justify-center gap-4"
          >
            <Picker.Column name="hours">
              {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                <Picker.Item key={hour} value={hour}>
                  {({ selected }) => (
                    <div
                      className={`text-center font-mono text-[20px] ${
                        selected ? "text-[#f43f5e] font-semibold" : "text-slate-400"
                      }`}
                    >
                      {String(hour).padStart(2, "0")}
                    </div>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
            <Picker.Column name="minutes">
              {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                <Picker.Item key={minute} value={minute}>
                  {({ selected }) => (
                    <div
                      className={`text-center font-mono text-[20px] ${
                        selected ? "text-[#f43f5e] font-semibold" : "text-slate-400"
                      }`}
                    >
                      {String(minute).padStart(2, "0")}
                    </div>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
            <Picker.Column name="seconds">
              {Array.from({ length: 60 }, (_, i) => i).map((second) => (
                <Picker.Item key={second} value={second}>
                  {({ selected }) => (
                    <div
                      className={`text-center font-mono text-[20px] ${
                        selected ? "text-[#f43f5e] font-semibold" : "text-slate-400"
                      }`}
                    >
                      {String(second).padStart(2, "0")}
                    </div>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
          </Picker>

          <div className="mt-3 flex justify-center gap-2">
            {[
              { label: "+30s", value: 30 },
              { label: "+1m", value: 60 },
              { label: "+5m", value: 300 },
            ].map((quick) => (
              <button
                key={quick.label}
                type="button"
                onClick={() => quickAdjust(quick.value)}
                className="rounded px-3 py-1 text-[10px] text-slate-500 transition-colors hover:bg-[#f43f5e]/5 hover:text-[#f43f5e]"
              >
                {quick.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">Rating</p>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((star) => {
            const selected = rating === star;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`h-12 rounded-xl border transition-all ${
                  selected
                    ? "scale-105 border-transparent bg-gradient-to-br from-[#f43f5e] to-purple-500 text-white"
                    : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"
                }`}
              >
                <span className="text-[16px] font-light">{star}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">Tags</p>
        <div className="flex flex-wrap gap-2">
          {allTagNames.map((tag) => {
            const selected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1.5 text-[12px] transition-all ${
                  selected
                    ? "border-[#f43f5e]/30 bg-[#f43f5e]/10 text-[#f43f5e]"
                    : "border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600"
                }`}
              >
                {tag}
              </button>
            );
          })}

          {!showCustomTag ? (
            <button
              type="button"
              onClick={() => setShowCustomTag(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800/30 text-slate-400 transition-colors hover:border-slate-600"
            >
              <Plus size={14} strokeWidth={1.5} />
            </button>
          ) : (
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addCustomTag();
                if (e.key === "Escape") {
                  setShowCustomTag(false);
                  setCustomTag("");
                }
              }}
              onBlur={addCustomTag}
              placeholder="Custom tag..."
              className="rounded-full border border-[#f43f5e] bg-slate-800 px-3 py-1.5 text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none"
              autoFocus
            />
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setQuickLogReopenFlag();
          onClose();
          router.push("/location-picker?returnTo=quick-log");
        }}
        className="group flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-left transition-colors hover:border-slate-700"
      >
        <MapPin size={18} className="text-slate-500 transition-colors group-hover:text-[#f43f5e]" strokeWidth={1.5} />
        <div className="flex-1">
          <p className="text-[13px] font-light text-slate-400">Location</p>
          <p className="mt-0.5 text-[14px] text-slate-200">{locationLabel || city || "未设置"}</p>
        </div>
        <div className="text-[11px] text-slate-600">Tap to set</div>
      </button>

      <div className="space-y-3">
        <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">Photos</p>
        <div className="space-y-3">
          <input
            type="file"
            id="photo-upload"
            multiple
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <label
            htmlFor="photo-upload"
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-slate-400 transition-colors hover:border-[#f43f5e] hover:text-[#f43f5e] cursor-pointer"
          >
            <ImageIcon size={16} />
            <span className="text-[12px]">Upload Photos</span>
          </label>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square group">
                  <img
                    src={photo.url}
                    alt="Upload"
                    className="h-full w-full rounded-lg object-cover"
                  />
                  {photo.isPrivate && (
                    <div className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60">
                      <Lock size={10} className="text-white" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoMenuOpen(photoMenuOpen === photo.id ? null : photo.id);
                    }}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <MoreVertical size={12} />
                  </button>
                  {photoMenuOpen === photo.id && (
                    <div className="absolute right-1 top-8 z-10 w-32 rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
                      <button
                        type="button"
                        onClick={() => handleTogglePhotoPrivacy(photo.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-slate-300 hover:bg-slate-800"
                      >
                        <Lock size={12} />
                        {photo.isPrivate ? "Make Public" : "Make Private"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-red-400 hover:bg-slate-800"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <button
          type="button"
          onClick={() => setNotesExpanded((v) => !v)}
          className="flex w-full items-center gap-3 p-4 transition-colors hover:bg-slate-800/30"
        >
          <Lock size={18} className="text-slate-500" strokeWidth={1.5} />
          <div className="flex-1 text-left">
            <p className="text-[13px] font-light text-slate-400">Private Notes</p>
            {!notesExpanded && notes ? <p className="mt-0.5 truncate text-[12px] text-slate-600">{notes}</p> : null}
          </div>
          {notesExpanded ? (
            <ChevronUp size={16} className="text-slate-500" strokeWidth={1.5} />
          ) : (
            <ChevronDown size={16} className="text-slate-500" strokeWidth={1.5} />
          )}
        </button>

        {notesExpanded ? (
          <div className="px-4 pb-4 space-y-3">
            {selectedPartnerOption && (
              <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                <span className="text-[11px] text-slate-400">
                  Allow {selectedPartnerOption.label} to view & edit
                </span>
                <Switch
                  checked={shareNotesWithPartner}
                  onCheckedChange={setShareNotesWithPartner}
                />
              </div>
            )}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Encrypted notes (AES-256)..."
              rows={4}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-[13px] font-light text-slate-300 placeholder:text-slate-600 transition-colors focus:border-[#f43f5e] focus:outline-none"
            />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 pb-2">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-lg bg-slate-800 py-3 text-[14px] font-light text-slate-300 transition-colors hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={rating === null || pending}
          className="rounded-lg bg-[#f43f5e] py-3 text-[14px] font-light text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-colors hover:bg-[#f43f5e]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save Encounter"}
        </button>
      </div>
    </div>
  );
}
