"use client";

import { useTranslations, useLocale } from "next-intl";
import { Clock, MapPin } from "lucide-react";

import type { EncounterListItem } from "@/features/records/types";
import { formatDuration } from "@/lib/utils/formatDuration";
import { formatDateInTimezone } from "@/lib/utils/formatDateInTimezone";
import { StarRating } from "@/components/ui/StarRating";

const MOOD_EMOJIS = ["😞", "😐", "🙂", "😊", "🥰"];
const MOOD_LABELS = ["Very Sad", "Neutral", "Happy", "Very Happy", "Love"];

function getMoodIndex(mood: string | null, te: (key: string) => string): number | null {
  if (!mood) return null;
  const idx = MOOD_LABELS.indexOf(mood);
  if (idx >= 0) return idx;
  const translated = [te("moodVerySad"), te("ratingNeutral"), te("moodHappy"), te("moodVeryHappy"), te("moodLove")];
  const translatedIdx = translated.indexOf(mood);
  return translatedIdx >= 0 ? translatedIdx : null;
}

function getMoodEmoji(mood: string | null, te: (key: string) => string): string {
  const idx = getMoodIndex(mood, te);
  return idx !== null ? MOOD_EMOJIS[idx] : "";
}

function getMoodLabel(mood: string | null, te: (key: string) => string): string {
  const idx = getMoodIndex(mood, te);
  if (idx !== null) return [te("moodVerySad"), te("ratingNeutral"), te("moodHappy"), te("moodVeryHappy"), te("moodLove")][idx];
  return mood ?? "";
}

function getDaysAgoLabel(startDate: Date, t: (key: string) => string) {
  const diff = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / 86400000));
  if (diff === 0) return t("today");
  if (diff === 1) return t("yesterday");
  return `${diff}d ago`;
}

function getLocation(item: EncounterListItem) {
  if (!item) return "";
  return item.location_label || item.city || item.country || "";
}

export function EncounterCard({ item, clickable = false }: { item: EncounterListItem; clickable?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("timeline");
  const te = useTranslations("encounter");
  const tc = useTranslations("common");
  if (!item || !item.id) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 opacity-50">
        <p className="text-[12px] text-slate-500">Invalid encounter data</p>
      </div>
    );
  }

  const tz = item.timezone || "UTC";
  const startDate = new Date(item.started_at);
  const relativeDays = getDaysAgoLabel(startDate, t);
  const location = getLocation(item);
  const rating = Math.max(0, Math.min(5, item.rating ?? 0));

  const CardContent = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[14px] font-light text-slate-300">{formatDateInTimezone(item.started_at, "MMM d, yyyy", tz, locale)}</p>
            {item.partner && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/50 px-2 py-0.5">
                {item.partner.avatar_url ? (
                  <img src={item.partner.avatar_url} alt="" className="h-3 w-3 rounded-full object-cover" />
                ) : (
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundImage: `linear-gradient(to bottom right, ${item.partner.color || "#3b82f6"}, #8b5cf6)`,
                    }}
                  />
                )}
                <span className="text-[10px] text-slate-400">{item.partner.nickname}</span>
              </div>
            )}
          </div>
          <p className="text-[12px] text-slate-500">{formatDateInTimezone(item.started_at, "h:mm a", tz, locale)}</p>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-slate-500">{relativeDays}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2 text-slate-400">
          <Clock size={14} className="text-slate-500" />
          <span className="text-[13px]">{formatDuration(item.duration_minutes)}</span>
        </div>

        {location && (
          <div className="flex items-center gap-2 text-slate-400">
            <MapPin size={14} className="text-slate-500" />
            <span className="text-[13px]">{location}</span>
          </div>
        )}

        {item.mood && (
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-[18px]">{getMoodEmoji(item.mood, te)}</span>
            <span className="text-[13px]">{getMoodLabel(item.mood, te)}</span>
          </div>
        )}

        <StarRating value={rating} size={14} />
      </div>

      {item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800 pt-2">
          {item.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-[11px] text-slate-400"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {item.tags.length === 0 && <div className="mt-3 border-t border-slate-800" />}
    </>
  );

  if (clickable) {
    return (
      <a
        href={`/records/${item.id}`}
        className="block rounded-2xl border border-slate-800 bg-[#0f172a] p-5 transition-colors hover:border-slate-700"
      >
        {CardContent}
      </a>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 transition-colors hover:border-slate-700">
      {CardContent}
    </div>
  );
}
