"use client";



import * as React from "react";

import { useRouter, usePathname } from "next/navigation";

import { toast } from "sonner";

import { useTranslations, useLocale } from "next-intl";

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

  Bookmark,

  Plus,

  Trash2,

  Users,

  X,

} from "lucide-react";

import Picker from "react-mobile-picker";



import type { Partner, Tag } from "@/features/records/types";
import { formatDateInTimezone } from "@/lib/utils/formatDateInTimezone";

import { createEncounterAction, updateEncounterAction } from "@/features/records/actions";

import type { EncounterFormValues } from "@/lib/validators/encounter";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { createSavedAddressAction } from "@/features/addresses/actions";
import type { SavedAddress } from "@/features/addresses/types";

import { Input } from "@/components/ui/input";

import { Switch } from "@/components/ui/switch";

import {

  clearQuickLogLocationDraft,

  hasQuickLogReopenFlag,

  readQuickLogLocationDraft,

  setQuickLogReopenFlag,

  writeQuickLogLocationDraft,

  type QuickLogLocationDraft,

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

  initialData,

  encounterId,

  encounterTimezone,

  onClose,

  onSuccess,

}: {
  partners: Partner[];

  tags: Tag[];

  defaultSelectionId?: string;

  defaultLocationMode: "off" | "city" | "exact";

  recordedDuration?: number | null;

  recordedStartTime?: Date | null;

  initialData?: {
    moodIndex?: number | null;
    rating?: number | null;
    selectedTags?: string[];
    notes?: string;
    photos?: Array<{ url: string; isPrivate: boolean }>;
    shareNotesWithPartner?: boolean;
    locationLabel?: string | null;
    city?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };

  encounterId?: string;

  encounterTimezone?: string | null;

  onClose: () => void;

  onSuccess?: (id: string) => void;

}) {

  const router = useRouter();
  const pathname = usePathname();

  const locale = useLocale();
  const t = useTranslations("encounter");



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

        avatarUrl: p.avatar_url,

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

  const initTotalSeconds = Math.max(0, Math.round(initialDuration * 60));

  const initHours = clamp(Math.floor(initTotalSeconds / 3600), 0, 23);

  const initMinutes = clamp(Math.floor((initTotalSeconds % 3600) / 60), 0, 59);

  const initSeconds = clamp(initTotalSeconds % 60, 0, 59);



  const [startTime, setStartTime] = React.useState<Date>(recordedStartTime ?? new Date());

  const [hours, setHours] = React.useState(initHours);

  const [minutes, setMinutes] = React.useState(initMinutes);

  const [seconds, setSeconds] = React.useState(initSeconds);



  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);

  const [showCustomTag, setShowCustomTag] = React.useState(false);

  const [customTag, setCustomTag] = React.useState("");



  const [locationPrecision, setLocationPrecision] = React.useState<"off" | "city" | "exact">(defaultLocationMode);

  const [locationLabel, setLocationLabel] = React.useState<string | null>(null);

  const [city, setCity] = React.useState<string | null>(null);

  const [country, setCountry] = React.useState<string | null>(null);

  const [latitude, setLatitude] = React.useState<number | null>(null);

  const [longitude, setLongitude] = React.useState<number | null>(null);

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

  const [notesExpanded, setNotesExpanded] = React.useState(false);

  const [notes, setNotes] = React.useState("");

  const [shareNotesWithPartner, setShareNotesWithPartner] = React.useState(false);

  const [photos, setPhotos] = React.useState<PhotoFile[]>([]);

  const [timePickerExpanded, setTimePickerExpanded] = React.useState(false);

  const [photoMenuOpen, setPhotoMenuOpen] = React.useState<string | null>(null);



  const presetTags = React.useMemo(

    () => [t("presetTagHome"), t("presetTagTravel"), t("presetTagHotel"), t("presetTagWeekend"), t("presetTagSpontaneous"), t("presetTagRomantic"), t("presetTagAdventurous")],

    [t]

  );



  const allTagNames = React.useMemo(

    () => Array.from(new Set([...presetTags, ...tags.map((t) => t.name)])),

    [presetTags, tags]

  );



  // Populate form with initial data on mount (edit mode from EncounterDetailDrawer)
  // Must run BEFORE draft restoration so draft data (location picker return) overrides initialData.
  React.useEffect(() => {
    if (!initialData) return;
    if (initialData.moodIndex != null && initialData.moodIndex >= 1 && initialData.moodIndex <= 5) setMoodIndex(initialData.moodIndex);
    if (initialData.rating != null) setRating(initialData.rating);
    if (initialData.selectedTags && initialData.selectedTags.length > 0) setSelectedTags(initialData.selectedTags);
    if (initialData.notes) setNotes(initialData.notes);
    if (initialData.shareNotesWithPartner) setShareNotesWithPartner(initialData.shareNotesWithPartner);
    if (initialData.photos && initialData.photos.length > 0) {
      const restoredPhotos: PhotoFile[] = initialData.photos.map((p, idx) => ({
        id: `existing-${idx}`,
        url: p.url,
        file: new File([], 'existing-photo.jpg'),
        isPrivate: p.isPrivate,
      }));
      setPhotos(restoredPhotos);
    }
    if (initialData.locationLabel != null) setLocationLabel(initialData.locationLabel);
    if (initialData.city != null) setCity(initialData.city);
    if (initialData.country != null) setCountry(initialData.country);
    if (initialData.latitude != null) setLatitude(initialData.latitude);
    if (initialData.longitude != null) setLongitude(initialData.longitude);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore form state after returning from location picker (runs after initialData so draft takes precedence)
  // Always restore from draft if it exists - the page component consumed the flag to open the drawer
  React.useEffect(() => {

    const draft = readQuickLogLocationDraft();
    if (!draft) return;

    if (!draft) return;

    setLocationPrecision(draft.locationPrecision);

    setLocationLabel(draft.locationLabel);

    setCity(draft.city);

    setCountry(draft.country);

    setLatitude(draft.latitude);

    setLongitude(draft.longitude);

    // Restore form state

    if (draft.partnerId) setSelectedPartnerOptionId(draft.partnerId);

    if (draft.moodIndex !== null) setMoodIndex(draft.moodIndex);

    if (draft.rating !== null) setRating(draft.rating);

    if (draft.startTime) setStartTime(new Date(draft.startTime));

    if (draft.hours > 0 || draft.minutes > 0 || draft.seconds > 0) {

      setHours(draft.hours);

      setMinutes(draft.minutes);

      setSeconds(draft.seconds);

    }

    if (draft.selectedTags.length > 0) setSelectedTags(draft.selectedTags);

    if (draft.notes) setNotes(draft.notes);

    if (draft.shareNotesWithPartner) setShareNotesWithPartner(draft.shareNotesWithPartner);

    // Restore pre-uploaded photos

    if (draft.uploadedPhotos.length > 0) {

      const restoredPhotos: PhotoFile[] = draft.uploadedPhotos.map((up, idx) => ({

        id: `pre-uploaded-${idx}`,

        url: up.url,

        file: new File([], 'pre-uploaded.jpg'), // Dummy file since already uploaded

        isPrivate: up.isPrivate,

      }));

      setPhotos(restoredPhotos);

    }

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

    const maxSize = 10 * 1024 * 1024; // 10MB

    const oversized = files.filter((f) => f.size > maxSize);

    if (oversized.length > 0) {

      toast.error(t("errorFileSizeLimit", { count: oversized.length }));

      return;

    }

    if (photos.length + files.length > 10) {

      toast.error(t("errorPhotoLimit"));

      return;

    }

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

  const saveAlias = async (alias: string) => {
    if (!alias.trim() || latitude === null || longitude === null) return;
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



    startTransition(async () => {

      // Upload photos client-side first

      const uploadedPhotos: { url: string; isPrivate: boolean }[] = [];

      if (photos.length > 0) {

        const supabase = createSupabaseBrowserClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {

          toast.error(t("errorNotLoggedIn"));

          return;

        }

        for (const photo of photos) {

          // Skip uploading if it's already a pre-uploaded dummy file from draft restoration or edit mode
          if (photo.file.size === 0 && (photo.file.name === 'pre-uploaded.jpg' || photo.file.name === 'existing-photo.jpg')) {
            uploadedPhotos.push({ url: photo.url, isPrivate: photo.isPrivate });
            continue;
          }

          const fileExt = photo.file.name.split('.').pop();

          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

          const filePath = `${user.id}/temp/${fileName}`;

          const { error: uploadError } = await supabase.storage

            .from('encounter-photos')

            .upload(filePath, photo.file, {

              contentType: photo.file.type || 'image/jpeg',

            });

          if (uploadError) {

            toast.error(t("errorPhotoUploadFailed", { error: uploadError.message }));

            return;

          }

          const { data: { publicUrl } } = supabase.storage

            .from('encounter-photos')

            .getPublicUrl(filePath);

          uploadedPhotos.push({ url: publicUrl, isPrivate: photo.isPrivate });

        }

      }



      const payload: EncounterFormValues = {

        partnerId: selectedPartnerOption?.partnerId ?? "",

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

        mood: moodIndex ? [t("moodVerySad"), t("ratingNeutral"), t("moodHappy"), t("moodVeryHappy"), t("moodLove")][moodIndex - 1] : null,

        notes: notes.trim() ? notes.trim() : null,

        tagIds,

        tagNames,

        shareNotesWithPartner,

        photos: uploadedPhotos,

      };



      if (encounterId) {
        const res = await updateEncounterAction(encounterId, payload);

        if (!res.ok) {

          toast.error(res.error);

          return;

        }

        toast.success(t("updateSuccess"));

        if (onSuccess) onSuccess(encounterId);
      } else {
        const res = await createEncounterAction(payload);

        if (!res.ok) {

          toast.error(res.error);

          return;

        }

        toast.success(t("createSuccess"));

        if (onSuccess) onSuccess(res.id);

        else router.push(`/records/${res.id}/edit`);
      }

    });

  };



  return (

    <div className="space-y-6 px-4 pb-4 pt-2">

      <div className="space-y-3">

        <div className="flex items-center justify-between gap-3">

          <p className="text-[11px] font-light uppercase tracking-wider text-muted">{t("partner")}</p>

          <button

            type="button"

            onClick={() => setPartnerPickerOpen(true)}

            className="rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-[12px] text-content transition-colors hover:bg-surface"

          >

            {t("selectOtherPartner")}

          </button>

        </div>

        <div className="rounded-xl border border-border bg-surface/60 p-3">

          {selectedPartnerOption ? (

            <div className="flex items-center gap-3">

              {selectedPartnerOption.avatarUrl ? (
                <img
                  src={selectedPartnerOption.avatarUrl}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                  style={{
                    background:
                      selectedPartnerOption.source === "local"
                        ? selectedPartnerOption.color || "#64748b"
                        : "var(--color-primary-gradient)",
                  }}
                >
                  <span className="text-[12px] font-light">
                    {selectedPartnerOption.label.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}

              <div className="min-w-0 flex-1">

                <div className="truncate text-[14px] text-content">{selectedPartnerOption.label}</div>

                <div className="mt-0.5 text-[11px] text-muted">
                  {selectedPartnerOption.source === "bound" ? t("boundPartner") : t("localPartner")}
                </div>
              </div>
              <div className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                {t("default")}
              </div>
            </div>

          ) : (

            <div className="text-[13px] text-muted">{t("noPartnerSelected")}</div>

          )}

        </div>

      </div>



      {partnerPickerOpen && (

        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-t-2xl border border-border bg-surface p-4">

            <div className="mb-3 flex items-center justify-between">

              <div className="flex items-center gap-2 text-content">

                <Users className="h-4 w-4" />

                <span className="text-[14px]">{t("selectPartnerTitle")}</span>

              </div>

              <button

                type="button"

                onClick={() => setPartnerPickerOpen(false)}

                className="rounded-lg p-1.5 text-muted hover:bg-surface"

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
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-surface/60 text-muted hover:bg-surface"
                }`}

              >

                {t("noPartnerSelected")}

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
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-surface/60 hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {option.avatarUrl ? (
                        <img src={option.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                          style={{
                            background: option.color || "#64748b",
                          }}
                        >
                          <span className="text-[10px] font-light">
                            {option.label.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-[13px] ${selected ? "text-primary" : "text-content"}`}>
                          {option.label}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted">
                          {option.source === "bound" ? t("boundPartner") : t("localPartner")}
                        </div>
                      </div>
                      {selected && <Crown className="h-4 w-4 shrink-0 text-primary" />}
                    </div>

                  </button>

                );

              })}

            </div>

          </div>

        </div>

      )}



      <div className="space-y-3">

        <p className="text-[11px] font-light uppercase tracking-wider text-muted">{t("mood")}</p>

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
                    ? "scale-110 border-primary/40 bg-primary/10"
                    : "border-transparent bg-surface/30 grayscale hover:bg-surface/50"
                }`}

              >

                {emoji}

              </button>

            );

          })}

        </div>

      </div>



      <div className="space-y-3">

        <button
          type="button"
          onClick={() => setTimePickerExpanded(!timePickerExpanded)}
          className="flex w-full min-h-[48px] cursor-pointer items-center justify-between rounded-lg px-4 text-left transition-colors hover:bg-surface/40 active:bg-surface/60"
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{t("date")}</span>
          <span className="flex items-center gap-2 text-primary">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-sm font-semibold">
              {encounterTimezone
                ? formatDateInTimezone(startTime, "MMM d, yyyy", encounterTimezone, locale).replace(/,?\s*\d{4}/, "") + " " + formatDateInTimezone(startTime, "h:mm a", encounterTimezone, locale)
                : startTime.toLocaleString(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </span>
          </span>
        </button>

        <hr className="border-border/40" />

        {timePickerExpanded && (

          <div className="rounded-xl border border-border bg-surface p-4 space-y-4">

            <div className="space-y-2">

              <label className="cursor-pointer text-[13px] font-medium text-content">{t("date")}</label>

              <Input

                type="date"

                value={formatDateForInput(startTime).split("T")[0]}

                onChange={(e) => {

                  const [datePart] = e.target.value.split("T");

                  const [_, timePart] = formatDateForInput(startTime).split("T");

                  setStartTime(new Date(`${datePart}T${timePart}`));

                }}

                className="h-14 cursor-pointer px-4 text-[16px] bg-surface border-border text-content"

              />

            </div>

            <div className="space-y-2">

              <label className="cursor-pointer text-[13px] font-medium text-content">{t("time")}</label>

              <Input

                type="time"

                value={formatDateForInput(startTime).split("T")[1]?.slice(0, 5) || "00:00"}

                onChange={(e) => {

                  const [datePart] = formatDateForInput(startTime).split("T");

                  setStartTime(new Date(`${datePart}T${e.target.value}:00`));

                }}

                className="h-14 cursor-pointer px-4 text-[16px] bg-surface border-border text-content"

              />

            </div>

            <button
              type="button"
              onClick={() => setTimePickerExpanded(false)}
              className="w-full rounded-lg bg-primary py-2 text-[12px] text-white hover:bg-primary/90"
            >

              {t("confirm")}

            </button>

          </div>

        )}



        <div className="rounded-xl border border-border bg-surface p-4">

          <p className="mb-3 text-[11px] text-muted">{t("duration")}</p>

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
                        selected ? "text-primary font-semibold" : "text-muted"
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
                        selected ? "text-primary font-semibold" : "text-muted"
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
                        selected ? "text-primary font-semibold" : "text-muted"
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

              { label: t("quickAdjust30s"), value: 30 },

              { label: t("quickAdjust1m"), value: 60 },

              { label: t("quickAdjust5m"), value: 300 },

            ].map((quick) => (

              <button

                key={quick.label}

                type="button"

                onClick={() => quickAdjust(quick.value)}

                className="rounded px-3 py-1 text-[10px] text-muted transition-colors hover:bg-primary/5 hover:text-primary"
              >
                {quick.label}
              </button>

            ))}

          </div>

        </div>

      </div>



      <div className="space-y-3">

        <p className="text-[11px] font-light uppercase tracking-wider text-muted">{t("rating")}</p>

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
                    ? "scale-105 border-transparent bg-gradient-to-br from-primary to-purple-500 text-white"
                    : "border-border bg-surface text-muted hover:border-border"
                }`}
              >
                <span className="text-[16px] font-light">{star}</span>
              </button>

            );

          })}

        </div>

      </div>



      <div className="space-y-3">

        <p className="text-[11px] font-light uppercase tracking-wider text-muted">{t("tags")}</p>

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
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-surface/30 text-muted hover:border-border"
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

              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface/30 text-muted transition-colors hover:border-border"

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

              placeholder={t("customTagPlaceholder")}
              className="rounded-full border border-primary bg-surface px-3 py-1.5 text-[12px] text-content placeholder:text-muted focus:outline-none"
              autoFocus
            />

          )}

        </div>

      </div>

      <button
        type="button"
        onClick={async () => {
          // Upload photos before navigating to location picker
          let uploadedPhotos: { url: string; isPrivate: boolean }[] = [];
          
          if (photos.length > 0) {
            const supabase = createSupabaseBrowserClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
              toast.error(t("errorNotLoggedIn"));
              return;
            }
            
            for (const photo of photos) {
              // Skip uploading if it's already a pre-uploaded dummy file from draft restoration or edit mode
              if (photo.file.size === 0 && (photo.file.name === 'pre-uploaded.jpg' || photo.file.name === 'existing-photo.jpg')) {
                uploadedPhotos.push({ url: photo.url, isPrivate: photo.isPrivate });
                continue;
              }
              
              const fileExt = photo.file.name.split('.').pop() || 'jpg';
              const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
              const filePath = `${user.id}/temp/${fileName}`;

              const { error: uploadError } = await supabase.storage
                .from('encounter-photos')
                .upload(filePath, photo.file, {
                  contentType: photo.file.type || 'image/jpeg',
                });

              if (uploadError) {
                toast.error(t("errorPhotoUploadFailed", { error: uploadError.message }));
                return; // Stop navigation if upload fails
              }

              const { data: { publicUrl } } = supabase.storage
                .from('encounter-photos')
                .getPublicUrl(filePath);

              uploadedPhotos.push({ url: publicUrl, isPrivate: photo.isPrivate });
            }
          }

          writeQuickLogLocationDraft({
            latitude,
            longitude,
            locationLabel,
            city,
            country,
            locationPrecision,
            updatedAt: Date.now(),
            partnerId: selectedPartnerOptionId,
            moodIndex,
            rating,
            startTime: startTime.toISOString(),
            hours,
            minutes,
            seconds,
            selectedTags,
            notes,
            shareNotesWithPartner,
            uploadedPhotos,
            encounterId: encounterId ?? undefined,
          });

          router.push("/location-picker?returnTo=quick-log");
        }}
        className="group flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-border"
      >
        <MapPin size={18} className="text-muted transition-colors group-hover:text-primary" strokeWidth={1.5} />
        <div className="flex-1">
          <p className="text-[13px] font-light text-muted">{t("location")}</p>

          <p className="mt-0.5 text-[14px] text-content">{locationLabel || city || t("locationNotSet")}</p>

        </div>

        <div className="text-[11px] text-muted">{t("tapToSet")}</div>

      </button>

      {savedAddresses.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-light uppercase tracking-wider text-muted">{t("savedAddresses")}</p>
          <div className="flex flex-wrap gap-1.5">
            {savedAddresses.slice(0, 5).map((addr) => {
              const isSelected =
                typeof latitude === "number" &&
                typeof longitude === "number" &&
                Math.abs(latitude - addr.latitude) < 0.0001 &&
                Math.abs(longitude - addr.longitude) < 0.0001;
              return (
                <button
                  key={addr.id}
                  type="button"
                  onClick={() => {
                    setLatitude(addr.latitude);
                    setLongitude(addr.longitude);
                    setLocationPrecision(addr.locationPrecision === "city" ? "city" : "exact");
                    setLocationLabel(addr.locationLabel);
                    setCity(addr.city);
                    setCountry(addr.country);
                    toast.success(`${t("locationSelected")}: ${addr.alias}`);
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
        </div>
      )}

      {typeof latitude === "number" && typeof longitude === "number" ? (
        showAliasInput ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder={t("aliasPlaceholder")}
              className="flex-1 rounded-xl border border-border bg-surface/50 px-3 py-2.5 text-[13px] text-content placeholder:text-muted focus:border-primary focus:outline-none"
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
              className="rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] disabled:opacity-50"
            >
              {t("saveToAddresses")}
            </button>
            <button
              type="button"
              onClick={() => setShowAliasInput(false)}
              className="rounded-xl bg-surface p-2.5 text-muted hover:text-content"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAliasInput("");
              setShowAliasInput(true);
            }}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-surface p-3 text-[13px] text-muted transition-colors hover:border-border hover:text-content"
          >
            <Bookmark size={14} strokeWidth={1.5} />
            {t("saveToAddresses")}
          </button>
        )
      ) : null}

      <div className="space-y-3">

        <p className="text-[11px] font-light uppercase tracking-wider text-muted">{t("photos")}</p>

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
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface/50 p-4 text-muted transition-colors hover:border-primary hover:text-primary cursor-pointer"
          >
            <ImageIcon size={16} />
            <span className="text-[12px]">{t("uploadPhotos")}</span>
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

                    <div className="absolute right-1 top-8 z-10 w-32 rounded-lg border border-border bg-surface shadow-lg">

                      <button

                        type="button"

                        onClick={() => handleTogglePhotoPrivacy(photo.id)}

                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-content hover:bg-surface"

                      >

                        <Lock size={12} />

                        {photo.isPrivate ? t("makePublic") : t("makePrivate")}

                      </button>

                      <button

                        type="button"

                        onClick={() => handleDeletePhoto(photo.id)}

                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-destructive hover:bg-surface"

                      >

                        <Trash2 size={12} />

                        {t("delete")}

                      </button>

                    </div>

                  )}

                </div>

              ))}

            </div>

          )}

        </div>

      </div>



      <div className="overflow-hidden rounded-xl border border-border bg-surface">

        <button

          type="button"

          onClick={() => setNotesExpanded((v) => !v)}

          className="flex w-full items-center gap-3 p-4 transition-colors hover:bg-surface/30"

        >

          <Lock size={18} className="text-muted" strokeWidth={1.5} />

          <div className="flex-1 text-left">

            <p className="text-[13px] font-light text-muted">{t("privateNotes")}</p>

            {!notesExpanded && notes ? <p className="mt-0.5 truncate text-[12px] text-muted">{notes}</p> : null}

          </div>

          {notesExpanded ? (

            <ChevronUp size={16} className="text-muted" strokeWidth={1.5} />

          ) : (

            <ChevronDown size={16} className="text-muted" strokeWidth={1.5} />

          )}

        </button>



        {notesExpanded ? (

          <div className="px-4 pb-4 space-y-3">

            {selectedPartnerOption && (

              <div className="flex items-center justify-between rounded-lg bg-surface/50 px-3 py-2">

                <span className="text-[11px] text-muted">

                  {t("allowPartnerView", { name: selectedPartnerOption.label })}

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
              placeholder={t("encryptedNotesPlaceholder")}
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-surface/50 p-3 text-[13px] font-light text-content placeholder:text-muted transition-colors focus:border-primary focus:outline-none"
            />
          </div>
        ) : null}
      </div>



      <div className="grid grid-cols-2 gap-3 pb-2">

        <button

          type="button"

          onClick={onClose}

          disabled={pending}

          className="rounded-lg bg-surface py-3 text-[14px] font-light text-content transition-colors hover:bg-surface"

        >

          {t("cancel")}

        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={rating === null || pending}
          className="rounded-lg bg-primary py-3 text-[14px] font-light text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t("saving") : t("saveEncounter")}
        </button>

      </div>

    </div>

  );

}

