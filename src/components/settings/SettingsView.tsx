"use client";

import { useState, useTransition } from "react";
import { Lock, MapPin, Download, Trash2, ChevronRight, X, KeyRound } from "lucide-react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";

import { savePrivacySettingsAction } from "@/features/privacy/actions";
import type { PrivacySettings } from "@/features/privacy/queries";
import { exportCsvAction } from "@/features/export/actions";
import { deleteAllDataAction } from "@/features/records/actions";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";

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

export function SettingsView({ initial }: { initial: PrivacySettings }) {
  const [requirePin, setRequirePin] = useState(initial.requirePin);
  const [locationMode, setLocationMode] = useState<"off" | "city" | "exact">(initial.locationMode);
  
  const [pending, startTransition] = useTransition();

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState("");

  const handlePinToggle = (checked: boolean) => {
    if (checked && !initial.hasPin) {
      // Need to set a new PIN first
      setPinModalOpen(true);
      return;
    }
    
    // Toggle directly if they already have a PIN or if they are turning it off
    setRequirePin(checked);
    startTransition(async () => {
      const res = await savePrivacySettingsAction({
        timezone: initial.timezone,
        locationMode,
        requirePin: checked,
      });
      if (!res.ok) {
        toast.error(res.error);
        setRequirePin(!checked); // revert
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
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--app-text)]">设置</h1>
        <p className="text-[14px] text-[var(--app-text-muted)]">隐私与偏好</p>
      </div>

      <div className="space-y-8">
        {/* PRIVACY & SECURITY SECTION */}
        <section>
          <h2 className="mb-3 px-1 text-[11px] font-semibold tracking-wider text-[var(--app-text-subtle)]">
            隐私与安全
          </h2>
          
          <div className="space-y-3">
            {/* PIN Lock Card */}
            <div className="flex flex-col rounded-[16px] bg-[#1a1f2e] p-5 border border-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Lock className="h-5 w-5 text-[var(--app-text-muted)]" />
                  <div>
                    <div className="text-[15px] font-medium text-[var(--app-text)]">应用锁 (PIN)</div>
                    <div className="text-[13px] text-[var(--app-text-muted)]">开启后每次进入应用需验证 PIN 码</div>
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
                        <div className="text-[14px] font-medium text-[var(--app-text)]">修改 PIN 码</div>
                        <div className="text-[13px] text-[var(--app-text-muted)]">重新设置你的 4~6 位解锁密码</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[var(--app-text-subtle)] group-hover:text-[var(--app-text)] transition-colors" />
                  </button>
                </div>
              )}
            </div>

            {/* Location Tracking Card */}
            <div className="rounded-[16px] bg-[#1a1f2e] p-5 border border-white/[0.02]">
              <div className="mb-4 flex items-center gap-4">
                <MapPin className="h-5 w-5 text-[var(--app-text-muted)]" />
                <div>
                  <div className="text-[15px] font-medium text-[var(--app-text)]">地点与隐私</div>
                  <div className="text-[13px] text-[var(--app-text-muted)]">选择默认的位置记录精度</div>
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
                      ? "border-[var(--brand)] bg-[var(--brand)]/10"
                      : "border-transparent bg-white/[0.02] hover:bg-white/[0.04]"
                  )}
                >
                  <div>
                    <div className={cn("text-[14px] font-medium", locationMode === "off" ? "text-[var(--brand)]" : "text-[var(--app-text)]")}>
                      禁用定位
                    </div>
                    <div className="text-[13px] text-[var(--app-text-muted)] mt-0.5">默认不记录任何位置数据</div>
                  </div>
                  {locationMode === "off" && (
                    <div className="h-2 w-2 rounded-full bg-[var(--brand)]" />
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
                      城市级精度
                    </div>
                    <div className="text-[13px] text-[var(--app-text-muted)] mt-0.5">地图上仅展示城市热力图范围</div>
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
                      精确坐标
                    </div>
                    <div className="text-[13px] text-[var(--app-text-muted)] mt-0.5">使用精确的经纬度记录和地图显示</div>
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
          <h2 className="mb-3 px-1 text-[11px] font-semibold tracking-wider text-[var(--app-text-subtle)]">
            数据管理
          </h2>
          
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={pending}
              className="flex w-full items-center justify-between rounded-[16px] bg-[#1a1f2e] p-5 border border-white/[0.02] text-left transition-colors hover:bg-[#202638]"
            >
              <div className="flex items-center gap-4">
                <Download className="h-5 w-5 text-[var(--app-text-muted)]" />
                <div>
                  <div className="text-[15px] font-medium text-[var(--app-text)]">导出数据</div>
                  <div className="text-[13px] text-[var(--app-text-muted)]">下载为加密的 CSV 文件</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--app-text-subtle)]" />
            </button>

            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              disabled={pending}
              className="flex w-full items-center justify-between rounded-[16px] bg-[#1a1f2e] p-5 border border-white/[0.02] text-left transition-colors hover:bg-[#202638]"
            >
              <div className="flex items-center gap-4">
                <Trash2 className="h-5 w-5 text-[#f43f5e]" />
                <div>
                  <div className="text-[15px] font-medium text-[#f43f5e]">删除所有数据</div>
                  <div className="text-[13px] text-[var(--app-text-muted)]">永久抹除所有记录和隐私数据</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-[#f43f5e]/50" />
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

              <button
                onClick={handleSaveNewPin}
                disabled={pending || newPin.length < 4}
                className="mt-6 flex h-11 w-full items-center justify-center rounded-[8px] bg-[var(--brand)] text-[15px] font-medium text-white transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-50"
              >
                {pending ? "保存中..." : "保存"}
              </button>
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
                <button
                  onClick={handleDeleteAll}
                  disabled={pending || deleteConfirmText !== "DELETE"}
                  className="flex-1 rounded-[8px] bg-[#f43f5e] py-2.5 text-[14px] font-medium text-white hover:bg-[#e11d48] transition-colors disabled:opacity-50"
                >
                  {pending ? "删除中..." : "确认删除"}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}