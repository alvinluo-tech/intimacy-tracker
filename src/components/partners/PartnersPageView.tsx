"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Copy, Check, Link as LinkIcon, Plus, User, Bell, Heart, Archive, MoreVertical, ArrowLeft, Search, ArrowUpDown, Unlink2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";
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

const avatarGradients = [
  "linear-gradient(to bottom right, #3b82f6, #8b5cf6)",
  "linear-gradient(to bottom right, #ec4899, #f43f5e)",
  "linear-gradient(to bottom right, #8b5cf6, #7c3aed)",
];

function pickAvatarGradient(partner: PartnerManageItem) {
  if (partner.status === "past" || partner.status === "archived") {
    return "linear-gradient(to bottom right, #475569, #334155)";
  }

  const first = partner.id.charCodeAt(0) || 0;
  return avatarGradients[first % avatarGradients.length];
}

function PartnerCard({
  p,
  pending,
  onSetDefault,
  onToggleArchive,
  onDelete,
  onUnbind,
}: {
  p: PartnerManageItem;
  pending: boolean;
  onSetDefault: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  onUnbind: () => void;
}) {
  const isArchived = p.status === "past";
  const isBound = p.source === "bound";
  const createdDate = p.created_at ? format(new Date(p.created_at), "MMM yyyy") : "";
  
  return (
    <div className={`group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 transition-all lg:cursor-pointer hover:border-[#f43f5e]/50 ${isArchived ? "opacity-60 hover:opacity-100" : ""}`}>
      <Link href={`/partners/${p.id}`} className="flex flex-1 items-center gap-4 min-w-0">
        <div 
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white"
          style={{ 
            background: pickAvatarGradient(p),
            opacity: isArchived ? 0.6 : 1,
          }}
        >
          <User className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-2">
            <div className={`text-[16px] font-light truncate transition-colors ${isArchived ? "text-slate-300" : "text-slate-200 group-hover:text-[#f43f5e]"}`}>
              {p.nickname}
            </div>
            {p.is_default && !isArchived && (
              <span className="rounded-full bg-[#f43f5e]/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#f43f5e] uppercase">
                Default
              </span>
            )}
          </div>
          <div className={`mt-0.5 flex items-center text-[12px] text-slate-500`}>
            <span>{p.encounterCount} records</span>
            <span className="mx-2 text-[10px] text-slate-700">•</span>
            <span>Since {createdDate}</span>
          </div>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 w-9 px-0 rounded-lg text-slate-400 hover:bg-slate-800 shrink-0" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-700 bg-[#1e293b] shadow-xl p-1 z-20">
          <DropdownMenuItem asChild className="cursor-pointer text-slate-300 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-200 rounded-lg">
            <Link href={`/partners/${p.id}`}>查看详情</Link>
          </DropdownMenuItem>
          {!isArchived && !p.is_default && (
            <DropdownMenuItem 
              disabled={pending} 
              onClick={onSetDefault}
              className="cursor-pointer text-slate-300 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-200 rounded-lg"
            >
              设为默认伴侣
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className="bg-slate-700 mx-1" />
          {isBound ? (
            <ConfirmDeleteDialog
              title="解除账号绑定？"
              description="解除后你们将不再是已绑定状态，可以重新发起绑定请求。"
              pending={pending}
              onConfirm={onUnbind}
              trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="cursor-pointer text-rose-300 focus:bg-rose-900/20 focus:text-rose-300 hover:bg-rose-900/20 rounded-lg"
                >
                  <Unlink2 className="mr-1.5 h-4 w-4" />
                  解除绑定
                </DropdownMenuItem>
              }
            />
          ) : (
            <>
              <DropdownMenuItem 
                disabled={pending} 
                onClick={onToggleArchive}
                className="cursor-pointer text-slate-300 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-200 rounded-lg"
              >
                {isArchived ? "恢复为活跃" : "归档"}
              </DropdownMenuItem>
              <ConfirmDeleteDialog
                title="删除伴侣档案？"
                description="仅删除本地伴侣档案。历史记录中的对象标签会被置空（记录保留），不会解除账号绑定关系。"
                pending={pending}
                onConfirm={onDelete}
                trigger={
                  <DropdownMenuItem 
                    onSelect={(e) => e.preventDefault()} 
                    className="cursor-pointer text-red-400 focus:bg-red-900/20 focus:text-red-400 hover:bg-red-900/20 rounded-lg mt-1"
                  >
                    删除档案
                  </DropdownMenuItem>
                }
              />
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function PartnersPageView({
  partners,
  identityCode,
  incomingRequests,
  outgoingRequests,
}: {
  partners: PartnerManageItem[];
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
  const [sortBy, setSortBy] = useState<"name" | "records" | "date" | "rating">("date");

  const visiblePartners = partners.filter((p) => p.status !== "archived");
  const activePartners = visiblePartners.filter((p) => p.status === "active");
  const pastPartners = visiblePartners.filter((p) => p.status === "past");

  const displayedPartners = visiblePartners
    .filter((p) => {
      if (filter === "active" && p.status !== "active") return false;
      if (filter === "past" && p.status !== "past") return false;
      if (searchQuery && !p.nickname.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name": return a.nickname.localeCompare(b.nickname);
        case "records": return (b.encounterCount || 0) - (a.encounterCount || 0);
        case "rating": {
          // Rating is not available in this list payload yet, keep deterministic fallback.
          return (b.encounterCount || 0) - (a.encounterCount || 0);
        }
        case "date":
        default: {
          const bTime = new Date(b.lastEncounterAt || b.created_at).getTime();
          const aTime = new Date(a.lastEncounterAt || a.created_at).getTime();
          return bTime - aTime;
        }
      }
    });

  const displayedActive = displayedPartners.filter((p) => p.status === "active");
  const displayedPast = displayedPartners.filter((p) => p.status === "past");

  const handleCopyCode = () => {
    if (!identityCode) return;
    navigator.clipboard.writeText(identityCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("已复制身份码");
  };

  return (
    <div className="min-h-[100svh] bg-[#020617] font-light">
      <div className="mx-auto max-w-2xl px-4 py-8 pb-24 md:px-0">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.back()} 
                className="h-10 w-10 px-0 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 -ml-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-[24px] font-light tracking-tight text-slate-200">Partners</h1>
            </div>
            <p className="text-[13px] text-slate-500 ml-[52px]">
              {activePartners.length} active · {pastPartners.length} past
            </p>
          </div>
          <Button
            onClick={() => setAddModalOpen(true)}
            className="rounded-full bg-[#f43f5e] hover:bg-rose-600 text-white font-normal h-10 px-4 shadow-sm text-[14px]"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Search partners..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-xl border border-slate-800 bg-[#0f172a] pl-10 text-[14px] text-slate-200 placeholder:text-slate-600 focus-visible:ring-1 focus-visible:ring-[#f43f5e]/50 focus-visible:border-[#f43f5e]"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="h-10 rounded-xl border border-slate-800 bg-[#0f172a] px-4 text-[14px] font-normal text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl border border-slate-700 bg-[#1e293b] p-1 shadow-xl z-20">
              <DropdownMenuItem onClick={() => setSortBy("date")} className={`cursor-pointer rounded-lg text-slate-300 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-200 ${sortBy === 'date' ? 'bg-[#f43f5e]/20 text-[#f43f5e]' : ''}`}>
                <div className="flex w-full items-center justify-between">
                  <span>Recent Activity</span>
                  {sortBy === "date" && <div className="h-1.5 w-1.5 rounded-full bg-[#f43f5e]" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name")} className={`cursor-pointer rounded-lg text-slate-300 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-200 ${sortBy === 'name' ? 'bg-[#f43f5e]/20 text-[#f43f5e]' : ''}`}>
                <div className="flex w-full items-center justify-between">
                  <span>Name (A-Z)</span>
                  {sortBy === "name" && <div className="h-1.5 w-1.5 rounded-full bg-[#f43f5e]" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("records")} className={`cursor-pointer rounded-lg text-slate-300 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-200 ${sortBy === 'records' ? 'bg-[#f43f5e]/20 text-[#f43f5e]' : ''}`}>
                <div className="flex w-full items-center justify-between">
                  <span>Most Records</span>
                  {sortBy === "records" && <div className="h-1.5 w-1.5 rounded-full bg-[#f43f5e]" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("rating")} className={`cursor-pointer rounded-lg text-slate-300 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-200 ${sortBy === 'rating' ? 'bg-[#f43f5e]/20 text-[#f43f5e]' : ''}`}>
                <div className="flex w-full items-center justify-between">
                  <span>Highest Rating</span>
                  {sortBy === "rating" && <div className="h-1.5 w-1.5 rounded-full bg-[#f43f5e]" />}
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-8 flex gap-2">
          <button 
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-1.5 text-[12px] transition-colors ${filter === "all" ? "bg-[#f43f5e] text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter("active")}
            className={`rounded-full px-4 py-1.5 text-[12px] transition-colors ${filter === "active" ? "bg-[#f43f5e] text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
          >
            Active
          </button>
          <button 
            onClick={() => setFilter("past")}
            className={`rounded-full px-4 py-1.5 text-[12px] transition-colors ${filter === "past" ? "bg-[#f43f5e] text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
          >
            Past
          </button>
        </div>

        <div className="space-y-8">
          {/* Identity Code Section */}
          <section>
            <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-5">
              <div className="mb-4 flex items-center gap-3">
                <LinkIcon className="h-[18px] w-[18px] text-slate-500" />
                <div>
                  <div className="text-[15px] font-light text-slate-200">Your Binding Code</div>
                  <div className="text-[13px] text-slate-400">Share to link with partner</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 p-2 border border-slate-800/50">
                <div className="flex-1 text-center font-mono text-[16px] tracking-wider text-[#f43f5e]">
                  {identityCode || "--------"}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                  disabled={!identityCode}
                  className="h-11 w-11 shrink-0 rounded-lg bg-slate-700 hover:bg-slate-600 focus:bg-slate-600 text-slate-300"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </section>

          {/* Requests Section */}
          {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
            <section>
              <div className="mb-3 flex items-center gap-2 px-1 text-[12px] uppercase tracking-wide text-slate-400">
                <Bell className="h-3.5 w-3.5" />
                PENDING REQUESTS
              </div>
              <div className="space-y-3">
                {incomingRequests.map((req) => (
                  <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#0f172a] border border-amber-500/20 p-4">
                    <div>
                      <div className="text-[16px] font-light text-slate-200">
                        {req.user?.display_name || req.user?.email || "Unknown User"}
                      </div>
                      <div className="text-[12px] text-amber-500/80 mt-0.5">
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
                        className="flex-1 sm:flex-none h-9 bg-slate-800 hover:bg-slate-700 text-slate-300"
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
                  <div key={req.id} className="rounded-xl bg-[#0f172a] border border-slate-800 p-4 text-[13px] text-slate-500">
                    Sent binding request to <span className="font-light text-slate-200">{req.user?.display_name || req.user?.email || "Unknown User"}</span>, waiting for approval...
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active Partners Section */}
          {displayedActive.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2 px-1 text-[12px] uppercase tracking-wide text-slate-400">
                <Heart className="h-3.5 w-3.5 text-[#f43f5e]" />
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
                        const res = await archivePartnerAction(p.id, p.status === "active");
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
                    onUnbind={() => {
                      startTransition(async () => {
                        try {
                          await unbindPartner(p.bound_user_id ?? undefined);
                          toast.success("已解除账号绑定");
                          router.refresh();
                        } catch (err: any) {
                          toast.error(err.message || "解除绑定失败");
                        }
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
              <div className="mb-3 flex items-center gap-2 px-1 text-[12px] uppercase tracking-wide text-slate-400">
                <Archive className="h-3.5 w-3.5 text-slate-500" />
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
                        const res = await archivePartnerAction(p.id, p.status === "active");
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
                    onUnbind={() => {}}
                  />
                ))}
              </div>
            </section>
          )}

          {displayedPartners.length === 0 && (
            <section className="rounded-xl border border-slate-800 bg-[#0f172a] px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-slate-700 bg-slate-800/50">
                {searchQuery ? (
                  <Search className="h-8 w-8 text-slate-500" />
                ) : (
                  <Heart className="h-8 w-8 text-[#f43f5e]" />
                )}
              </div>
              <h3 className="text-[16px] font-light text-slate-200">
                {searchQuery ? "No partners found" : "No partners yet"}
              </h3>
              <p className="mt-1 text-[13px] text-slate-500">
                {searchQuery
                  ? "Try a different search term"
                  : "Add a partner to start tracking together"}
              </p>
            </section>
          )}
        </div>
      </div>

      <AddPartnerModal open={addModalOpen} onOpenChange={setAddModalOpen} />
    </div>
  );
}
