"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Heart, Image as ImageIcon, Edit2, TrendingUp, MapPin, Film, RefreshCw, Star } from "lucide-react";

import { DashboardTrendChart } from "@/components/analytics/DashboardTrendChart";
import { EncounterCard } from "@/components/timeline/EncounterCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
  archivePartnerAction,
  deletePartnerAction,
  setDefaultPartnerAction,
  updatePartnerAction,
} from "@/features/partners/actions";
import type { PartnerManageItem, PartnerStats } from "@/features/partners/queries";
import type { EncounterListItem } from "@/features/records/types";

export function PartnerDetailView({
  partner,
  stats,
  encounters,
}: {
  partner: PartnerManageItem;
  stats: PartnerStats;
  encounters: EncounterListItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  
  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [nickname, setNickname] = useState(partner.nickname);
  const [color, setColor] = useState(partner.color || "#ff5577");

  const [activeTab, setActiveTab] = useState<"statistics" | "footprints" | "memories" | "sync">("statistics");

  const createdDate = partner.created_at ? format(new Date(partner.created_at), "MMM dd, yyyy") : "";
  const isArchived = !partner.is_active;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 md:px-0">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()} 
          className="mt-1 h-8 w-8 px-0 text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-white/[0.04] -ml-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[var(--app-text)]">{partner.nickname}</h1>
          <p className="text-[14px] text-[#9aa4b2]">
            {isArchived ? "Past Partner" : "Active Partner"} {partner.is_default && "· Default"}
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="mb-6 rounded-[16px] bg-[#141b26] p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <div 
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-white"
            style={{ 
              background: isArchived 
                ? "linear-gradient(to bottom right, #4a5568, #334155)" 
                : `linear-gradient(to bottom right, ${partner.color || '#ff5577'}, #8b5cf6)` 
            }}
          >
            <UserCircleIcon className="h-10 w-10" />
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="text-[22px] font-medium text-[var(--app-text)]">{partner.nickname}</div>
            
            <div className="flex flex-wrap gap-2">
              {createdDate && (
                <div className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-[var(--app-text-muted)]">
                  <Calendar className="h-3.5 w-3.5" />
                  {createdDate}
                </div>
              )}
              <div className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-[#ff5577]">
                <Heart className="h-3.5 w-3.5" />
                {stats.totalCount} encounters
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-[#a855f7]">
                <ImageIcon className="h-3.5 w-3.5" />
                0 photos
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(true)}
              className="h-8 rounded-full border-white/[0.1] bg-white/[0.02] text-[13px] font-medium hover:bg-white/[0.06]"
            >
              <Edit2 className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("statistics")}
          className={`flex items-center gap-2 rounded-full px-5 py-2 text-[14px] font-medium transition-colors ${
            activeTab === "statistics" ? "bg-[#ff5577] text-white" : "bg-[#141b26] text-[#9aa4b2] hover:bg-white/[0.08]"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Statistics
        </button>
        <button
          onClick={() => setActiveTab("footprints")}
          className={`flex items-center gap-2 rounded-full px-5 py-2 text-[14px] font-medium transition-colors ${
            activeTab === "footprints" ? "bg-[#ff5577] text-white" : "bg-[#141b26] text-[#9aa4b2] hover:bg-white/[0.08]"
          }`}
        >
          <MapPin className="h-4 w-4" />
          Footprints
        </button>
        <button
          className="flex items-center gap-2 rounded-full bg-[#141b26] px-5 py-2 text-[14px] font-medium text-[#9aa4b2] opacity-50 cursor-not-allowed"
        >
          <Film className="h-4 w-4" />
          Memories
        </button>
        <button
          className="flex items-center gap-2 rounded-full bg-[#141b26] px-5 py-2 text-[14px] font-medium text-[#9aa4b2] opacity-50 cursor-not-allowed"
        >
          <RefreshCw className="h-4 w-4" />
          Sync
        </button>
      </div>

      {activeTab === "statistics" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-[16px] bg-[#141b26] p-5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#8b95a3]">TOTAL</div>
              <div className="text-[32px] font-medium text-[var(--app-text)] leading-none">{stats.totalCount}</div>
              <div className="mt-1 text-[13px] text-[#9aa4b2]">encounters</div>
            </div>
            
            <div className="rounded-[16px] bg-[#141b26] p-5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#8b95a3]">AVG RATING</div>
              <div className="text-[32px] font-medium text-[var(--app-text)] leading-none">{stats.avgRating ?? "0.0"}</div>
              <div className="mt-1 flex text-[#ff5577]">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i <= (stats.avgRating ?? 0) ? 'fill-current' : 'opacity-30 fill-current'}`} />
                ))}
              </div>
            </div>

            <div className="rounded-[16px] bg-[#141b26] p-5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#8b95a3]">AVG DURATION</div>
              <div className="text-[32px] font-medium text-[var(--app-text)] leading-none">0<span className="text-[20px]">m</span></div>
              <div className="mt-1 text-[13px] text-[#9aa4b2]">minutes</div>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-[16px] bg-[#141b26] p-5">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#8b95a3]">30-DAY FREQUENCY</div>
            <div className="h-[200px]">
              <DashboardTrendChart data={stats.recent30Days} />
            </div>
          </div>

          <div className="rounded-[16px] bg-[#141b26] p-5">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#8b95a3]">TIMELINE</div>
            {encounters.length ? (
              <div className="space-y-3">
                {encounters.map((it) => (
                  <EncounterCard key={it.id} item={it} />
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-[#9aa4b2]">No records with this partner yet.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "footprints" && (
        <div className="space-y-6">
          <div className="rounded-[16px] bg-[#141b26] overflow-hidden">
            <div className="p-5 border-b border-white/[0.05]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#8b95a3]">
                <MapPin className="h-3.5 w-3.5" />
                SHARED FOOTPRINTS
              </div>
              <div className="mt-1 text-[13px] text-[var(--app-text-muted)]">
                0 locations · {stats.totalCount} encounters
              </div>
            </div>
            <div className="h-[300px] bg-[#0b0f18] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #ff5577 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              <div className="text-[13px] text-[var(--app-text-muted)] z-10 bg-[#141b26]/80 px-4 py-2 rounded-full backdrop-blur-md">
                Map view coming soon...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <DialogPrimitive.Root open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/80 z-40" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-[var(--app-border)] bg-[var(--app-panel)] p-5 shadow-linear z-50">
            <div className="flex items-center justify-between mb-4">
              <DialogPrimitive.Title className="text-[16px] font-semibold text-[var(--app-text)]">
                Edit Partner
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  className="rounded-[6px] p-2 text-[var(--app-text-muted)] hover:bg-white/[0.04]"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogPrimitive.Close>
            </div>
            
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-[var(--app-text)]">Nickname</label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="text-[var(--app-text)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-[var(--app-text)]">Theme Color</label>
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="text-[var(--app-text)]"
                />
              </div>

              <div className="pt-4 flex flex-col gap-2">
                <Button
                  variant="primary"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await updatePartnerAction(partner.id, {
                        nickname,
                        color: color || null,
                      });
                      if (!res.ok) {
                        toast.error(res.error);
                        return;
                      }
                      toast.success("Saved successfully");
                      setEditModalOpen(false);
                      router.refresh();
                    });
                  }}
                >
                  Save Changes
                </Button>
                
                {!isArchived && !partner.is_default && (
                  <Button
                    variant="outline"
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

                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await archivePartnerAction(partner.id, partner.is_active);
                      if (!res.ok) toast.error(res.error);
                      else toast.success(partner.is_active ? "Archived" : "Restored");
                      router.refresh();
                    });
                  }}
                >
                  {partner.is_active ? "Archive Partner" : "Restore Partner"}
                </Button>

                <ConfirmDeleteDialog
                  title="Delete Partner?"
                  description="This action cannot be undone. Encounter records will remain but the partner tag will be removed."
                  pending={pending}
                  onConfirm={() => {
                    startTransition(async () => {
                      const res = await deletePartnerAction(partner.id);
                      if (!res.ok) {
                        toast.error(res.error);
                        return;
                      }
                      toast.success("Deleted successfully");
                      router.push("/partners");
                    });
                  }}
                  trigger={
                    <Button variant="ghost" className="text-[#f43f5e] hover:text-[#f43f5e] hover:bg-[#f43f5e]/10">
                      Delete Partner
                    </Button>
                  }
                />
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
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
