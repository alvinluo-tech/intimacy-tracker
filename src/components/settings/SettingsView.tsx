"use client";

import { useState, useTransition } from "react";
import { Lock, MapPin, Download, Trash2, ChevronRight, X } from "lucide-react";
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

  const handleDeleteAll = () => {
    if (window.confirm("Are you sure you want to permanently erase all encounters? This cannot be undone.")) {
      startTransition(async () => {
        const res = await deleteAllDataAction();
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("All data has been deleted");
      });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 md:px-0">
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--app-text)]">Settings</h1>
        <p className="text-[14px] text-[var(--app-text-muted)]">Privacy & preferences</p>
      </div>

      <div className="space-y-8">
        {/* PRIVACY & SECURITY SECTION */}
        <section>
          <h2 className="mb-3 px-1 text-[11px] font-semibold tracking-wider text-[var(--app-text-subtle)]">
            PRIVACY & SECURITY
          </h2>
          
          <div className="space-y-3">
            {/* PIN Lock Card */}
            <div className="flex items-center justify-between rounded-[16px] bg-[#1a1f2e] p-5 border border-white/[0.02]">
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
                className="data-[state=checked]:bg-[#f43f5e]"
              />
            </div>

            {/* Location Tracking Card */}
            <div className="rounded-[16px] bg-[#1a1f2e] p-5 border border-white/[0.02]">
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
                      ? "border-[#f43f5e] bg-[#f43f5e]/5"
                      : "border-transparent bg-[#11141d] hover:bg-white/[0.04]"
                  )}
                >
                  <div>
                    <div className={cn("text-[14px] font-medium", locationMode === "off" ? "text-[#f43f5e]" : "text-[var(--app-text)]")}>
                      Disabled
                    </div>
                    <div className="text-[13px] text-[var(--app-text-muted)] mt-0.5">No location data</div>
                  </div>
                  {locationMode === "off" && (
                    <div className="h-1.5 w-1.5 rounded-full bg-[#f43f5e]" />
                  )}
                </button>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleLocationModeChange("city")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[12px] border p-4 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    locationMode === "city"
                      ? "border-[#f43f5e] bg-[#f43f5e]/5"
                      : "border-transparent bg-[#11141d] hover:bg-white/[0.04]"
                  )}
                >
                  <div>
                    <div className={cn("text-[14px] font-medium", locationMode === "city" ? "text-[#f43f5e]" : "text-[var(--app-text)]")}>
                      City Level
                    </div>
                    <div className="text-[13px] text-[var(--app-text-muted)] mt-0.5">Approximate area only</div>
                  </div>
                  {locationMode === "city" && (
                    <div className="h-1.5 w-1.5 rounded-full bg-[#f43f5e]" />
                  )}
                </button>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleLocationModeChange("exact")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[12px] border p-4 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    locationMode === "exact"
                      ? "border-[#f43f5e] bg-[#f43f5e]/5"
                      : "border-transparent bg-[#11141d] hover:bg-white/[0.04]"
                  )}
                >
                  <div>
                    <div className={cn("text-[14px] font-medium", locationMode === "exact" ? "text-[#f43f5e]" : "text-[var(--app-text)]")}>
                      Exact
                    </div>
                    <div className="text-[13px] text-[var(--app-text-muted)] mt-0.5">Precise coordinates</div>
                  </div>
                  {locationMode === "exact" && (
                    <div className="h-1.5 w-1.5 rounded-full bg-[#f43f5e]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* DATA MANAGEMENT SECTION */}
        <section>
          <h2 className="mb-3 px-1 text-[11px] font-semibold tracking-wider text-[var(--app-text-subtle)]">
            DATA MANAGEMENT
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
                  <div className="text-[15px] font-medium text-[var(--app-text)]">Export Data</div>
                  <div className="text-[13px] text-[var(--app-text-muted)]">Download as encrypted CSV</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--app-text-subtle)]" />
            </button>

            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={pending}
              className="flex w-full items-center justify-between rounded-[16px] bg-[#1a1f2e] p-5 border border-white/[0.02] text-left transition-colors hover:bg-[#202638]"
            >
              <div className="flex items-center gap-4">
                <Trash2 className="h-5 w-5 text-[#f43f5e]" />
                <div>
                  <div className="text-[15px] font-medium text-[#f43f5e]">Delete All Data</div>
                  <div className="text-[13px] text-[var(--app-text-muted)]">Permanently erase all encounters</div>
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
            <div className="flex flex-col rounded-[16px] bg-[#1a1f2e] p-6 shadow-xl border border-white/[0.05]">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-[18px] font-semibold text-[var(--app-text)]">
                  Set up PIN Lock
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>
              
              <div className="text-[14px] text-[var(--app-text-muted)] mb-6">
                Please enter a 4-6 digit PIN to protect your app.
              </div>

              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="••••"
                className="text-center text-[24px] tracking-[0.5em] h-14"
              />

              {pinError && (
                <div className="mt-3 text-[13px] text-[#f43f5e]">{pinError}</div>
              )}

              <button
                onClick={handleSaveNewPin}
                disabled={pending || newPin.length < 4}
                className="mt-6 flex h-11 w-full items-center justify-center rounded-[8px] bg-[#f43f5e] text-[15px] font-medium text-white transition-colors hover:bg-[#e11d48] disabled:opacity-50"
              >
                {pending ? "Saving..." : "Enable PIN Lock"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}