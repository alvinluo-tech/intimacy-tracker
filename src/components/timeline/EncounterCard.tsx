"use client";

import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

import type { EncounterListItem } from "@/features/records/types";
import { cn } from "@/lib/utils/cn";

function formatDuration(minutes: number | null) {
  if (!minutes) return "Ongoing";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getDaysAgoLabel(startDate: Date) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.max(0, Math.floor((now - startDate.getTime()) / dayMs));
  return `${diff}d ago`;
}

function getLocation(item: EncounterListItem) {
  return item.location_label || item.city || item.country || "";
}

export function EncounterCard({ item }: { item: EncounterListItem }) {
  const startDate = new Date(item.started_at);
  const relativeDays = getDaysAgoLabel(startDate);
  const location = getLocation(item);
  const rating = Math.max(0, Math.min(5, item.rating ?? 0));

  return (
    <Link
      href={`/records/${item.id}`}
      className="block rounded-2xl border border-slate-800 bg-[#0f172a] p-5 transition-colors hover:border-slate-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[14px] font-light text-slate-300">{format(startDate, "MMM d, yyyy")}</p>
            {item.partner && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/50 px-2 py-0.5">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundImage: `linear-gradient(to bottom right, ${item.partner.color || "#3b82f6"}, #8b5cf6)`,
                  }}
                />
                <span className="text-[10px] text-slate-400">{item.partner.nickname}</span>
              </div>
            )}
          </div>
          <p className="text-[12px] text-slate-500">{format(startDate, "h:mm a")}</p>
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
    </Link>
  );
}
