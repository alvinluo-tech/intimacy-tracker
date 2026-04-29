"use client";

import { useTranslations, useLocale } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast } from "sonner";
import {
  Archive,
  ArrowLeft,
  Calendar,
  Clock,
  Edit2,
  Heart,
  Image as ImageIcon,
  MapPin,
  Share2,
  Star,
  Tag,
  TrendingUp,
  UserX,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ImageViewer } from "@/components/ui/ImageViewer";
import { AvatarViewer } from "@/components/ui/AvatarViewer";
import { formatDateInTimezone } from "@/lib/utils/formatDateInTimezone";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/StarRating";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { EncounterDetailDrawer } from "@/components/forms/EncounterDetailDrawer";
import { hasQuickLogReopenFlag, readQuickLogLocationDraft } from "@/lib/utils/quicklog-location-draft";
import { formatDuration } from "@/lib/utils/formatDuration";
import {
  archivePartnerAction,
  createPartnerMemoryItemAction,
  deletePartnerAction,
  savePartnerPhotoAction,
  setDefaultPartnerAction,
  updatePartnerAction,
} from "@/features/partners/actions";
import { unbindPartner } from "@/features/partner-binding/actions";
import type {
  PartnerManageItem,
  PartnerMemoryItem,
  PartnerStats,
} from "@/features/partners/queries";
import type { EncounterListItem } from "@/features/records/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { compressImage } from "@/lib/utils/compressImage";

type ActiveTab = "statistics" | "footprints" | "memories" | "sync";

type SyncSettings = {
  enabled: boolean;
  shareLocation: boolean;
  shareRatings: boolean;
  shareNotes: boolean;
  shareTags: boolean;
  sharePhotos: boolean;
};

type Milestone = {
  id: number;
  title: string;
  date: string;
  type: "anniversary" | "milestone" | "memory";
  note?: string | null;
  isManual?: boolean;
  sortAt?: string;
};

type SharedLocation = {
  lat: number;
  lng: number;
  count: number;
};

function roundByPrecision(value: number, precision: "off" | "city" | "exact" | null) {
  if (precision === "exact") return Number(value.toFixed(6));
  if (precision === "city") return Number(value.toFixed(2));
  return Number(value.toFixed(3));
}



export function PartnerDetailView({
  partner,
  stats,
  encounters,
  photoUrls,
  isBound = false,
  boundUserId,
  manualItems,
  partners,
  tags,
}: {
  partner: PartnerManageItem;
  stats: PartnerStats;
  encounters: EncounterListItem[];
  photoUrls: string[];
  isBound?: boolean;
  boundUserId?: string;
  manualItems: PartnerMemoryItem[];
  partners: any[];
  tags: any[];
}) {
  const locale = useLocale();
  const t = useTranslations("partners");
  const tc = useTranslations("common");
  const te = useTranslations("encounter");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<ActiveTab>("statistics");
  const [isEditing, setIsEditing] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(partner.nickname);

  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    enabled: true,
    shareLocation: true,
    shareRatings: false,
    shareNotes: false,
    shareTags: true,
    sharePhotos: false,
  });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [memoryType, setMemoryType] = useState<"anniversary" | "milestone" | "memory">("milestone");
  const [memoryTitle, setMemoryTitle] = useState("");
  const [memoryDate, setMemoryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [memoryNote, setMemoryNote] = useState("");

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedEncounter, setSelectedEncounter] = useState<EncounterListItem | null>(null);
  const [startInEdit, setStartInEdit] = useState(false);

  // Reopen edit drawer after returning from location picker
  useEffect(() => {
    const draft = readQuickLogLocationDraft();
    if (!draft?.encounterId) return;
    const encounter = encounters.find((e) => e.id === draft.encounterId);
    if (!encounter) return;
    if (!hasQuickLogReopenFlag()) return;
    setSelectedEncounter(encounter);
    setDetailDrawerOpen(true);
    setStartInEdit(true);
  }, [encounters]);

  const isArchived = partner.status === "past";
  const isUnbound = partner.status === "archived";
  const showSyncTab = isBound;
  const startDate = partner.created_at ? format(new Date(partner.created_at), "MMM dd, yyyy") : "";
  const endDate = isArchived && partner.updated_at ? format(new Date(partner.updated_at), "MMM dd, yyyy") : "";

  const sharedLocations = useMemo(() => {
    const grouped = new Map<string, SharedLocation>();
    for (const encounter of encounters) {
      if (
        !encounter.location_enabled ||
        typeof encounter.latitude !== "number" ||
        typeof encounter.longitude !== "number"
      ) {
        continue;
      }

      const lat = roundByPrecision(encounter.latitude, encounter.location_precision);
      const lng = roundByPrecision(encounter.longitude, encounter.location_precision);
      const key = `${lat}:${lng}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        grouped.set(key, { lat, lng, count: 1 });
      }
    }

    return [...grouped.values()];
  }, [encounters]);

  const totalSharedEncounters = sharedLocations.reduce((sum, loc) => sum + loc.count, 0);

  const milestones = useMemo(() => {
    const ordered = [...encounters].sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );
    const out: Milestone[] = [];
    let nextId = 1;

    if (startDate) {
      out.push({
        id: nextId++,
        title: t("milestones"),
        date: startDate,
        type: "anniversary",
        sortAt: partner.created_at,
      });
    }

    if (ordered.length) {
      out.push({
        id: nextId++,
        title: te("encounterDetails"),
          date: formatDateInTimezone(ordered[0].started_at, "MMM dd, yyyy", ordered[0].timezone || "UTC", locale),
        type: "milestone",
        sortAt: ordered[0].started_at,
      });

      const firstWithLocation = ordered.find(
        (row) => row.location_label || row.city || row.country
      );

      if (firstWithLocation) {
        const place =
          firstWithLocation.location_label ||
          firstWithLocation.city ||
          firstWithLocation.country ||
          "a shared place";
        out.push({
          id: nextId++,
          title: `First Memory in ${place}`,
          date: formatDateInTimezone(firstWithLocation.started_at, "MMM dd, yyyy", firstWithLocation.timezone || "UTC", locale),
          type: "memory",
          sortAt: firstWithLocation.started_at,
        });
      }
    }

    if (stats.totalCount >= 50) {
      out.push({
        id: nextId++,
        title: `${stats.totalCount} ${t("totalEncounters")}`,
        date: format(new Date(), "MMM dd, yyyy"),
        type: "milestone",
        sortAt: new Date().toISOString(),
      });
    }

    const manualMilestones = manualItems
      .filter((item) => item.itemType !== "photo")
      .map((item, index) => ({
        id: 100000 + index,
        title: item.title,
        date: format(new Date(item.memoryDate), "MMM dd, yyyy"),
        type: item.itemType as "anniversary" | "milestone" | "memory",
        note: item.note,
        isManual: true,
        sortAt: `${item.memoryDate}T00:00:00.000Z`,
      }));

    const merged = [...manualMilestones, ...out];
    merged.sort(
      (a, b) => new Date(b.sortAt || b.date).getTime() - new Date(a.sortAt || a.date).getTime()
    );
    return merged;
  }, [encounters, startDate, stats.totalCount, manualItems, partner.created_at]);

  const sharedPhotoLinks = useMemo(() => photoUrls.slice(0, 12), [photoUrls]);

  const avgDuration = useMemo(() => {
    const durationValues = encounters
      .map((encounter) => encounter.duration_minutes)
      .filter((value): value is number => typeof value === "number" && value > 0);

    if (!durationValues.length) return 0;
    return Math.round(durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length);
  }, [encounters]);

  const weekdayData = useMemo(() => {
    const template = [
      { day: "Mon", count: 0 },
      { day: "Tue", count: 0 },
      { day: "Wed", count: 0 },
      { day: "Thu", count: 0 },
      { day: "Fri", count: 0 },
      { day: "Sat", count: 0 },
      { day: "Sun", count: 0 },
    ];

    for (const encounter of encounters) {
      const d = new Date(encounter.started_at);
      const index = (d.getDay() + 6) % 7;
      template[index].count += 1;
    }

    return template;
  }, [encounters]);

  const topTags = useMemo(() => {
    const tagCounter = new Map<string, number>();
    for (const encounter of encounters) {
      for (const tag of encounter.tags) {
        tagCounter.set(tag.name, (tagCounter.get(tag.name) ?? 0) + 1);
      }
    }

    return [...tagCounter.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [encounters]);

  const recentEncounters = useMemo(() => encounters.slice(0, 6), [encounters]);

  useEffect(() => {
    if (activeTab !== "footprints") {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      return;
    }

    if (!mapContainerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;
    const center: [number, number] = sharedLocations.length
      ? [sharedLocations[0].lng, sharedLocations[0].lat]
      : [-73.985, 40.748];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom: sharedLocations.length ? 11 : 2,
    });

    mapRef.current = map;

    map.on("load", () => {
      sharedLocations.forEach((location) => {
        const el = document.createElement("div");
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.borderRadius = "9999px";
        el.style.background = "var(--primary)";
        el.style.boxShadow = "0 0 12px rgba(var(--primary-rgb), 0.8)";

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div style="color:var(--content);font-size:12px;">${location.count} encounters</div>`
        );

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([location.lng, location.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    });

    return () => {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [activeTab, sharedLocations]);

  const saveProfile = () => {
    const nextNickname = nicknameDraft.trim();
    if (!nextNickname) {
      toast.error(tc("error"));
      return;
    }

    startTransition(async () => {
      const res = await updatePartnerAction(partner.id, {
        nickname: nextNickname,
      });

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(t("partnerUpdated"));
      setIsEditing(false);
      router.refresh();
    });
  };

  const cancelEdit = () => {
    setNicknameDraft(partner.nickname);
    setIsEditing(false);
  };

  const toggleSync = (key: keyof SyncSettings) => {
    setSyncSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("chooseImageError"));
      event.target.value = "";
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error(t("imageSizeError50MB"));
      event.target.value = "";
      return;
    }

    setPhotoUploading(true);
    try {
      const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 2048 });
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error(t("loginAgainError"));
        return;
      }

      const ext = compressed.name.includes(".") ? compressed.name.split(".").pop()?.toLowerCase() : "jpg";
      const fileExt = ext && /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
      const pathTarget = isBound ? `bound-${boundUserId || "unknown"}` : partner.id;
      const filePath = `${user.id}/${pathTarget}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("partner-photos")
        .upload(filePath, compressed, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const { data: publicData } = supabase.storage.from("partner-photos").getPublicUrl(filePath);
      if (!publicData.publicUrl) {
        toast.error(t("avatarUrlError"));
        return;
      }

      startTransition(async () => {
        const res = await savePartnerPhotoAction({
          partnerId: partner.id,
          photoUrl: publicData.publicUrl,
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success(te("uploadPhoto"));
        router.refresh();
      });
    } finally {
      setPhotoUploading(false);
      event.target.value = "";
    }
  };

  const addManualMemory = () => {
    if (!memoryTitle.trim()) {
      toast.error(tc("error"));
      return;
    }

    startTransition(async () => {
      const res = await createPartnerMemoryItemAction({
        partnerId: isBound ? undefined : partner.id,
        boundUserId: isBound ? boundUserId : undefined,
        itemType: memoryType,
        title: memoryTitle.trim(),
        note: memoryNote.trim() || null,
        memoryDate,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(t("milestones"));
      setIsAddingMemory(false);
      setMemoryTitle("");
      setMemoryNote("");
      setMemoryType("milestone");
      setMemoryDate(new Date().toISOString().slice(0, 10));
      router.refresh();
    });
  };

  const renderStatCards = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-2 text-[10px] font-light uppercase tracking-wide text-muted">{t("totalEncounters")}</h3>
        <p className="text-[24px] font-light text-content">{stats.totalCount}</p>
        <p className="mt-1 text-[10px] text-muted">{t("totalEncounters")}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-2 text-[10px] font-light uppercase tracking-wide text-muted">{te("rating")}</h3>
        <p className="text-[24px] font-light text-content">{stats.avgRating ?? "0.0"}</p>
        <StarRating score={stats.avgRating ?? 0} size={8} fillColor="var(--primary)" />
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-2 text-[10px] font-light uppercase tracking-wide text-muted">{te("duration")}</h3>
        <p className="text-[24px] font-light text-content">{formatDuration(avgDuration, "--")}</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 md:px-0">
      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/partners")}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface"
        >
          <ArrowLeft size={20} className="text-muted" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <h1 className="text-[24px] font-light text-content">{partner.nickname}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {isArchived ? t("deletePartner") : t("addPartner")}
            {partner.is_default ? " · " + t("setDefault") : ""}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          {partner.avatar_url ? (
            <AvatarViewer src={partner.avatar_url}>
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full">
                <img
                  src={partner.avatar_url}
                  alt={partner.nickname}
                  className={`h-full w-full object-cover ${isArchived ? "opacity-60" : ""}`}
                />
              </div>
            </AvatarViewer>
          ) : (
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background: isArchived
                  ? "linear-gradient(to bottom right, var(--surface), var(--surface))"
                  : `linear-gradient(to bottom right, ${partner.color || "var(--primary)"}, var(--primary))`,
              }}
            >
              <UserCircleIcon className="h-8 w-8 text-white" />
            </div>
          )}

          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={nicknameDraft}
                  onChange={(event) => setNicknameDraft(event.target.value)}
                  className="h-10 border-border bg-surface/50 text-[18px] font-light text-content"
                  placeholder={t("nicknamePlaceholder")}
                />
              </div>
            ) : (
              <h2 className="text-[20px] font-light text-content">{partner.nickname}</h2>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-surface/50 px-3 py-1.5">
                <Calendar size={10} className="text-muted" strokeWidth={2} />
                <span className="text-[11px] text-muted">
                  {startDate}
                  {endDate ? ` - ${endDate}` : ""}
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-full bg-surface/50 px-3 py-1.5">
                <Heart size={10} className="text-primary" strokeWidth={2} />
                <span className="text-[11px] text-muted">{t("encountersCount", { count: stats.totalCount })}</span>
              </div>

              {sharedPhotoLinks.length > 0 && (
                <div className="flex items-center gap-2 rounded-full bg-surface/50 px-3 py-1.5">
                  <ImageIcon size={10} className="text-accent" strokeWidth={2} />
                  <span className="text-[11px] text-muted">{t("photosCount", { count: sharedPhotoLinks.length })}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-lg bg-surface px-4 py-2 text-[12px] font-light text-content transition-colors hover:bg-surface"
                  >
                    {tc("cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={saveProfile}
                    className="rounded-lg bg-primary px-4 py-2 text-[12px] font-light text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
                  >
                    {tc("save")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 rounded-lg bg-surface px-4 py-2 text-[12px] font-light text-content transition-colors hover:bg-surface"
                >
                  <Edit2 size={14} strokeWidth={1.5} />
                  {tc("edit")}
                </button>
              )}

              {!isBound && !isArchived && !partner.is_default && (
                <Button
                  variant="outline"
                  className="h-8 rounded-lg border-border bg-surface/50 px-3 text-[12px] font-light text-content hover:bg-surface"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await setDefaultPartnerAction(partner.id);
                      if (!res.ok) toast.error(res.error);
                      else toast.success(t("setDefault"));
                      router.refresh();
                    });
                  }}
                >
                  {t("setDefault")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {[
          { key: "statistics" as const, label: t("statistics"), icon: TrendingUp },
          { key: "footprints" as const, label: t("footprints"), icon: MapPin },
          { key: "memories" as const, label: t("milestones"), icon: Calendar },
          ...(showSyncTab ? [{ key: "sync" as const, label: t("sync"), icon: Share2 }] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-light transition-all",
              activeTab === tab.key
                ? "bg-primary text-white"
                : "bg-surface text-muted hover:text-content",
            ].join(" ")}
          >
            <tab.icon size={14} strokeWidth={1.5} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "statistics" && (
        <div className="space-y-4">
          {renderStatCards}

          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="mb-4 text-[12px] font-light uppercase tracking-wide text-muted">{t("thirtyDayFrequency")}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats.recent30Days.map((item) => ({ day: item.label, count: item.value }))}>
                <defs>
                  <linearGradient id="partner-frequency-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis hide dataKey="day" />
                <YAxis hide />
                <Tooltip
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    color: "var(--content)",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fill="url(#partner-frequency-gradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="mb-4 text-[12px] font-light uppercase tracking-wide text-muted">{t("weekdayPattern")}</h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "rgba(244, 63, 94, 0.08)" }}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    color: "var(--content)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="mb-4 flex items-center gap-2 text-[12px] font-light uppercase tracking-wide text-muted">
              <Tag size={14} strokeWidth={1.5} />
              {t("topTags")}
            </h3>

            <div className="flex flex-wrap gap-2">
              {topTags.length ? (
                topTags.map((tag) => (
                  <div
                    key={tag.name}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2"
                  >
                    <span className="text-[12px] text-content">{tag.name}</span>
                    <span className="text-[11px] text-primary">{tag.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-muted">{t("noTagsYet")}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="mb-4 text-[12px] font-light uppercase tracking-wide text-muted">{t("recentEncounters")}</h3>
            {recentEncounters.length ? (
              <div className="space-y-1">
                {recentEncounters.map((encounter) => {
                  const date = new Date(encounter.started_at);
                  const location = encounter.location_label || encounter.city || encounter.country || t("unknown");

                  return (
                    <button
                      key={encounter.id}
                      type="button"
                      onClick={() => {
                        setSelectedEncounter(encounter);
                        setDetailDrawerOpen(true);
                      }}
                      className="w-full text-left transition-all hover:scale-[1.01]"
                    >
                      <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
                        <div>
                          <p className="text-[13px] font-light text-content">{format(date, "MMM dd, yyyy")}</p>
                          <div className="mt-1 flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Clock size={12} className="text-muted" strokeWidth={1.5} />
                              <span className="text-[11px] text-muted">{formatDuration(encounter.duration_minutes, "--")}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin size={12} className="text-muted" strokeWidth={1.5} />
                              <span className="text-[11px] text-muted">{location}</span>
                            </div>
                          </div>
                        </div>

                        <StarRating score={encounter.rating ?? 0} size={12} fillColor="var(--primary)" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[13px] text-muted">{t("noRecordsYet")}</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "footprints" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="border-b border-border p-4">
              <h3 className="flex items-center gap-2 text-[12px] font-light uppercase tracking-wide text-muted">
                <MapPin size={14} strokeWidth={1.5} />
                {t("sharedFootprints")}
              </h3>
              <p className="mt-1 text-[11px] text-muted">
                {t("locationsCount", { count: sharedLocations.length })} · {t("encountersCount", { count: totalSharedEncounters })}
              </p>
            </div>

            {process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
              <div className="relative h-96 w-full">
                <div ref={mapContainerRef} className="h-96 w-full" />
                {sharedLocations.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
                    <p className="rounded-full bg-surface/70 px-4 py-2 text-[13px] text-muted">
                      {t("noLocationsYet")}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-96 w-full items-center justify-center bg-surface">
                <p className="rounded-full bg-surface/70 px-4 py-2 text-[13px] text-muted">
                  Mapbox token is missing. Set NEXT_PUBLIC_MAPBOX_TOKEN.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "memories" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="mb-4 flex items-center gap-2 text-[12px] font-light uppercase tracking-wide text-muted">
              <Calendar size={14} strokeWidth={1.5} />
              {t("milestones")}
            </h3>

            <div className="space-y-3">
              {milestones.length ? (
                milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-start gap-3 rounded-lg bg-surface/30 p-3">
                    <div
                      className={[
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        milestone.type === "anniversary"
                          ? "bg-primary/20"
                          : milestone.type === "milestone"
                            ? "bg-accent/20"
                            : "bg-primary/20",
                      ].join(" ")}
                    >
                      {milestone.type === "anniversary" ? (
                        <Heart size={16} className="text-primary" strokeWidth={1.5} />
                      ) : milestone.type === "milestone" ? (
                        <Star size={16} className="text-accent" strokeWidth={1.5} />
                      ) : (
                        <Calendar size={16} className="text-primary" strokeWidth={1.5} />
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-[14px] font-light text-content">{milestone.title}</p>
                      <p className="mt-1 text-[11px] text-muted">{milestone.date}</p>
                      {milestone.note && (
                        <p className="mt-1 text-[12px] text-muted">{milestone.note}</p>
                      )}
                      {milestone.isManual && (
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-rose-300/80">{te("mood")}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-muted">{tc("noResults")}</p>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-dashed border-border py-3 text-center text-[13px] text-muted">
              {t("milestones")}
            </div>

            <div className="mt-4">
              {!isAddingMemory ? (
                <button
                  type="button"
                  onClick={() => setIsAddingMemory(true)}
                  className="w-full rounded-lg border border-dashed border-border py-3 text-[13px] text-muted transition-colors hover:border-border hover:text-content"
                >
                  + {t("milestones")}
                </button>
              ) : (
                <div className="space-y-3 rounded-lg border border-border bg-surface/40 p-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <select
                      value={memoryType}
                      onChange={(e) => setMemoryType(e.target.value as "anniversary" | "milestone" | "memory")}
                      className="h-10 rounded-lg border border-border bg-surface/60 px-3 text-[13px] text-content"
                    >
                      <option value="milestone">{t("milestone")}</option>
                      <option value="memory">{t("memory")}</option>
                      <option value="anniversary">{t("anniversary")}</option>
                    </select>
                    <Input
                      type="date"
                      value={memoryDate}
                      onChange={(e) => setMemoryDate(e.target.value)}
                      className="h-10 border-border bg-surface/60 text-[13px] text-content"
                    />
                    <Input
                      value={memoryTitle}
                      onChange={(e) => setMemoryTitle(e.target.value)}
                      placeholder={t("milestoneTitlePlaceholder")}
                      className="h-10 border-border bg-surface/60 text-[13px] text-content"
                    />
                  </div>
                  <Input
                    value={memoryNote}
                    onChange={(e) => setMemoryNote(e.target.value)}
                    placeholder={t("milestoneNotePlaceholder")}
                    className="h-10 border-border bg-surface/60 text-[13px] text-content"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingMemory(false)}
                      className="flex-1 rounded-lg bg-surface py-2.5 text-[12px] text-content hover:bg-surface"
                    >
                      {tc("cancel")}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={addManualMemory}
                      className="flex-1 rounded-lg bg-primary py-2.5 text-[12px] text-white hover:bg-primary/90 disabled:opacity-60"
                    >
                      {tc("save")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="mb-4 flex items-center gap-2 text-[12px] font-light uppercase tracking-wide text-muted">
              <ImageIcon size={14} strokeWidth={1.5} />
              {t("sharedPhotos")}
            </h3>

            {sharedPhotoLinks.length ? (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {sharedPhotoLinks.map((url, idx) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => {
                        setPhotoViewerIndex(idx);
                        setPhotoViewerOpen(true);
                      }}
                      className="group block overflow-hidden rounded-lg border border-border bg-surface/40 hover:border-border"
                    >
                      <img
                        src={url}
                        alt={t("sharedMemory")}
                        className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
                <ImageViewer
                  images={sharedPhotoLinks.map((url) => ({ url }))}
                  initialIndex={photoViewerIndex}
                  open={photoViewerOpen}
                  onOpenChange={setPhotoViewerOpen}
                />
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border py-6 text-center text-[13px] text-muted">
                {tc("noResults")}
              </div>
            )}

            <>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadPhoto}
                className="hidden"
              />

              <button
                type="button"
                disabled={photoUploading || pending || (isBound && !boundUserId)}
                onClick={() => photoInputRef.current?.click()}
                className="mt-4 w-full rounded-lg border border-dashed border-border py-3 text-[13px] text-muted transition-colors hover:border-border hover:text-content disabled:opacity-60"
              >
                {photoUploading ? te("uploadPhoto") : `+ ${te("uploadPhoto")}`}
              </button>
            </>
          </div>
        </div>
      )}

      {showSyncTab && activeTab === "sync" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="mb-4 flex items-center gap-2 text-[12px] font-light uppercase tracking-wide text-muted">
              <Share2 size={14} strokeWidth={1.5} />
              {t("syncSettings")}
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border py-3">
                <div>
                  <p className="text-[14px] font-light text-content">{t("enableSync")}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{t("enableSyncDesc")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSync("enabled")}
                  className={[
                    "h-6 w-12 rounded-full transition-all",
                    syncSettings.enabled ? "bg-primary" : "bg-surface",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "h-5 w-5 rounded-full bg-white transition-transform",
                      syncSettings.enabled ? "translate-x-6" : "translate-x-0.5",
                    ].join(" ")}
                  />
                </button>
              </div>

              {syncSettings.enabled && (
                <div className="space-y-3 border-l-2 border-border pl-4">
                  {[
                    { key: "shareLocation" as const, label: t("shareLocation"), desc: t("shareLocationDesc") },
                    { key: "shareRatings" as const, label: t("shareRatings"), desc: t("shareRatingsDesc") },
                    { key: "shareNotes" as const, label: t("shareNotes"), desc: t("shareNotesDesc") },
                    { key: "shareTags" as const, label: t("shareTags"), desc: t("shareTagsDesc") },
                    { key: "sharePhotos" as const, label: t("sharePhotosSync"), desc: t("sharePhotosDesc") },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-[13px] font-light text-content">{item.label}</p>
                        <p className="mt-0.5 text-[10px] text-muted">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSync(item.key)}
                        className={[
                          "h-5 w-10 rounded-full transition-all",
                          syncSettings[item.key] ? "bg-primary" : "bg-surface",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "h-4 w-4 rounded-full bg-white transition-transform",
                            syncSettings[item.key] ? "translate-x-5" : "translate-x-0.5",
                          ].join(" ")}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="mb-4 text-[12px] font-light uppercase tracking-wide text-muted">{t("dataConflicts")}</h3>
            <p className="mb-4 text-[13px] text-muted">{t("noConflicts")}</p>
            <button
              type="button"
              className="rounded-lg bg-surface px-4 py-2 text-[12px] font-light text-content transition-colors hover:bg-surface"
            >
              {t("forceSync")}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        <h3 className="mb-3 text-[12px] font-light uppercase tracking-wide text-muted">{t("actions")}</h3>

        {isUnbound ? (
          <div className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-surface/50 p-4 opacity-60">
            <Archive size={18} className="text-muted" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-[14px] font-light text-muted">{t("partnerUnbound")}</p>
              <p className="mt-0.5 text-[11px] text-muted">{t("unbindPartner")}</p>
            </div>
          </div>
        ) : isBound ? (
          <ConfirmDeleteDialog
            title={t("confirmUnbind")}
            description={t("unbindPartner")}
            pending={pending}
            onConfirm={() => {
              startTransition(async () => {
                try {
                  await unbindPartner(boundUserId);
                  toast.success(t("partnerUnbound"));
                  router.push("/partners");
                } catch (err: any) {
                  toast.error(err.message || tc("error"));
                }
              });
            }}
            trigger={
              <button
                type="button"
                className="group flex w-full items-center gap-3 rounded-xl border border-rose-500/20 bg-surface p-4 text-left transition-colors hover:border-rose-500/40"
              >
                <Share2 size={18} className="text-rose-300" strokeWidth={1.5} />
                <div className="flex-1">
                  <p className="text-[14px] font-light text-rose-300 transition-colors group-hover:text-rose-200">{t("unbindPartner")}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{t("unbindPartner")}</p>
                </div>
              </button>
            }
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                const prompt = partner.status === "active"
                  ? t("archivePrompt", { name: partner.nickname })
                  : t("restorePrompt", { name: partner.nickname });
                if (!window.confirm(prompt)) return;

                startTransition(async () => {
                  const res = await archivePartnerAction(partner.id, partner.status === "active");
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success(partner.status === "active" ? t("archived") : t("restoredToActive"));
                  router.refresh();
                });
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-border"
            >
              {partner.status === "active" ? (
                <Archive size={18} className="text-muted" strokeWidth={1.5} />
              ) : (
                <Heart size={18} className="text-primary" strokeWidth={1.5} />
              )}

              <div className="flex-1">
                <p className="text-[14px] font-light text-content">
                  {partner.status === "active" ? t("markAsPast") : t("markAsActive")}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {partner.status === "active"
                    ? t("archivePartner")
                    : t("restorePartner")}
                </p>
              </div>
            </button>

            <ConfirmDeleteDialog
            title={t("deletePartner")}
            description={t("deletePartner")}
              pending={pending}
              onConfirm={() => {
                startTransition(async () => {
                  const res = await deletePartnerAction(partner.id);
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success(t("partnerDeleted"));
                  router.push("/partners");
                });
              }}
              trigger={
                <button
                  type="button"
                  className="group flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-destructive/50"
                >
                  <UserX size={18} className="text-destructive" strokeWidth={1.5} />
                  <div className="flex-1">
                    <p className="text-[14px] font-light text-destructive transition-colors group-hover:text-destructive">{t("deletePartner")}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{t("deletePartner")}</p>
                  </div>
                </button>
              }
            />
          </>
        )}
      </div>

      <EncounterDetailDrawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedEncounter(null);
          setStartInEdit(false);
        }}
        encounterId={selectedEncounter?.id}
        initialData={selectedEncounter ?? undefined}
        partners={partners}
        tags={tags}
        startInEdit={startInEdit}
      />
    </div>
  );
}

function UserCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}
