"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Copy, Check, Link as LinkIcon, Unlink, Plus, UserCircle, Bell, Clock, Heart, Archive, MoreVertical, ArrowLeft, Search, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddPartnerModal } from "@/components/partners/AddPartnerModal";
import {
  archivePartnerAction,
  deletePartnerAction,
  setDefaultPartnerAction,
} from "@/features/partners/actions";
import {
  approveBindingRequest,
  rejectBindingRequest,
  unbindPartner,
} from "@/features/partner-binding/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import type { PartnerManageItem } from "@/features/partners/queries";
import type { BindingRequestView } from "@/features/partner-binding/actions";

function PartnerCard({
  p,
  pending,
  onSetDefault,
  onToggleArchive,
  onDelete,
}: {
  p: PartnerManageItem;
  pending: boolean;
  onSetDefault: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}) {
  const isArchived = !p.is_active;
  const createdDate = p.created_at ? format(new Date(p.created_at), "MMM yyyy") : "";
  
  return (
    <div className={`flex items-center justify-between rounded-[16px] bg-[#141b26] p-4 transition-colors ${isArchived ? "opacity-60" : "hover:bg-[#1a2333]"}`}>
      <Link href={`/partners/${p.id}`} className="flex flex-1 items-center gap-4 min-w-0">
        <div 
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white"
          style={{ 
            background: isArchived 
              ? "linear-gradient(to bottom right, #4a5568, #334155)" 
              : `linear-gradient(to bottom right, ${p.color || '#ff5577'}, #8b5cf6)` 
          }}
        >
          <UserCircle className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-2">
            <div className={`text-[16px] font-medium truncate ${isArchived ? "text-[#737d8b]" : "text-[var(--app-text)]"}`}>
              {p.nickname}
            </div>
            {p.is_default && !isArchived && (
              <span className="rounded-full bg-[#ff5577]/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#ff5577] uppercase">
                Default
              </span>
            )}
          </div>
          <div className={`mt-0.5 flex items-center text-[13px] ${isArchived ? "text-[#657083]" : "text-[var(--app-text-muted)]"}`}>
            <span>{p.encounterCount} records</span>
            <span className="mx-2 text-[10px]">•</span>
            <span>Since {createdDate}</span>
          </div>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 px-0 text-[var(--app-text-muted)] hover:text-[var(--app-text)] shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 rounded-[12px] border-white/[0.05] bg-[#141b26]">
          <DropdownMenuItem asChild>
            <Link href={`/partners/${p.id}`} className="cursor-pointer">查看详情</Link>
          </DropdownMenuItem>
          {!isArchived && !p.is_default && (
            <DropdownMenuItem 
              disabled={pending} 
              onClick={onSetDefault}
              className="cursor-pointer"
            >
              设为默认伴侣
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className="bg-white/[0.05]" />
          <DropdownMenuItem 
            disabled={pending} 
            onClick={onToggleArchive}
            className="cursor-pointer"
          >
            {isArchived ? "恢复为活跃" : "归档"}
          </DropdownMenuItem>
          <ConfirmDeleteDialog
            title="删除伴侣档案？"
            description="删除后该伴侣将从列表彻底移除，历史记录中的对象标签也会被置空（但记录本身保留）。"
            pending={pending}
            onConfirm={onDelete}
            trigger={
              <DropdownMenuItem 
                onSelect={(e) => e.preventDefault()} 
                className="cursor-pointer text-[#ff5577] focus:text-[#ff5577] focus:bg-[#ff5577]/10"
              >
                删除档案
              </DropdownMenuItem>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function PartnersPageView({
  partners,
  partnerProfile,
  identityCode,
  incomingRequests,
  outgoingRequests,
}: {
  partners: PartnerManageItem[];
  partnerProfile: { id: string; email: string; display_name: string | null } | null;
  identityCode: string;
  incomingRequests: BindingRequestView[];
  outgoingRequests: BindingRequestView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "past">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const activePartners = partners.filter((p) => p.is_active);
  const pastPartners = partners.filter((p) => !p.is_active);

  const displayedPartners = partners.filter((p) => {
    if (filter === "active" && !p.is_active) return false;
    if (filter === "past" && p.is_active) return false;
    if (searchQuery && !p.nickname.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const displayedActive = displayedPartners.filter((p) => p.is_active);
  const displayedPast = displayedPartners.filter((p) => !p.is_active);

  const handleCopyCode = () => {
    if (!identityCode) return;
    navigator.clipboard.writeText(identityCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("已复制身份码");
  };

  const handleUnbind = () => {
    if (!confirm("确定要解除绑定吗？解除后双方将不再共享记录。")) return;
    startTransition(async () => {
      try {
        await unbindPartner();
        toast.success("已解除绑定");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "解除绑定失败");
      }
    });
  };

  return (
    <div className="min-h-[100svh] bg-[#0b0f18]">
      <div className="mx-auto max-w-2xl px-4 py-8 pb-24 md:px-0">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.back()} 
                className="h-8 w-8 px-0 text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-white/[0.04] -ml-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-[28px] font-semibold tracking-tight text-[var(--app-text)]">Partners</h1>
            </div>
            <p className="text-[14px] text-[#9aa4b2] ml-11">
              {activePartners.length} active · {pastPartners.length} past
            </p>
          </div>
          <Button
            onClick={() => setAddModalOpen(true)}
            className="rounded-full bg-[#ff5577] hover:bg-[#e64c6b] text-white font-medium h-9 px-4 shadow-sm text-[14px]"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-text-muted)]" />
            <Input 
              placeholder="Search partners..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-[10px] border-none bg-[#141b26] pl-9 text-[14px] text-[var(--app-text)] placeholder:text-[#9aa4b2] focus-visible:ring-1 focus-visible:ring-white/[0.1]"
            />
          </div>
          <Button 
            variant="outline" 
            className="h-10 rounded-[10px] border border-white/[0.05] bg-[#141b26] px-4 text-[14px] font-medium text-[#9aa4b2] hover:bg-white/[0.04] hover:text-[var(--app-text)]"
          >
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Sort
          </Button>
        </div>

        <div className="mb-8 flex gap-2">
          <button 
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors ${filter === "all" ? "bg-[#ff5577] text-white" : "bg-[#141b26] text-[#9aa4b2] hover:bg-white/[0.08]"}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter("active")}
            className={`rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors ${filter === "active" ? "bg-[#ff5577] text-white" : "bg-[#141b26] text-[#9aa4b2] hover:bg-white/[0.08]"}`}
          >
            Active
          </button>
          <button 
            onClick={() => setFilter("past")}
            className={`rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors ${filter === "past" ? "bg-[#ff5577] text-white" : "bg-[#141b26] text-[#9aa4b2] hover:bg-white/[0.08]"}`}
          >
            Past
          </button>
        </div>

        <div className="space-y-8">
          {/* Identity Code Section */}
          <section>
            <div className="rounded-[16px] bg-[#141b26] p-5">
              <div className="mb-4 flex items-center gap-3">
                <LinkIcon className="h-5 w-5 text-[var(--app-text-muted)]" />
                <div>
                  <div className="text-[15px] font-medium text-[var(--app-text)]">Your Binding Code</div>
                  <div className="text-[13px] text-[var(--app-text-muted)]">Share to link with partner's device</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 rounded-[12px] bg-black/20 p-2 border border-white/[0.02]">
                <div className="flex-1 text-center font-mono text-[16px] tracking-[0.2em] text-[#ff5577] font-medium">
                  {identityCode || "--------"}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                  disabled={!identityCode}
                  className="h-10 w-10 shrink-0 rounded-[8px] bg-white/[0.04] hover:bg-white/[0.08]"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-[var(--app-text-muted)]" />}
                </Button>
              </div>
            </div>
          </section>

          {/* Bound Account Section (If exists) */}
          {partnerProfile && (
            <section>
              <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--app-text-subtle)]">
                <LinkIcon className="h-3.5 w-3.5" />
                LINKED ACCOUNT
              </div>
              <div className="flex items-center justify-between rounded-[16px] bg-[#141b26] p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff5577]/20 to-[#ff5577]/5 text-[#ff5577]">
                    <UserCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-[16px] font-medium text-[var(--app-text)]">
                      {partnerProfile.display_name || partnerProfile.email}
                    </div>
                    <div className="text-[13px] text-[var(--app-text-muted)] mt-0.5">
                      Records are shared automatically
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnbind}
                  disabled={pending}
                  className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 h-9"
                >
                  <Unlink className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Unbind</span>
                </Button>
              </div>
            </section>
          )}

          {/* Requests Section */}
          {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
            <section>
              <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--app-text-subtle)]">
                <Bell className="h-3.5 w-3.5" />
                PENDING REQUESTS
              </div>
              <div className="space-y-3">
                {incomingRequests.map((req) => (
                  <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[16px] bg-[#141b26] border border-amber-500/20 p-4">
                    <div>
                      <div className="text-[15px] font-medium text-[var(--app-text)]">
                        {req.user?.display_name || req.user?.email || "Unknown User"}
                      </div>
                      <div className="text-[13px] text-amber-500/80 mt-0.5">
                        Wants to link accounts with you
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        className="flex-1 sm:flex-none bg-amber-500 text-white hover:bg-amber-600 h-9"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              await approveBindingRequest(req.id);
                              toast.success("已同意绑定");
                              router.refresh();
                            } catch (err: any) {
                              toast.error(err.message || "操作失败");
                            }
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1 sm:flex-none h-9 bg-white/[0.04] hover:bg-white/[0.08]"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              await rejectBindingRequest(req.id);
                              toast.success("已拒绝请求");
                              router.refresh();
                            } catch (err: any) {
                              toast.error(err.message || "操作失败");
                            }
                          })
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}

                {outgoingRequests.map((req) => (
                  <div key={req.id} className="rounded-[16px] bg-[#141b26] p-4 text-[14px] text-[var(--app-text-muted)]">
                    Sent binding request to <span className="font-medium text-[var(--app-text)]">{req.user?.display_name || req.user?.email || "Unknown User"}</span>, waiting for approval...
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active Partners Section */}
          {displayedActive.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[#8b95a3]">
                <Heart className="h-3.5 w-3.5" />
                ACTIVE PARTNERS
              </div>
              
              <div className="space-y-3">
                {displayedActive.map((p) => (
                  <PartnerCard
                    key={p.id}
                    p={p}
                    pending={pending}
                    onSetDefault={() => {
                      startTransition(async () => {
                        const res = await setDefaultPartnerAction(p.id);
                        if (!res.ok) toast.error(res.error);
                        else toast.success("设为默认伴侣");
                        router.refresh();
                      });
                    }}
                    onToggleArchive={() => {
                      startTransition(async () => {
                        const res = await archivePartnerAction(p.id, p.is_active);
                        if (!res.ok) toast.error(res.error);
                        else toast.success("已归档");
                        router.refresh();
                      });
                    }}
                    onDelete={() => {
                      startTransition(async () => {
                        const res = await deletePartnerAction(p.id);
                        if (!res.ok) toast.error(res.error);
                        else toast.success("已删除档案");
                        router.refresh();
                      });
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past Partners Section */}
          {displayedPast.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[#8b95a3]">
                <Archive className="h-3.5 w-3.5" />
                PAST PARTNERS
              </div>
              <div className="space-y-3">
                {displayedPast.map((p) => (
                  <PartnerCard
                    key={p.id}
                    p={p}
                    pending={pending}
                    onSetDefault={() => {}} // Cannot set default for archived
                    onToggleArchive={() => {
                      startTransition(async () => {
                        const res = await archivePartnerAction(p.id, p.is_active);
                        if (!res.ok) toast.error(res.error);
                        else toast.success("已恢复为活跃状态");
                        router.refresh();
                      });
                    }}
                    onDelete={() => {
                      startTransition(async () => {
                        const res = await deletePartnerAction(p.id);
                        if (!res.ok) toast.error(res.error);
                        else toast.success("已彻底删除");
                        router.refresh();
                      });
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <AddPartnerModal open={addModalOpen} onOpenChange={setAddModalOpen} />
    </div>
  );
}
