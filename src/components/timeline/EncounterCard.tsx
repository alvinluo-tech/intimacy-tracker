"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Clock, MapPin, Heart, Calendar, Star } from "lucide-react";
import { format, isSameDay } from "date-fns";

import type { EncounterListItem } from "@/features/records/types";
import { deleteEncounterAction } from "@/features/records/actions";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { cn } from "@/lib/utils/cn";

function formatDuration(minutes: number | null) {
  if (!minutes) return "进行中";
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}小时 ${m}分钟` : `${h}小时`;
}

export function EncounterCard({ item }: { item: EncounterListItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const startDate = new Date(item.started_at);
  const isOngoing = !item.ended_at;
  const timeRange = isOngoing
    ? format(startDate, "HH:mm") + " 起"
    : `${format(startDate, "HH:mm")} - ${format(new Date(item.ended_at!), "HH:mm")}`;

  return (
    <div className="group relative flex gap-4">
      {/* Timeline Node */}
      <div className="flex flex-col items-center pt-1.5">
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 bg-[var(--app-bg)] shadow-sm",
          isOngoing ? "border-[#f59e0b] text-[#f59e0b]" : "border-[var(--brand)] text-[var(--brand)]"
        )}>
          {isOngoing ? <Clock className="h-3.5 w-3.5" /> : <Heart className="h-3.5 w-3.5 fill-current" />}
        </div>
        <div className="w-px flex-1 bg-gradient-to-b from-[var(--app-border)] to-transparent group-hover:from-[var(--brand)]/30 transition-colors my-1" />
      </div>

      {/* Card Content */}
      <div className="flex-1 pb-6">
        <div className="rounded-[16px] border border-[var(--app-border)] bg-[#1a1f2e] p-4 transition-all hover:border-white/[0.08] hover:bg-[#1f2536] hover:shadow-lg hover:shadow-[var(--brand)]/5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <Link
              href={`/records/${item.id}`}
              className="block flex-1 min-w-0 focus-visible:outline-none"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[15px] font-semibold text-[var(--app-text)] tracking-tight">
                  {format(startDate, "MM月dd日")}
                </span>
                <span className="text-[12px] font-medium text-[var(--app-text-subtle)] bg-white/[0.04] px-2 py-0.5 rounded-full">
                  {timeRange}
                </span>
                {isOngoing && (
                  <span className="animate-pulse h-2 w-2 rounded-full bg-[#f59e0b]" />
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-[var(--app-text-muted)]">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 opacity-70" />
                  {formatDuration(item.duration_minutes)}
                </div>
                
                {item.partner && (
                  <div className="flex items-center gap-1">
                    <div 
                      className="h-3.5 w-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-inner"
                      style={{ backgroundColor: item.partner.color || "var(--brand)" }}
                    >
                      {item.partner.nickname.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-[var(--app-text-secondary)]">{item.partner.nickname}</span>
                  </div>
                )}

                {item.rating && (
                  <div className="flex items-center gap-0.5 text-[#f59e0b]">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span className="font-medium">{item.rating}.0</span>
                  </div>
                )}
              </div>
            </Link>

            <div className="flex items-center gap-1 shrink-0">
              <Link
                href={`/records/${item.id}/edit`}
                className="flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-[var(--app-text-muted)] hover:bg-white/[0.04] hover:text-[var(--app-text)] transition-colors"
              >
                编辑
              </Link>
              <ConfirmDeleteDialog
                onConfirm={() => {
                  startTransition(async () => {
                    const res = await deleteEncounterAction(item.id);
                    if (!res.ok) {
                      toast.error(res.error);
                      return;
                    }
                    toast.success("已删除记录");
                    router.refresh();
                  });
                }}
                pending={pending}
                trigger={
                  <button
                    type="button"
                    disabled={pending}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--app-text-subtle)] hover:bg-[#f43f5e]/10 hover:text-[#f43f5e] transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                }
              />
            </div>
          </div>

          {(item.tags.length > 0 || item.location_label || item.city) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-white/[0.04]">
              {item.location_enabled && (item.location_label || item.city) && (
                <div className="flex items-center gap-1 text-[12px] text-[var(--app-text-muted)] mr-2 bg-white/[0.02] px-2 py-1 rounded-[6px] border border-white/[0.02]">
                  <MapPin className="h-3 w-3 text-[var(--brand)]" />
                  <span className="truncate max-w-[120px]">
                    {item.location_label || item.city}
                  </span>
                </div>
              )}
              
              {item.tags.map((t) => (
                <Badge 
                  key={t.id} 
                  style={{ 
                    borderColor: `${t.color}30`, 
                    backgroundColor: `${t.color}10`,
                    color: t.color || "var(--app-text-secondary)"
                  }}
                >
                  {t.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
