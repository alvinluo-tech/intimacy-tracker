"use client";

import { Clock, MapPin } from "lucide-react";

import type { EncounterListItem } from "@/features/records/types";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/formatDuration";
import { formatDateInTimezone } from "@/lib/utils/formatDateInTimezone";

const MOOD_EMOJIS = ["😞", "😐", "🙂", "😊", "🥰"];
const MOOD_LABELS = ["Very Sad", "Neutral", "Happy", "Very Happy", "Love"];

function getMoodEmoji(mood: string | null): string {
  if (!mood) return "";
  const idx = MOOD_LABELS.indexOf(mood);
  return idx >= 0 ? MOOD_EMOJIS[idx] : "";
}

function getDaysAgoLabel(startDate: Date) {
  const diff = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / 86400000));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff}d ago`;
}

function getLocation(item: EncounterListItem) {
  if (!item) return "";
  return item.location_label || item.city || item.country || "";
}

export function EncounterCard({ item, clickable = false }: { item: EncounterListItem; clickable?: boolean }) {
  if (!item || !item.id) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 opacity-50">
        <p className="text-[12px] text-slate-500">Invalid encounter data</p>
      </div>
    );
  }

  const tz = item.timezone || "UTC";
  const startDate = new Date(item.started_at);
  const relativeDays = getDaysAgoLabel(startDate);
  const location = getLocation(item);
  const rating = Math.max(0, Math.min(5, item.rating ?? 0));

  const CardContent = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[14px] font-light text-slate-300">{formatDateInTimezone(item.started_at, "MMM d, yyyy", tz)}</p>
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
          <p className="text-[12px] text-slate-500">{formatDateInTimezone(item.started_at, "h:mm a", tz)}</p>
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
            <span className="text-[18px]">{getMoodEmoji(item.mood)}</span>
            <span className="text-[13px]">{item.mood}</span>
          </div>
        )}

        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <span
              key={idx}
              className={cn("text-[14px]", idx < rating ? "text-[#f43f5e]" : "text-slate-700")}
            >
              ★
            </span>
          ))}
        </div>
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
