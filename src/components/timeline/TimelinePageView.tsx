"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowUpDown,
  BookmarkPlus,
  Calendar,
  Filter,
  Search,
  Star,
  Tag as TagIcon,
  User,
  X,
} from "lucide-react";

import type { EncounterListItem } from "@/features/records/types";
import { EncounterCard } from "@/components/timeline/EncounterCard";
import { EncounterDetailDrawer } from "@/components/forms/EncounterDetailDrawer";
import { consumeQuickLogReopenFlag, readQuickLogLocationDraft } from "@/lib/utils/quicklog-location-draft";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SortBy = "date-desc" | "date-asc" | "rating-desc" | "duration-desc";
type DateRange = "all" | "week" | "month" | "3months";

type TimelineFilters = {
  partners: string[];
  ratings: number[];
  tags: string[];
  dateRange: DateRange;
};

type FilterPreset = {
  id: string;
  label: string;
  icon: string;
  filters: Partial<TimelineFilters>;
};

const STORAGE_KEY = "timeline-custom-presets";

const defaultFilters: TimelineFilters = {
  partners: [],
  ratings: [],
  tags: [],
  dateRange: "all",
};

function getLocation(item: EncounterListItem) {
  return item.location_label || item.city || item.country || "";
}

function daysAgo(startedAt: string) {
  const now = Date.now();
  const then = new Date(startedAt).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((now - then) / dayMs));
}

function dateRangeLabel(range: DateRange, t: (key: string) => string) {
  if (range === "week") return t("last7Days");
  if (range === "month") return t("thisMonth");
  if (range === "3months") return t("lastThreeMonths");
  return t("allTime");
}

function createGradient(color: string | null) {
  const start = color || "#3b82f6";
  return `linear-gradient(to bottom right, ${start}, #8b5cf6)`;
}

export function TimelinePageView({ items, partners, tags }: { items: EncounterListItem[]; partners: any[]; tags: any[] }) {
  const t = useTranslations("timeline");
  const tc = useTranslations("common");
  const te = useTranslations("encounter");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date-desc");

  const SMART_PRESETS: FilterPreset[] = [
    { id: "this-week", label: t("thisWeek"), icon: "📅", filters: { dateRange: "week" } },
    { id: "5-star", label: t("fiveStar"), icon: "⭐", filters: { ratings: [5] } },
    { id: "romantic", label: t("romantic"), icon: "💕", filters: { tags: ["Romantic"] } },
    { id: "this-month", label: t("thisMonthPreset"), icon: "📆", filters: { dateRange: "month" } },
  ];

  // Filter out null/undefined items at the top level
  const safeItems = useMemo(() => {
    console.log('TimelinePageView items:', items);
    const filtered = items.filter((item) => {
      const isValid = item != null && item.id != null && typeof item.id === 'string';
      if (!isValid) {
        console.warn('Filtered out invalid item:', item);
      }
      return isValid;
    });
    console.log('TimelinePageView safeItems:', filtered);
    return filtered as EncounterListItem[];
  }, [items]);

  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState("");

  const [customPresets, setCustomPresets] = useState<FilterPreset[]>([]);

  const TAG_LABEL_MAP: Record<string, string> = {
    home: te("presetTagHome"),
    travel: te("presetTagTravel"),
    hotel: te("presetTagHotel"),
    weekend: te("presetTagWeekend"),
    spontaneous: te("presetTagSpontaneous"),
    romantic: te("presetTagRomantic"),
    adventurous: te("presetTagAdventurous"),
  };
  const getTagLabel = (tag: string) => TAG_LABEL_MAP[tag.toLowerCase()] || tag;

  const [draftFilters, setDraftFilters] = useState<TimelineFilters>(defaultFilters);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedEncounter, setSelectedEncounter] = useState<EncounterListItem | null>(null);
  const [startInEdit, setStartInEdit] = useState(false);

  // Reopen edit drawer after returning from location picker
  useEffect(() => {
    const draft = readQuickLogLocationDraft();
    if (!draft?.encounterId) return;
    const encounter = safeItems.find((e) => e.id === draft.encounterId);
    if (!encounter) return;
    if (!consumeQuickLogReopenFlag()) return;
    setSelectedEncounter(encounter);
    setDetailDrawerOpen(true);
    setStartInEdit(true);
  }, [safeItems]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as FilterPreset[];
      if (Array.isArray(parsed)) setCustomPresets(parsed);
    } catch {
      setCustomPresets([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
  }, [customPresets]);

  const partnerOptions = useMemo(() => {
    const map = new Map<string, { id: string; nickname: string; color: string | null; avatar_url: string | null }>();
    for (const item of safeItems) {
      if (!item || !item.partner) continue;
      map.set(item.partner.id, {
        id: item.partner.id,
        nickname: item.partner.nickname,
        color: item.partner.color,
        avatar_url: item.partner.avatar_url ?? null,
      });
    }
    return [...map.values()];
  }, [safeItems]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of safeItems) {
      if (!item || !item.tags) continue;
      for (const t of item.tags) set.add(t.name);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [safeItems]);

  const hasActiveFilters =
    selectedPartners.length > 0 ||
    selectedRatings.length > 0 ||
    selectedTags.length > 0 ||
    dateRange !== "all";

  const hasAnyCriteria = hasActiveFilters || searchQuery.trim().length > 0;

  const filteredAndSortedItems = useMemo(() => {
    let list = safeItems.filter((item): item is EncounterListItem => {
      if (!item || !item.id) return false;
      // Ensure all required properties exist
      if (!item.started_at) return false;
      return true;
    });

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter((encounter) => {
        if (!encounter) return false;
        const partnerName = encounter.partner?.nickname?.toLowerCase() ?? "";
        const location = encounter.location_label || encounter.city || encounter.country || "";
        const tags = encounter.tags?.map((t) => t.name.toLowerCase()).join(" ") ?? "";
        const matchesName = partnerName.includes(query);
        const matchesLocation = location.toLowerCase().includes(query);
        const matchesTags = tags.includes(query);
        if (!matchesName && !matchesLocation && !matchesTags) return false;
        return true;
      });
    }

    // Filters
    list = list.filter((encounter) => {
      if (!encounter) return false;

      const encounterDaysAgo = Math.floor(
        (Date.now() - new Date(encounter.started_at).getTime()) / (24 * 60 * 60 * 1000)
      );

      if (
        selectedPartners.length > 0 &&
        (!encounter.partner || !selectedPartners.includes(encounter.partner.id))
      ) {
        return false;
      }

      if (selectedRatings.length > 0 && !selectedRatings.includes(encounter.rating ?? 0)) {
        return false;
      }

      if (
        selectedTags.length > 0 &&
        !selectedTags.every((tag) => encounter.tags?.some((t) => t.name.toLowerCase() === tag.toLowerCase()) ?? false)
      ) {
        return false;
      }

      if (dateRange !== "all") {
        const maxDays = dateRange === "week" ? 7 : dateRange === "month" ? 30 : 90;
        if (encounterDaysAgo > maxDays) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      if (!a || !b) return 0;
      if (sortBy === "date-asc") {
        return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
      }
      if (sortBy === "rating-desc") {
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
      if (sortBy === "duration-desc") {
        return (b.duration_minutes ?? 0) - (a.duration_minutes ?? 0);
      }
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    });

    return list;
  }, [safeItems, searchQuery, selectedPartners, selectedRatings, selectedTags, dateRange, sortBy]);

  const openFilterDrawer = () => {
    setDraftFilters({
      partners: selectedPartners,
      ratings: selectedRatings,
      tags: selectedTags,
      dateRange,
    });
    setShowFilterDrawer(true);
  };

  const clearAll = () => {
    setSearchQuery("");
    setSelectedPartners([]);
    setSelectedRatings([]);
    setSelectedTags([]);
    setDateRange("all");
  };

  const applyPreset = (preset: FilterPreset) => {
    const filters: TimelineFilters = {
      partners: preset.filters.partners ?? [],
      ratings: preset.filters.ratings ?? [],
      tags: preset.filters.tags ?? [],
      dateRange: preset.filters.dateRange ?? "all",
    };
    setSelectedPartners(filters.partners);
    setSelectedRatings(filters.ratings);
    setSelectedTags(filters.tags);
    setDateRange(filters.dateRange);
  };

  const saveCurrentPreset = () => {
    const name = presetName.trim();
    if (!name) return;

    const next: FilterPreset = {
      id: `custom-${Date.now()}`,
      label: name,
      icon: "📌",
      filters: {
        partners: selectedPartners,
        ratings: selectedRatings,
        tags: selectedTags,
        dateRange,
      },
    };

    setCustomPresets((prev) => [next, ...prev]);
    setPresetName("");
    setShowSavePreset(false);
  };

  const toggleDraft = (key: "partners" | "ratings" | "tags", value: string | number) => {
    setDraftFilters((prev) => {
      const arr = prev[key] as Array<string | number>;
      const exists = arr.includes(value);
      const next = exists ? arr.filter((x) => x !== value) : [...arr, value];
      return { ...prev, [key]: next } as TimelineFilters;
    });
  };

  const draftHasActive =
    draftFilters.partners.length > 0 ||
    draftFilters.ratings.length > 0 ||
    draftFilters.tags.length > 0 ||
    draftFilters.dateRange !== "all";

  return (
    <div className="min-h-[100svh] bg-[#020617] pb-24">
      <div className="mx-auto max-w-6xl px-4 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-light text-slate-200">{t("title")}</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              {filteredAndSortedItems.length}
              {filteredAndSortedItems.length !== safeItems.length ? ` of ${safeItems.length}` : ""} {t("encounters")}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-11 rounded-lg border border-slate-800 bg-[#0f172a] pl-9 pr-4 text-slate-200 placeholder:text-slate-600 focus-visible:border-[#f43f5e] focus-visible:ring-0"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-lg border border-slate-800 bg-[#0f172a] px-3 py-2.5 text-slate-400 transition-colors hover:bg-slate-800">
                <ArrowUpDown size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl border border-slate-700 bg-[#1e293b] p-1">
              <DropdownMenuItem
                onClick={() => setSortBy("date-desc")}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${sortBy === "date-desc" ? "bg-[#f43f5e]/20 text-[#f43f5e]" : "text-slate-300 hover:bg-slate-700"}`}
              >
                {t("sortNewest")}
                {sortBy === "date-desc" && <span className="h-1.5 w-1.5 rounded-full bg-[#f43f5e]" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy("date-asc")}
                className={`rounded-lg px-3 py-2.5 ${sortBy === "date-asc" ? "bg-[#f43f5e]/20 text-[#f43f5e]" : "text-slate-300 hover:bg-slate-700"}`}
              >
                {t("sortOldest")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy("rating-desc")}
                className={`rounded-lg px-3 py-2.5 ${sortBy === "rating-desc" ? "bg-[#f43f5e]/20 text-[#f43f5e]" : "text-slate-300 hover:bg-slate-700"}`}
              >
                {t("highestRating")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy("duration-desc")}
                className={`rounded-lg px-3 py-2.5 ${sortBy === "duration-desc" ? "bg-[#f43f5e]/20 text-[#f43f5e]" : "text-slate-300 hover:bg-slate-700"}`}
              >
                {t("longestDuration")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={openFilterDrawer}
            className={`rounded-lg px-3 py-2.5 transition-colors ${hasActiveFilters ? "bg-[#f43f5e] text-white" : "border border-slate-800 bg-[#0f172a] text-slate-400 hover:bg-slate-800"}`}
          >
            <Filter size={18} />
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {SMART_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5 text-[13px] text-slate-300 transition-colors hover:bg-slate-700"
            >
              <span>{preset.icon}</span>
              {preset.label}
            </button>
          ))}
          {customPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-purple-700/50 bg-purple-900/30 px-3 py-1.5 text-[13px] text-purple-300 transition-colors hover:bg-purple-900/50"
            >
              <span>{preset.icon}</span>
              {preset.label}
            </button>
          ))}
        </div>

        {hasAnyCriteria && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-500">{t("activeFilters")}</span>

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="inline-flex items-center gap-1 rounded-full border border-[#f43f5e] bg-[#f43f5e]/10 px-2.5 py-1 text-[11px] text-[#f43f5e]"
              >
                <Search size={10} />
                "{searchQuery}"
                <X size={10} />
              </button>
            )}

            {selectedPartners.map((partnerId) => {
              const partner = partnerOptions.find((p) => p.id === partnerId);
              if (!partner) return null;
              return (
                <button
                  key={partnerId}
                  onClick={() => setSelectedPartners((prev) => prev.filter((id) => id !== partnerId))}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] text-slate-300"
                >
                  {partner.avatar_url ? (
                    <img src={partner.avatar_url} alt="" className="h-2.5 w-2.5 rounded-full object-cover" />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundImage: createGradient(partner.color) }} />
                  )}
                  {partner.nickname}
                  <X size={10} />
                </button>
              );
            })}

            {selectedRatings.map((rating) => (
              <button
                key={rating}
                onClick={() => setSelectedRatings((prev) => prev.filter((x) => x !== rating))}
                className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] text-slate-300"
              >
                {rating}★
                <X size={10} />
              </button>
            ))}

            {selectedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTags((prev) => prev.filter((x) => x !== tag))}
                className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] text-slate-300"
              >
                {tag}
                <X size={10} />
              </button>
            ))}

            {dateRange !== "all" && (
              <button
                onClick={() => setDateRange("all")}
                className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] text-slate-300"
              >
                <Calendar size={10} />
                {dateRangeLabel(dateRange, t)}
                <X size={10} />
              </button>
            )}

            <button onClick={clearAll} className="text-[11px] text-slate-500 transition-colors hover:text-[#f43f5e]">
              {t("clearAll")}
            </button>

            {hasActiveFilters && (
              <button
                onClick={() => setShowSavePreset(true)}
                className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300"
              >
                <BookmarkPlus size={10} />
                {t("savePreset")}
              </button>
            )}
          </div>
        )}

        <div className="mt-5">
          {filteredAndSortedItems.length > 0 ? (
            filteredAndSortedItems.map((encounter: EncounterListItem, index: number) => {
              if (!encounter || !encounter.id) return null;
              return (
                <div key={encounter.id}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedEncounter(encounter);
                      setDetailDrawerOpen(true);
                    }}
                    className="w-full text-left transition-all hover:scale-[1.01]"
                  >
                    <EncounterCard item={encounter} clickable={false} />
                  </button>
                  {index < filteredAndSortedItems.length - 1 && (
                    <div className="h-3 flex items-center justify-center">
                      <div className="h-3 w-px bg-slate-800" />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6 text-center">
              <p className="text-[14px] text-slate-300">{t("noEncounters")}</p>
              <p className="mt-1 text-[12px] text-slate-500">{t("tryAnotherQuery")}</p>
              {hasAnyCriteria && (
                <button
                  onClick={clearAll}
                  className="mt-3 rounded-lg bg-slate-800 px-3 py-2 text-[12px] text-slate-300 transition-colors hover:bg-slate-700"
                >
                  {t("clearFilters")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showFilterDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowFilterDrawer(false)}>
          <div
            className="fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-slate-800 bg-[#0f172a] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-light text-slate-200">{t("filters")}</h2>
              <button className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-800" onClick={() => setShowFilterDrawer(false)}>
                <X size={18} className="mx-auto" />
              </button>
            </div>

            {draftHasActive && (
              <div className="mt-4 rounded-lg bg-slate-800/30 p-3">
                <p className="mb-1 text-[11px] text-slate-500">{t("filterLogic")}</p>
                <p className="text-[12px] text-slate-300">
                  {draftFilters.partners.length > 0 && (
                    <span>
                      Partners: <span className="text-[#f43f5e]">{tc("or")}</span> ·{" "}
                    </span>
                  )}
                  {draftFilters.ratings.length > 0 && (
                    <span>
                      Ratings: <span className="text-[#f43f5e]">{tc("or")}</span> ·{" "}
                    </span>
                  )}
                  {draftFilters.tags.length > 0 && (
                    <span>
                      Tags: <span className="text-purple-400">{tc("and")}</span>
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="mt-5 space-y-5">
              <section>
                <label className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500">
                  <User size={12} />
                  {t("partners")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {partnerOptions.map((partner) => {
                    const active = draftFilters.partners.includes(partner.id);
                    return (
                      <button
                        key={partner.id}
                        onClick={() => toggleDraft("partners", partner.id)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] transition-colors ${
                          active
                            ? "border-[#f43f5e] bg-[#f43f5e]/10 text-[#f43f5e]"
                            : "border-slate-700 text-slate-400"
                        }`}
                      >
                        {partner.avatar_url ? (
                          <img src={partner.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                        ) : (
                          <span className="h-4 w-4 rounded-full" style={{ backgroundImage: createGradient(partner.color) }} />
                        )}
                        {partner.nickname}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <label className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500">
                  <Star size={12} />
                  {t("ratings")}
                </label>
                <div className="flex gap-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const active = draftFilters.ratings.includes(rating);
                    return (
                      <button
                        key={rating}
                        onClick={() => toggleDraft("ratings", rating)}
                        className={`flex h-14 flex-1 flex-col items-center justify-center rounded-lg border text-[16px] transition-colors ${
                          active
                            ? "border-[#f43f5e] bg-[#f43f5e]/10 text-[#f43f5e]"
                            : "border-slate-700 text-slate-400"
                        }`}
                      >
                        <span>{rating}</span>
                        <Star size={12} />
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <label className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500">
                  <TagIcon size={12} />
                  {t("tagsMustHaveAll")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => {
                    const active = draftFilters.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleDraft("tags", tag)}
                        className={`rounded-lg border px-3 py-1.5 text-[13px] transition-colors ${
                          active
                            ? "border-[#f43f5e] bg-[#f43f5e]/10 text-[#f43f5e]"
                            : "border-slate-700 text-slate-400"
                        }`}
                      >
                {getTagLabel(tag)}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <label className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500">
                  <Calendar size={12} />
                  {t("dateRange")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["all", t("allTime")],
                    ["week", t("last7Days")],
                    ["month", t("thisMonth")],
                    ["3months", t("lastThreeMonths")],
                  ] as const).map(([value, label]) => {
                    const active = draftFilters.dateRange === value;
                    return (
                      <button
                        key={value}
                        onClick={() => setDraftFilters((prev) => ({ ...prev, dateRange: value }))}
                        className={`rounded-lg border px-3 py-2.5 text-[13px] transition-colors ${
                          active
                            ? "border-[#f43f5e] bg-[#f43f5e]/10 text-[#f43f5e]"
                            : "border-slate-700 text-slate-400"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="mt-5 flex gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setDraftFilters(defaultFilters)}
                className="flex-1 rounded-lg bg-slate-800 py-3 text-[14px] text-slate-300 transition-colors hover:bg-slate-700"
              >
                {t("clearAll")}
              </button>
              <button
                onClick={() => {
                  setSelectedPartners(draftFilters.partners);
                  setSelectedRatings(draftFilters.ratings);
                  setSelectedTags(draftFilters.tags);
                  setDateRange(draftFilters.dateRange);
                  setShowFilterDrawer(false);
                }}
                className="flex-1 rounded-lg bg-[#f43f5e] py-3 text-[14px] text-white transition-colors hover:bg-[#f43f5e]/90"
              >
                {tc("apply")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSavePreset && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
            <h3 className="mb-4 text-[16px] font-light text-slate-200">{t("saveFilterPreset")}</h3>
            <Input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={t("presetNamePlaceholder")}
              autoFocus
              className="border-slate-700 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setPresetName("");
                  setShowSavePreset(false);
                }}
                className="flex-1 rounded-lg bg-slate-800 py-2.5 text-[14px] text-slate-300 transition-colors hover:bg-slate-700"
              >
                {tc("cancel")}
              </button>
              <button
                onClick={saveCurrentPreset}
                disabled={!presetName.trim()}
                className="flex-1 rounded-lg bg-[#f43f5e] py-2.5 text-[14px] text-white transition-colors hover:bg-[#f43f5e]/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {tc("save")}
              </button>
            </div>
          </div>
        </div>
      )}

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
