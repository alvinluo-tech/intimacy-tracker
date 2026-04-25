"use client";

import { useState, useTransition } from "react";
import { Lock, MapPin, Download, Trash2, ChevronRight, X, KeyRound, Heart, Shield, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { format } from "date-fns";
import type { User } from "@supabase/supabase-js";

import { savePrivacySettingsAction } from "@/features/privacy/actions";
import type { PrivacySettings } from "@/features/privacy/queries";
import { exportCsvAction } from "@/features/export/actions";
import { deleteAllDataAction } from "@/features/records/actions";
import type { PartnerManageItem } from "@/features/partners/queries";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function SettingsView({
  initial,
  user,
  partners,
}: {
  initial: PrivacySettings;
  user: User | null;
  partners: PartnerManageItem[];
}) {
  const [requirePin, setRequirePin] = useState(initial.requirePin);
  const [locationMode, setLocationMode] = useState<"off" | "city" | "exact">(initial.locationMode);
  
  const [pending, startTransition] = useTransition();

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState("");

  const activePartners = partners.filter((p) => p.is_active).length;
  const pastPartners = partners.filter((p) => !p.is_active).length;
  const joinDate = user?.created_at ? format(new Date(user.created_at), "MMM yyyy") : "";

  const handlePinToggle = (checked: boolean) => {
    if (checked && !initial.hasPin) {
      setPinModalOpen(true);
      return;
    }
    setRequirePin(checked);
    startTransition(async () => {
      const res = await savePrivacySettingsAction({
        timezone: initial.timezone,
        locationMode,
        requirePin: checked,
      });
      if (!res.ok) {
        toast.error(res.error);
        setRequirePin(!checked);
      }
    });
  };

  const handleSaveNewPin = async () => {
    if (newPin.length < 4 || newPin.length > 6) {
      setPinError("PIN must be 4 to 6 digits");
      return;
    }
    
    setPinError("");
    startTransition(async () => {
      const res = await savePrivacySettingsAction({
        timezone: initial.timezone,
        locationMode,
        requirePin: true,
        newPin,
      });
      if (!res.ok) {
        setPinError(res.error);
        return;
      }
      setRequirePin(true);
      setPinModalOpen(false);
      setNewPin("");
      toast.success("PIN set and enabled successfully");
    });
  };

  const handleLocationModeChange = (mode: "off" | "city" | "exact") => {
    if (mode === locationMode) return;
    setLocationMode(mode);
    
    startTransition(async () => {
      const res = await savePrivacySettingsAction({
        timezone: initial.timezone,
        locationMode: mode,
        requirePin,
      });
      if (!res.ok) {
        toast.error(res.error);
        setLocationMode(locationMode); // revert
      }
    });
  };

  const handleExport = () => {
    startTransition(async () => {
      const res = await exportCsvAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      downloadCsv(res.filename, res.csv);
      toast.success(`导出成功，共 ${res.rows} 条记录`);
    });
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleDeleteAll = () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    
    startTransition(async () => {
      const res = await deleteAllDataAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDeleteModalOpen(false);
      setDeleteConfirmText("");
      toast.success("All data has been deleted");
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 md:px-0">
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--app-text)]">Settings</h1>
        <p className="text-[14px] text-[var(--app-text-muted)]">Manage your profile & preferences</p>
      </div>

      <div className="space-y-8">
        {/* PROFILE CARD */}
        <div className="flex items-center gap-4 rounded-[16px] bg-[#141b26] p-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff5577] to-purple-600 text-white">
            <UserIcon className="h-8 w-8" />
          </div>
          <div>
            <div className="text-[18px] font-medium text-[var(--app-text)]">
              {user?.email || "You"}
            </div>
            {joinDate && (
              <div className="text-[13px] text-[var(--app-text-muted)] mb-2">
                Member since {joinDate}
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-white/[0.05] bg-black/20 px-2.5 py-0.5 text-[11px] font-medium">
                <Heart className="h-3 w-3 text-[#ff5577] fill-[#ff5577]" />
                <span className="text-[#ff5577]">{activePartners} Active</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-white/[0.05] bg-black/20 px-2.5 py-0.5 text-[11px] font-medium text-[var(--app-text-muted)]">
                <Trash2 className="h-3 w-3" />
                <span>{pastPartners} Past</span>
              </div>
            </div>
          </div>
        </div>

        {/* PARTNER MANAGEMENT SECTION */}
        <section>
          <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--app-text-subtle)]">
            <Heart className="h-3.5 w-3.5" />
            PARTNER MANAGEMENT
          </div>
          
          <Link href="/partners" className="block">
            <div className="flex items-center justify-between rounded-[16px] bg-[#141b26] p-4 transition-colors hover:bg-[#1a2333]">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-black/20">
                  <Heart className="h-5 w-5 text-[#ff5577]" />
                </div>
                <div>
                  <div className="text-[15px] font-medium text-[var(--app-text)]">Manage Partners</div>
                  <div className="text-[13px] text-[var(--app-text-muted)]">
                    {partners.length} total partners · View details & stats
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--app-text-subtle)]" />
            </div>
          </Link>
        </section>

        {/* PRIVACY & SECURITY SECTION */}
        <section>
          <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--app-text-subtle)]">
            <Shield className="h-3.5 w-3.5" />
            PRIVACY & SECURITY
          </div>
          
          <div className="space-y-3">
            {/* PIN Lock Card */}
            <div className="flex flex-col rounded-[16px] bg-[#141b26] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Lock className="h-5 w-5 text-[var(--app-text-muted)]" />
                  <div>
                    <div className="text-[15px] font-medium text-[var(--app-text)]">PIN Lock</div>
                    <div className="text-[13px] text-[var(--app-text-muted)]">Require PIN to access app</div>
                  </div>
                </div>
                <Switch
                  checked={requirePin}
                  onCheckedChange={handlePinToggle}
                  disabled={pending}
                />
              </div>
              
              {requirePin && (
                <div className="mt-4 pt-4 border-t border-white/[0.05]">
                  <button
                    type="button"
                    onClick={() => setPinModalOpen(true)}
                    className="flex w-full items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <KeyRound className="h-5 w-5 text-[var(--app-text-muted)]" />
                      <div>
                        <div className="text-[14px] font-medium text-[var(--app-text)]">Change PIN</div>
                        <div className="text-[13px] text-[var(--app-text-muted)]">Update your 4~6 digit lock code</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[var(--app-text-subtle)] group-hover:text-[var(--app-text)] transition-colors" />
                  </button>
                </div>
              )}
            </div>

            {/* Location Tracking Card */}
            <div className="rounded-[16px] bg-[#141b26] p-4">
              <div className="mb-4 flex items-center gap-4">
                <MapPin className="h-5 w-5 text-[var(--app-text-muted)]" />
                <div>
                  <div className="text-[15px] font-medium text-[var(--app-text)]">Location Tracking</div>
                  <div className="text-[13px] text-[var(--app-text-muted)]">Choose location precision level</div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleLocationModeChange("off")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[12px] border p-4 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    locationMode === "off"
                      ? "border-[#ff5577] bg-[#ff5577]/10"
                      : "border-transparent bg-white/[0.02] hover:bg-white/[0.04]"
                  )}
                >
                  <div>
                    <div className={cn("text-[14px] font-medium", locationMode === "off" ? "text-[#ff5577]" : "text-[var(--app-text)]")}>
                      Disabled
                    </div>
                    <div className="text-[13px] text-[var(--app-text-muted)] mt-0.5">No location data</div>
                  </div>
                  {locationMode === "off" && (
                    <div className="h-2 w-2 rounded-full bg-[#ff5577]" />
                  )}
                </button>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleLocationModeChange("city")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[12px] border p-4 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    locationMode === "city"
                      ? "border-[var(--brand)] bg-[var(--brand)]/10"
                      : "border-transparent bg-white/[0.02] hover:bg-white/[0.04]"
                  )}
                >
                  <div>
                    <div className={cn("text-[14px] font-medium", locationMode === "city" ? "text-[var(--brand)]" : "text-[var(--app-text)]")}>
                      City Level
                    </div>
                    <div className="text-[13px] text-[var(--app-text-muted)] mt-0.5">Approximate area only</div>
                  </div>
                  {locationMode === "city" && (
                    <div className="h-2 w-2 rounded-full bg-[var(--brand)]" />
                  )}
                </button>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleLocationModeChange("exact")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[12px] border p-4 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    locationMode === "exact"
                      ? "border-[var(--brand)] bg-[var(--brand)]/10"
                      : "border-transparent bg-white/[0.02] hover:bg-white/[0.04]"
                  )}
                >
                  <div>
                    <div className={cn("text-[14px] font-medium", locationMode === "exact" ? "text-[var(--brand)]" : "text-[var(--app-text)]")}>
                      Exact Coordinates
                    </div>
                    <div className="text-[13px] text-[var(--app-text-muted)] mt-0.5">Precise location and map display</div>
                  </div>
                  {locationMode === "exact" && (
                    <div className="h-2 w-2 rounded-full bg-[var(--brand)]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* DATA MANAGEMENT SECTION */}
        <section>
          <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--app-text-subtle)]">
            <Download className="h-3.5 w-3.5" />
            DATA MANAGEMENT
          </div>
          
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={pending}
              className="flex w-full items-center justify-between rounded-[16px] bg-[#141b26] p-4 transition-colors hover:bg-[#1a2333]"
            >
              <div className="flex items-center gap-4">
                <Download className="h-5 w-5 text-[var(--app-text-muted)]" />
                <div>
                  <div className="text-[15px] font-medium text-[var(--app-text)]">Export Data</div>
                  <div className="text-[13px] text-[var(--app-text-muted)]">Download as encrypted CSV</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--app-text-subtle)]" />
            </button>

            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              disabled={pending}
              className="flex w-full items-center justify-between rounded-[16px] bg-[#141b26] p-4 transition-colors hover:bg-[#1a2333]"
            >
              <div className="flex items-center gap-4">
                <Trash2 className="h-5 w-5 text-[#ff5577]" />
                <div>
                  <div className="text-[15px] font-medium text-[#ff5577]">Delete All Data</div>
                  <div className="text-[13px] text-[var(--app-text-muted)]">Permanently erase all records</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-[#ff5577]/50" />
            </button>
          </div>
        </section>
      </div>

      {/* PIN Setup Modal */}
      <Dialog.Root open={pinModalOpen} onOpenChange={setPinModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] p-4 focus:outline-none">
            <div className="flex flex-col rounded-[16px] bg-[var(--app-bg)] p-6 shadow-xl border border-[var(--app-border)]">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-[18px] font-semibold text-[var(--app-text)]">
                  设置 PIN 码
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>
              
              <div className="text-[14px] text-[var(--app-text-muted)] mb-6">
                请输入 4~6 位数字以保护你的应用。
              </div>

              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="••••"
                className="text-center text-[24px] tracking-[0.5em] h-14 bg-white/[0.02]"
              />

              {pinError && (
                <div className="mt-3 text-[13px] text-[#f43f5e]">{pinError}</div>
              )}

              <Button
                onClick={handleSaveNewPin}
                disabled={newPin.length < 4}
                isLoading={pending}
                variant="primary"
                className="mt-6 w-full h-11 text-[15px]"
              >
                保存
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete All Data Modal */}
      <Dialog.Root open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] p-4 focus:outline-none">
            <div className="flex flex-col rounded-[16px] bg-[var(--app-bg)] p-6 shadow-xl border border-[#f43f5e]/20">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-[18px] font-semibold text-[#f43f5e]">
                  清除所有数据
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>
              
              <div className="text-[14px] text-[var(--app-text-muted)] mb-6 space-y-2">
                <p>此操作将永久删除你所有的记录、地点和分析数据。</p>
                <p className="font-medium text-[var(--app-text)]">请输入 <span className="text-[#f43f5e]">DELETE</span> 以确认。</p>
              </div>

              <Input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="h-12 bg-white/[0.02]"
              />

              <div className="mt-6 flex gap-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="flex-1 rounded-[8px] bg-white/[0.05] py-2.5 text-[14px] font-medium text-[var(--app-text)] hover:bg-white/[0.1] transition-colors"
                  >
                    取消
                  </button>
                </Dialog.Close>
                <Button
                  onClick={handleDeleteAll}
                  disabled={deleteConfirmText !== "DELETE"}
                  isLoading={pending}
                  className="flex-1 bg-[#f43f5e] hover:bg-[#e11d48] text-white border-transparent"
                >
                  确认删除
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}