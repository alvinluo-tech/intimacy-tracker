"use client";

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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { EncounterDetailDrawer } from "@/components/forms/EncounterDetailDrawer";
import { consumeQuickLogReopenFlag, readQuickLogLocationDraft } from "@/lib/utils/quicklog-location-draft";
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

function clampRating(value: number | null) {
  return Math.max(0, Math.min(5, Math.round(value ?? 0)));
}

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) return "--";
  const totalSeconds = Math.round(minutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<ActiveTab>("statistics");
  const [isEditing, setIsEditing] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(partner.nickname);
  const [colorDraft, setColorDraft] = useState(partner.color || "#f43f5e");

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
    if (!consumeQuickLogReopenFlag()) return;
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
        title: "Relationship Started",
        date: startDate,
        type: "anniversary",
        sortAt: partner.created_at,
      });
    }

    if (ordered.length) {
      out.push({
        id: nextId++,
        title: "First Encounter",
        date: format(new Date(ordered[0].started_at), "MMM dd, yyyy"),
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
          date: format(new Date(firstWithLocation.started_at), "MMM dd, yyyy"),
          type: "memory",
          sortAt: firstWithLocation.started_at,
        });
      }
    }

    if (stats.totalCount >= 50) {
      out.push({
        id: nextId++,
        title: `${stats.totalCount} Encounters Together`,
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
        el.style.background = "#f43f5e";
        el.style.boxShadow = "0 0 12px rgba(244, 63, 94, 0.8)";

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div style=\"color:#cbd5e1;font-size:12px;\">${location.count} encounters</div>`
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
      toast.error("Nickname is required");
      return;
    }

    startTransition(async () => {
      const res = await updatePartnerAction(partner.id, {
        nickname: nextNickname,
        color: colorDraft || null,
      });

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success("Profile updated");
      setIsEditing(false);
      router.refresh();
    });
  };

  const cancelEdit = () => {
    setNicknameDraft(partner.nickname);
    setColorDraft(partner.color || "#f43f5e");
    setIsEditing(false);
  };

  const toggleSync = (key: keyof SyncSettings) => {
    setSyncSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      event.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be below 10MB");
      event.target.value = "";
      return;
    }

    setPhotoUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("Please log in again");
        return;
      }

      const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "jpg";
      const fileExt = ext && /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
      const pathTarget = isBound ? `bound-${boundUserId || "unknown"}` : partner.id;
      const filePath = `${user.id}/${pathTarget}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("partner-photos")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const { data: publicData } = supabase.storage.from("partner-photos").getPublicUrl(filePath);
      if (!publicData.publicUrl) {
        toast.error("Failed to get photo URL");
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
        toast.success("Photo uploaded");
        router.refresh();
      });
    } finally {
      setPhotoUploading(false);
      event.target.value = "";
    }
  };

  const addManualMemory = () => {
    if (!memoryTitle.trim()) {
      toast.error("请输入标题");
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

      toast.success("已添加到 Milestones & Memories");
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
      <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-4">
        <h3 className="mb-2 text-[10px] font-light uppercase tracking-wide text-slate-500">Total</h3>
        <p className="text-[24px] font-light text-slate-200">{stats.totalCount}</p>
        <p className="mt-1 text-[10px] text-slate-600">encounters</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-4">
        <h3 className="mb-2 text-[10px] font-light uppercase tracking-wide text-slate-500">Avg Rating</h3>
        <p className="text-[24px] font-light text-slate-200">{stats.avgRating ?? "0.0"}</p>
        <div className="mt-1 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={8}
              className={i < clampRating(stats.avgRating) ? "fill-[#f43f5e] text-[#f43f5e]" : "text-slate-700"}
              strokeWidth={2}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-4">
        <h3 className="mb-2 text-[10px] font-light uppercase tracking-wide text-slate-500">Avg Duration</h3>
        <p className="text-[24px] font-light text-slate-200">{avgDuration > 0 ? formatDuration(avgDuration) : "--"}</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 md:px-0">
      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/partners")}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-slate-800"
        >
          <ArrowLeft size={20} className="text-slate-400" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <h1 className="text-[24px] font-light text-slate-200">{partner.nickname}</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            {isArchived ? "Past Partner" : "Active Partner"}
            {partner.is_default ? " · Default" : ""}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              background: isArchived
                ? "linear-gradient(to bottom right, #475569, #334155)"
                : `linear-gradient(to bottom right, ${partner.color || "#3b82f6"}, #8b5cf6)`,
            }}
          >
            <UserCircleIcon className="h-8 w-8 text-white" />
          </div>

          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={nicknameDraft}
                  onChange={(event) => setNicknameDraft(event.target.value)}
                  className="h-10 border-slate-700 bg-slate-800/50 text-[18px] font-light text-slate-200"
                  placeholder={partner.nickname}
                />
                <Input
                  value={colorDraft}
                  onChange={(event) => setColorDraft(event.target.value)}
                  className="h-10 border-slate-700 bg-slate-800/50 text-[13px] text-slate-300"
                  placeholder="#f43f5e"
                />
              </div>
            ) : (
              <h2 className="text-[20px] font-light text-slate-200">{partner.nickname}</h2>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-slate-800/50 px-3 py-1.5">
                <Calendar size={10} className="text-slate-500" strokeWidth={2} />
                <span className="text-[11px] text-slate-400">
                  {startDate}
                  {endDate ? ` - ${endDate}` : ""}
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-full bg-slate-800/50 px-3 py-1.5">
                <Heart size={10} className="text-[#f43f5e]" strokeWidth={2} />
                <span className="text-[11px] text-slate-400">{stats.totalCount} encounters</span>
              </div>

              {sharedPhotoLinks.length > 0 && (
                <div className="flex items-center gap-2 rounded-full bg-slate-800/50 px-3 py-1.5">
                  <ImageIcon size={10} className="text-purple-400" strokeWidth={2} />
                  <span className="text-[11px] text-slate-400">{sharedPhotoLinks.length} photos</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!isBound && isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-[12px] font-light text-slate-300 transition-colors hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={saveProfile}
                    className="rounded-lg bg-[#f43f5e] px-4 py-2 text-[12px] font-light text-white transition-colors hover:bg-[#f43f5e]/90 disabled:opacity-60"
                  >
                    Save
                  </button>
                </>
              ) : !isBound ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-[12px] font-light text-slate-300 transition-colors hover:bg-slate-700"
                >
                  <Edit2 size={14} strokeWidth={1.5} />
                  Edit
                </button>
              ) : null}

              {!isBound && !isArchived && !partner.is_default && (
                <Button
                  variant="outline"
                  className="h-8 rounded-lg border-slate-700 bg-slate-800/50 px-3 text-[12px] font-light text-slate-300 hover:bg-slate-700"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await setDefaultPartnerAction(partner.id);
                      if (!res.ok) toast.error(res.error);
                      else toast.success("Set as default partner");
                      router.refresh();
                    });
                  }}
                >
                  Set as Default
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {[
          { key: "statistics" as const, label: "Statistics", icon: TrendingUp },
          { key: "footprints" as const, label: "Footprints", icon: MapPin },
          { key: "memories" as const, label: "Memories", icon: Calendar },
          ...(showSyncTab ? [{ key: "sync" as const, label: "Sync", icon: Share2 }] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-light transition-all",
              activeTab === tab.key
                ? "bg-[#f43f5e] text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200",
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

          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
            <h3 className="mb-4 text-[12px] font-light uppercase tracking-wide text-slate-400">30-Day Frequency</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats.recent30Days.map((item) => ({ day: item.label, count: item.value }))}>
                <defs>
                  <linearGradient id="partner-frequency-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis hide dataKey="day" />
                <YAxis hide />
                <Tooltip
                  cursor={{ stroke: "#334155", strokeWidth: 1 }}
                  contentStyle={{
                    background: "#0b1220",
                    border: "1px solid #1e293b",
                    borderRadius: 10,
                    color: "#cbd5e1",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#f43f5e" strokeWidth={2} fill="url(#partner-frequency-gradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
            <h3 className="mb-4 text-[12px] font-light uppercase tracking-wide text-slate-400">Weekday Pattern</h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "rgba(244, 63, 94, 0.08)" }}
                  contentStyle={{
                    background: "#0b1220",
                    border: "1px solid #1e293b",
                    borderRadius: 10,
                    color: "#cbd5e1",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-[12px] font-light uppercase tracking-wide text-slate-400">
              <Tag size={14} strokeWidth={1.5} />
              Top Tags
            </h3>

            <div className="flex flex-wrap gap-2">
              {topTags.length ? (
                topTags.map((tag) => (
                  <div
                    key={tag.name}
                    className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2"
                  >
                    <span className="text-[12px] text-slate-300">{tag.name}</span>
                    <span className="text-[11px] text-[#f43f5e]">{tag.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-slate-500">No tags yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
            <h3 className="mb-4 text-[12px] font-light uppercase tracking-wide text-slate-400">Recent Encounters</h3>
            {recentEncounters.length ? (
              <div className="space-y-1">
                {recentEncounters.map((encounter) => {
                  const date = new Date(encounter.started_at);
                  const location = encounter.location_label || encounter.city || encounter.country || "Unknown";

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
                      <div className="flex items-center justify-between border-b border-slate-800 py-3 last:border-0">
                        <div>
                          <p className="text-[13px] font-light text-slate-300">{format(date, "MMM dd, yyyy")}</p>
                          <div className="mt-1 flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Clock size={12} className="text-slate-500" strokeWidth={1.5} />
                              <span className="text-[11px] text-slate-500">{formatDuration(encounter.duration_minutes)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin size={12} className="text-slate-500" strokeWidth={1.5} />
                              <span className="text-[11px] text-slate-500">{location}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={
                                i < clampRating(encounter.rating)
                                  ? "fill-[#f43f5e] text-[#f43f5e]"
                                  : "text-slate-700"
                              }
                              strokeWidth={1.5}
                            />
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[13px] text-slate-500">No records with this partner yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "footprints" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0f172a]">
            <div className="border-b border-slate-800 p-4">
              <h3 className="flex items-center gap-2 text-[12px] font-light uppercase tracking-wide text-slate-400">
                <MapPin size={14} strokeWidth={1.5} />
                Shared Footprints
              </h3>
              <p className="mt-1 text-[11px] text-slate-600">
                {sharedLocations.length} locations · {totalSharedEncounters} encounters
              </p>
            </div>

            {process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
              <div className="relative h-96 w-full">
                <div ref={mapContainerRef} className="h-96 w-full" />
                {sharedLocations.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0b1220]/70">
                    <p className="rounded-full bg-slate-900/70 px-4 py-2 text-[13px] text-slate-400">
                      No location records for this partner yet.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-96 w-full items-center justify-center bg-[#0b1220]">
                <p className="rounded-full bg-slate-900/70 px-4 py-2 text-[13px] text-slate-400">
                  Mapbox token is missing. Set NEXT_PUBLIC_MAPBOX_TOKEN.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "memories" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-[12px] font-light uppercase tracking-wide text-slate-400">
              <Calendar size={14} strokeWidth={1.5} />
              Milestones & Memories
            </h3>

            <div className="space-y-3">
              {milestones.length ? (
                milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-start gap-3 rounded-lg bg-slate-800/30 p-3">
                    <div
                      className={[
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        milestone.type === "anniversary"
                          ? "bg-[#f43f5e]/20"
                          : milestone.type === "milestone"
                            ? "bg-purple-500/20"
                            : "bg-blue-500/20",
                      ].join(" ")}
                    >
                      {milestone.type === "anniversary" ? (
                        <Heart size={16} className="text-[#f43f5e]" strokeWidth={1.5} />
                      ) : milestone.type === "milestone" ? (
                        <Star size={16} className="text-purple-400" strokeWidth={1.5} />
                      ) : (
                        <Calendar size={16} className="text-blue-400" strokeWidth={1.5} />
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-[14px] font-light text-slate-200">{milestone.title}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{milestone.date}</p>
                      {milestone.note && (
                        <p className="mt-1 text-[12px] text-slate-500">{milestone.note}</p>
                      )}
                      {milestone.isManual && (
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-rose-300/80">Manual</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-slate-500">No memory records yet. Add more encounters to unlock milestones.</p>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-dashed border-slate-700 py-3 text-center text-[13px] text-slate-500">
              Milestones are generated from real encounter history.
            </div>

            <div className="mt-4">
              {!isAddingMemory ? (
                <button
                  type="button"
                  onClick={() => setIsAddingMemory(true)}
                  className="w-full rounded-lg border border-dashed border-slate-700 py-3 text-[13px] text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-300"
                >
                  + Add Milestone / Memory
                </button>
              ) : (
                <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <select
                      value={memoryType}
                      onChange={(e) => setMemoryType(e.target.value as "anniversary" | "milestone" | "memory")}
                      className="h-10 rounded-lg border border-slate-700 bg-slate-800/60 px-3 text-[13px] text-slate-200"
                    >
                      <option value="milestone">Milestone</option>
                      <option value="memory">Memory</option>
                      <option value="anniversary">Anniversary</option>
                    </select>
                    <Input
                      type="date"
                      value={memoryDate}
                      onChange={(e) => setMemoryDate(e.target.value)}
                      className="h-10 border-slate-700 bg-slate-800/60 text-[13px] text-slate-200"
                    />
                    <Input
                      value={memoryTitle}
                      onChange={(e) => setMemoryTitle(e.target.value)}
                      placeholder="Title"
                      className="h-10 border-slate-700 bg-slate-800/60 text-[13px] text-slate-200"
                    />
                  </div>
                  <Input
                    value={memoryNote}
                    onChange={(e) => setMemoryNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="h-10 border-slate-700 bg-slate-800/60 text-[13px] text-slate-200"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingMemory(false)}
                      className="flex-1 rounded-lg bg-slate-800 py-2.5 text-[12px] text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={addManualMemory}
                      className="flex-1 rounded-lg bg-[#f43f5e] py-2.5 text-[12px] text-white hover:bg-[#f43f5e]/90 disabled:opacity-60"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-[12px] font-light uppercase tracking-wide text-slate-400">
              <ImageIcon size={14} strokeWidth={1.5} />
              Shared Photos
            </h3>

            {sharedPhotoLinks.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {sharedPhotoLinks.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block overflow-hidden rounded-lg border border-slate-700 bg-slate-900/40 hover:border-slate-600"
                  >
                    <img
                      src={url}
                      alt="Shared memory"
                      className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-700 py-6 text-center text-[13px] text-slate-500">
                No shared photo records found for this partner.
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
                className="mt-4 w-full rounded-lg border border-dashed border-slate-700 py-3 text-[13px] text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-300 disabled:opacity-60"
              >
                {photoUploading ? "Uploading..." : "+ Upload Photo"}
              </button>
            </>
          </div>
        </div>
      )}

      {showSyncTab && activeTab === "sync" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-[12px] font-light uppercase tracking-wide text-slate-400">
              <Share2 size={14} strokeWidth={1.5} />
              Sync Settings
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 py-3">
                <div>
                  <p className="text-[14px] font-light text-slate-300">Enable Sync</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">Share data with this partner</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSync("enabled")}
                  className={[
                    "h-6 w-12 rounded-full transition-all",
                    syncSettings.enabled ? "bg-[#f43f5e]" : "bg-slate-700",
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
                <div className="space-y-3 border-l-2 border-slate-800 pl-4">
                  {[
                    { key: "shareLocation" as const, label: "Share Location", desc: "City-level location data" },
                    { key: "shareRatings" as const, label: "Share Ratings", desc: "Encounter ratings & reviews" },
                    { key: "shareNotes" as const, label: "Share Notes", desc: "Private notes & comments" },
                    { key: "shareTags" as const, label: "Share Tags", desc: "Tags and categories" },
                    { key: "sharePhotos" as const, label: "Share Photos", desc: "Photo library access" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-[13px] font-light text-slate-300">{item.label}</p>
                        <p className="mt-0.5 text-[10px] text-slate-600">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSync(item.key)}
                        className={[
                          "h-5 w-10 rounded-full transition-all",
                          syncSettings[item.key] ? "bg-[#f43f5e]" : "bg-slate-700",
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

          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
            <h3 className="mb-4 text-[12px] font-light uppercase tracking-wide text-slate-400">Data Conflicts</h3>
            <p className="mb-4 text-[13px] text-slate-500">No conflicts detected. All data is in sync.</p>
            <button
              type="button"
              className="rounded-lg bg-slate-800 px-4 py-2 text-[12px] font-light text-slate-300 transition-colors hover:bg-slate-700"
            >
              Force Sync
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        <h3 className="mb-3 text-[12px] font-light uppercase tracking-wide text-slate-400">Actions</h3>

        {isUnbound ? (
          <div className="flex w-full items-center gap-3 rounded-xl border border-slate-800/50 bg-slate-900/50 p-4 opacity-60">
            <Archive size={18} className="text-slate-600" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-[14px] font-light text-slate-500">已解除绑定</p>
              <p className="mt-0.5 text-[11px] text-slate-600">该伴侣档案已封存。重新绑定后将自动恢复。</p>
            </div>
          </div>
        ) : isBound ? (
          <ConfirmDeleteDialog
            title="解除账号绑定？"
            description="解除后此伴侣档案将封存隐藏。双方仍可与其他伴侣绑定。"
            pending={pending}
            onConfirm={() => {
              startTransition(async () => {
                try {
                  await unbindPartner(boundUserId);
                  toast.success("已解除账号绑定");
                  router.push("/partners");
                } catch (err: any) {
                  toast.error(err.message || "解除绑定失败");
                }
              });
            }}
            trigger={
              <button
                type="button"
                className="group flex w-full items-center gap-3 rounded-xl border border-rose-500/20 bg-[#0f172a] p-4 text-left transition-colors hover:border-rose-500/40"
              >
                <Share2 size={18} className="text-rose-300" strokeWidth={1.5} />
                <div className="flex-1">
                  <p className="text-[14px] font-light text-rose-300 transition-colors group-hover:text-rose-200">解除绑定</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">封存档案与记录，仅解除账号绑定关系</p>
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
                  ? `Archive ${partner.nickname}? You can restore them later.`
                  : `Restore ${partner.nickname} to active partner?`;
                if (!window.confirm(prompt)) return;

                startTransition(async () => {
                  const res = await archivePartnerAction(partner.id, partner.status === "active");
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success(partner.status === "active" ? "Archived" : "Restored");
                  router.refresh();
                });
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-[#0f172a] p-4 text-left transition-colors hover:border-slate-700"
            >
              {partner.status === "active" ? (
                <Archive size={18} className="text-slate-500" strokeWidth={1.5} />
              ) : (
                <Heart size={18} className="text-[#f43f5e]" strokeWidth={1.5} />
              )}

              <div className="flex-1">
                <p className="text-[14px] font-light text-slate-300">
                  {partner.status === "active" ? "Mark as Past" : "Mark as Active"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  {partner.status === "active"
                    ? "Archive this partner relationship"
                    : "Restore this partner relationship"}
                </p>
              </div>
            </button>

            <ConfirmDeleteDialog
              title="Remove Partner?"
              description="Unlink all records from this partner. Records are preserved."
              pending={pending}
              onConfirm={() => {
                startTransition(async () => {
                  const res = await deletePartnerAction(partner.id);
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success("Partner removed");
                  router.push("/partners");
                });
              }}
              trigger={
                <button
                  type="button"
                  className="group flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-[#0f172a] p-4 text-left transition-colors hover:border-red-900/50"
                >
                  <UserX size={18} className="text-red-400" strokeWidth={1.5} />
                  <div className="flex-1">
                    <p className="text-[14px] font-light text-red-400 transition-colors group-hover:text-red-300">Remove Partner</p>
                    <p className="mt-0.5 text-[11px] text-slate-600">Unlink all records from this partner</p>
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
