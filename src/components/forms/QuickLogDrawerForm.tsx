"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  MapPin,
  Navigation,
  Plus,
  X,
} from "lucide-react";

import type { Partner, Tag } from "@/features/records/types";
import { createEncounterAction } from "@/features/records/actions";
import type { EncounterFormValues } from "@/lib/validators/encounter";
import { Input } from "@/components/ui/input";
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
  defaultPartnerId,
  defaultLocationMode,
  recordedDuration,
  recordedStartTime,
  onClose,
  onSuccess,
}: {
  partners: Partner[];
  tags: Tag[];
  defaultPartnerId?: string;
  defaultLocationMode: "off" | "city" | "exact";
  recordedDuration?: number | null;
  recordedStartTime?: Date | null;
  onClose: () => void;
  onSuccess?: (id: string) => void;
}) {
  const router = useRouter();

  const [pending, startTransition] = React.useTransition();
  const [selectedPartner, setSelectedPartner] = React.useState<string | null>(defaultPartnerId ?? null);

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

  const durationMinutes = Number(((hours * 3600 + minutes * 60 + seconds) / 60).toFixed(2));
  const locationEnabled = locationPrecision !== "off";

  const handleSave = () => {
    if (!selectedPartner || rating === null) return;

    const knownTagMap = new Map(tags.map((t) => [t.name.toLowerCase(), t.id]));
    const tagIds: string[] = [];
    const tagNames: string[] = [];

    for (const name of selectedTags) {
      const id = knownTagMap.get(name.toLowerCase());
      if (id) tagIds.push(id);
      else tagNames.push(name);
    }

    const payload: EncounterFormValues = {
      partnerId: selectedPartner,
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
        <p className="text-[11px] font-light uppercase tracking-wider text-slate-400">Partner</p>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {partners.map((partner) => {
            const selected = selectedPartner === partner.id;
            return (
              <button
                key={partner.id}
                type="button"
                onClick={() => setSelectedPartner(partner.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 transition-all ${
                  selected
                    ? "border-[#f43f5e] bg-[#f43f5e]/10 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                    : "border-slate-700 hover:border-slate-600"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    selected ? "bg-gradient-to-br from-[#f43f5e] to-purple-500" : "bg-slate-700"
                  }`}
                >
                  <span className="text-[12px] font-light text-white">
                    {partner.nickname.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <span className={`text-[13px] ${selected ? "text-[#f43f5e]" : "text-slate-400"}`}>{partner.nickname}</span>
              </button>
            );
          })}
        </div>
      </div>

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
          <button type="button" className="text-[11px] text-[#f43f5e] hover:text-[#f43f5e]/80">
            {startTime.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="mb-3 text-[11px] text-slate-500">Duration</p>
          <div className="flex items-center justify-center gap-1">
            {([
              ["hours", hours, setHours],
              ["minutes", minutes, setMinutes],
              ["seconds", seconds, setSeconds],
            ] as const).map(([field, val, setter], i) => (
              <React.Fragment key={field}>
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => adjustDuration(field as "hours" | "minutes" | "seconds", 1)}
                    className="flex h-6 w-6 items-center justify-center text-slate-500 hover:text-slate-300"
                  >
                    <ChevronUp size={14} strokeWidth={1.5} />
                  </button>
                  <input
                    type="text"
                    value={String(val).padStart(2, "0")}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                      const num = clamp(Number(digits || 0), 0, field === "hours" ? 23 : 59);
                      setter(num);
                    }}
                    className="h-12 w-12 rounded-lg border border-slate-700 bg-slate-800 text-center font-mono text-[20px] text-slate-200 transition-colors focus:border-[#f43f5e] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustDuration(field as "hours" | "minutes" | "seconds", -1)}
                    className="flex h-6 w-6 items-center justify-center text-slate-500 hover:text-slate-300"
                  >
                    <ChevronDown size={14} strokeWidth={1.5} />
                  </button>
                </div>
                {i < 2 ? <span className="pb-6 font-mono text-[20px] text-slate-600">:</span> : null}
              </React.Fragment>
            ))}
          </div>

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
          <div className="px-4 pb-4">
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
          disabled={!selectedPartner || rating === null || pending}
          className="rounded-lg bg-[#f43f5e] py-3 text-[14px] font-light text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-colors hover:bg-[#f43f5e]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save Encounter"}
        </button>
      </div>
    </div>
  );
}
