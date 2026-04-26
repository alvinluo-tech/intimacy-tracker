"use client";

import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { format } from "date-fns";
import {
  Archive,
  Bell,
  Camera,
  ChevronRight,
  Download,
  Heart,
  Info,
  KeyRound,
  Lock,
  MapPin,
  PencilLine,
  Shield,
  User as UserIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

import { exportCsvAction } from "@/features/export/actions";
import type { PartnerManageItem } from "@/features/partners/queries";
import { savePrivacySettingsAction, saveProfileAction, verifyPinAction } from "@/features/privacy/actions";
import type { PrivacySettings } from "@/features/privacy/queries";
import { deleteAllDataAction } from "@/features/records/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils/cn";

const PROFILE_STORAGE_KEY = "encounter_profile";
const PIN_STORAGE_KEY = "encounter_pin";
const PIN_ENABLED_STORAGE_KEY = "encounter_pin_enabled";
const PUSH_STORAGE_KEY = "encounter_push_notifications";

type PinFlowMode = "setup" | "change" | "remove";
type PinFlowStep = "verify" | "new" | "confirm";

type LocalProfile = {
  displayName: string;
  avatarUrl: string | null;
};

function LinearSwitch({
  checked,
  onCheckedChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          onCheckedChange(!checked);
        }
      }}
      className={cn(
        "relative h-6 w-12 rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-rose-400/70 bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.38)]"
          : "border-slate-700 bg-slate-700"
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-200",
          checked ? "left-[calc(100%-1.375rem)]" : "left-0.5"
        )}
      />
    </button>
  );
}

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-slate-400">
      {icon}
      {title}
    </h3>
  );
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
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
  const defaultDisplayName = useMemo(() => {
    if (typeof user?.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()) {
      return user.user_metadata.display_name.trim();
    }
    if (user?.email) {
      const fromEmail = user.email.split("@")[0]?.trim();
      if (fromEmail) return fromEmail;
    }
    return "You";
  }, [user?.email, user?.user_metadata]);

  const serverDisplayName = initial.displayName?.trim() || defaultDisplayName;
  const serverAvatarUrl = initial.avatarUrl ?? null;

  const [profile, setProfile] = useState<LocalProfile>({
    displayName: serverDisplayName,
    avatarUrl: serverAvatarUrl,
  });
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [draftName, setDraftName] = useState(serverDisplayName);
  const [draftAvatar, setDraftAvatar] = useState<string | null>(serverAvatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [requirePin, setRequirePin] = useState(initial.requirePin);
  const [hasPin, setHasPin] = useState(initial.hasPin);
  const [locationMode, setLocationMode] = useState<"off" | "city" | "exact">(initial.locationMode);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pending, setPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinMode, setPinMode] = useState<PinFlowMode>("setup");
  const [pinStep, setPinStep] = useState<PinFlowStep>("new");
  const [pinInput, setPinInput] = useState("");
  const [pinCandidate, setPinCandidate] = useState("");
  const [pinError, setPinError] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const activePartners = partners.filter((partner) => partner.is_active).length;
  const pastPartners = partners.filter((partner) => !partner.is_active).length;
  const joinDate = user?.created_at ? format(new Date(user.created_at), "MMM yyyy") : "";

  useEffect(() => {
    const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile) as Partial<LocalProfile>;
        const legacyAvatarDataUrl = (parsed as { avatarDataUrl?: string | null }).avatarDataUrl;
        setProfile({
          displayName:
            typeof parsed.displayName === "string" && parsed.displayName.trim().length > 0
              ? parsed.displayName
              : serverDisplayName,
          avatarUrl:
            typeof parsed.avatarUrl === "string" && parsed.avatarUrl.length > 0
              ? parsed.avatarUrl
              : typeof legacyAvatarDataUrl === "string" && legacyAvatarDataUrl.length > 0
                ? legacyAvatarDataUrl
              : serverAvatarUrl,
        });
      } catch {
        setProfile({ displayName: serverDisplayName, avatarUrl: serverAvatarUrl });
      }
    }

    const storedPush = localStorage.getItem(PUSH_STORAGE_KEY);
    if (storedPush === "0") {
      setPushEnabled(false);
    }

    const storedPinEnabled = localStorage.getItem(PIN_ENABLED_STORAGE_KEY);
    if (storedPinEnabled === "0" || storedPinEnabled === "1") {
      setRequirePin(storedPinEnabled === "1");
    }

    const storedLocationMode = localStorage.getItem("encounter_location_mode");
    if (storedLocationMode === "off" || storedLocationMode === "city" || storedLocationMode === "exact") {
      setLocationMode(storedLocationMode);
    }

    setHydrated(true);
  }, [serverAvatarUrl, serverDisplayName]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PIN_ENABLED_STORAGE_KEY, requirePin ? "1" : "0");
  }, [hydrated, requirePin]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PUSH_STORAGE_KEY, pushEnabled ? "1" : "0");
  }, [hydrated, pushEnabled]);

  const persistPrivacy = async (payload: {
    requirePin: boolean;
    locationMode: "off" | "city" | "exact";
    newPin?: string;
    removePin?: boolean;
    currentPin?: string;
  }) => {
    if (pending) return false;
    setPending(true);
    try {
      const res = await savePrivacySettingsAction({
        timezone: initial.timezone,
        locationMode: payload.locationMode,
        requirePin: payload.requirePin,
        newPin: payload.newPin,
        removePin: payload.removePin,
        currentPin: payload.currentPin,
      });
      if (!res.ok) {
        toast.error(res.error);
        return false;
      }
      return true;
    } finally {
      setPending(false);
    }
  };

  const openProfileModal = () => {
    setDraftName(profile.displayName);
    setDraftAvatar(profile.avatarUrl);
    setProfileModalOpen(true);
  };

  const saveProfile = async () => {
    if (pending || avatarUploading) return;
    const nextName = draftName.trim() || "You";
    setPending(true);
    const res = await saveProfileAction({
      displayName: nextName,
      avatarUrl: draftAvatar,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    const nextProfile: LocalProfile = {
      displayName: nextName,
      avatarUrl: draftAvatar,
    };
    setProfile(nextProfile);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
    setProfileModalOpen(false);
    toast.success("Profile updated");
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be below 2MB");
      return;
    }

    if (!user?.id) {
      toast.error("Please log in again");
      return;
    }

    setAvatarUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "jpg";
      const fileExt = ext && /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      if (!publicData.publicUrl) {
        toast.error("Failed to get avatar URL");
        return;
      }

      setDraftAvatar(publicData.publicUrl);
      toast.success("Avatar uploaded");
    } finally {
      setAvatarUploading(false);
    }

    event.target.value = "";
  };

  const openPinModal = (mode: PinFlowMode) => {
    setPinMode(mode);
    setPinStep(mode === "setup" ? "new" : "verify");
    setPinInput("");
    setPinCandidate("");
    setPinError("");
    setPinModalOpen(true);
  };

  const closePinModal = () => {
    setPinModalOpen(false);
    setPinInput("");
    setPinCandidate("");
    setPinError("");
  };

  const isValidPinLength = (value: string) => /^\d{4,6}$/.test(value);

  const handlePinToggle = async (checked: boolean) => {
    if (checked && !hasPin) {
      openPinModal("setup");
      return;
    }

    const previous = requirePin;
    setRequirePin(checked);
    const ok = await persistPrivacy({ requirePin: checked, locationMode });
    if (!ok) {
      setRequirePin(previous);
      return;
    }
    localStorage.setItem(PIN_ENABLED_STORAGE_KEY, checked ? "1" : "0");
  };

  const handlePinFlowSubmit = async () => {
    if (pending) return;

    if (pinStep === "verify") {
      if (!pinInput) {
        setPinError("Please enter your current PIN");
        return;
      }

      setPinError("");
      setPending(true);
      try {
        const verify = await verifyPinAction(pinInput);
        if (!verify.ok) {
          setPinError("Incorrect PIN");
          return;
        }
      } finally {
        setPending(false);
      }

      if (pinMode === "remove") {
        const ok = await persistPrivacy({
          requirePin: false,
          locationMode,
          removePin: true,
          currentPin: pinInput,
        });
        if (!ok) return;

        setHasPin(false);
        setRequirePin(false);
        localStorage.removeItem(PIN_STORAGE_KEY);
        localStorage.setItem(PIN_ENABLED_STORAGE_KEY, "0");
        closePinModal();
        toast.success("PIN removed");
        return;
      }

      setPinStep("new");
      setPinInput("");
      return;
    }

    if (pinStep === "new") {
      if (!isValidPinLength(pinInput)) {
        setPinError("PIN must be 4 to 6 digits");
        return;
      }

      setPinError("");
      setPinCandidate(pinInput);
      setPinInput("");
      setPinStep("confirm");
      return;
    }

    if (!isValidPinLength(pinInput)) {
      setPinError("PIN must be 4 to 6 digits");
      return;
    }
    if (pinInput !== pinCandidate) {
      setPinError("PINs don't match");
      return;
    }

    const ok = await persistPrivacy({
      requirePin: true,
      locationMode,
      newPin: pinInput,
    });
    if (!ok) return;

    setHasPin(true);
    setRequirePin(true);
    localStorage.setItem(PIN_STORAGE_KEY, pinInput);
    localStorage.setItem(PIN_ENABLED_STORAGE_KEY, "1");
    closePinModal();
    toast.success(pinMode === "setup" ? "PIN set successfully" : "PIN changed successfully");
  };

  const handleLocationModeChange = async (mode: "off" | "city" | "exact") => {
    if (mode === locationMode) return;

    const previous = locationMode;
    setLocationMode(mode);
    const ok = await persistPrivacy({ requirePin, locationMode: mode });
    if (!ok) {
      setLocationMode(previous);
      return;
    }
    localStorage.setItem("encounter_location_mode", mode);
  };

  const handleExport = async () => {
    if (pending) return;

    setPending(true);
    try {
      const res = await exportCsvAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      downloadCsv(res.filename, res.csv);
      toast.success(`Export successful: ${res.rows} rows`);
    } finally {
      setPending(false);
    }
  };

  const handleDeleteAll = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    if (pending) return;

    setPending(true);
    try {
      const res = await deleteAllDataAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDeleteModalOpen(false);
      setDeleteConfirmText("");
      toast.success("All data has been deleted");
    } finally {
      setPending(false);
    }
  };

  const pinTitle =
    pinMode === "setup"
      ? "Set up PIN"
      : pinMode === "change"
        ? "Change PIN"
        : "Remove PIN";
  const pinDescription =
    pinStep === "verify"
      ? "Verify current PIN"
      : pinStep === "new"
        ? "Set a new 4-6 digit PIN"
        : "Confirm your new PIN";
  const pinPrimaryLabel =
    pinStep === "verify"
      ? pinMode === "remove"
        ? "Remove PIN"
        : "Continue"
      : pinStep === "new"
        ? "Continue"
        : "Save PIN";

  const profileName = profile.displayName.trim() || "You";

  const locationOptions: Array<{
    value: "off" | "city" | "exact";
    title: string;
    subtitle: string;
  }> = [
    { value: "off", title: "Disabled", subtitle: "No location data" },
    { value: "city", title: "City Level", subtitle: "Approximate area only" },
    { value: "exact", title: "Exact", subtitle: "Precise coordinates" },
  ];

  return (
    <div className="relative mx-auto max-w-4xl px-4 pb-24 pt-8 font-light md:px-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(168,85,247,0.16),transparent_32%),radial-gradient(circle_at_85%_5%,rgba(244,63,94,0.16),transparent_30%)]" />

      <header className="mb-8">
        <h1 className="text-[24px] font-light tracking-[0.01em] text-slate-100">Settings</h1>
        <p className="mt-1 text-[13px] text-slate-500">Manage your profile & preferences</p>
      </header>

      <div className="space-y-7">
        <button
          type="button"
          onClick={openProfileModal}
          className="group flex w-full items-center gap-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-left transition-colors hover:border-rose-500/30"
        >
          <div className="relative h-20 w-20 shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-rose-500 p-[1px]">
            <div className="h-full w-full overflow-hidden rounded-full bg-slate-900">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-rose-500 text-white">
                  <UserIcon className="h-8 w-8" />
                </div>
              )}
            </div>
            <span className="absolute bottom-0 right-0 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 group-hover:flex">
              <PencilLine className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[18px] font-light text-slate-100">{profileName}</p>
              <PencilLine className="hidden h-3.5 w-3.5 text-slate-400 group-hover:inline-block" />
            </div>
            {joinDate ? <p className="mt-1 text-[13px] text-slate-500">Member since {joinDate}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/70 px-3 py-1.5 text-[13px] text-rose-300">
                <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" />
                {activePartners} Active
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/60 px-3 py-1.5 text-[13px] text-slate-400">
                <Archive className="h-3.5 w-3.5" />
                {pastPartners} Past
              </span>
            </div>
          </div>
        </button>

        <section>
          <SectionHeader icon={<Heart className="h-3.5 w-3.5" />} title="Partner Management" />
          <Link
            href="/partners"
            className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-colors hover:border-rose-500/50"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-rose-500/20 text-rose-400 transition-colors group-hover:text-rose-300">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[18px] font-light text-slate-100 transition-colors group-hover:text-rose-300">Manage Partners</p>
                <p className="text-[14px] text-slate-500 transition-colors group-hover:text-rose-300/80">{partners.length} total partners · View details & stats</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-rose-400" />
          </Link>
        </section>

        <section>
          <SectionHeader icon={<Shield className="h-3.5 w-3.5" />} title="Privacy and Security" />

          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-slate-500" />
                  <div>
                    <div className="text-[18px] font-light text-slate-100">PIN Lock</div>
                    <div className="text-[14px] text-slate-500">
                      {hasPin
                        ? requirePin
                          ? "Require PIN to access app"
                          : "PIN saved but currently disabled"
                        : "Set up PIN protection"}
                    </div>
                  </div>
                </div>

                {hasPin ? (
                  <LinearSwitch
                    checked={requirePin}
                    onCheckedChange={handlePinToggle}
                    disabled={pending}
                    ariaLabel="Toggle PIN Lock"
                  />
                ) : null}
              </div>

              {!hasPin ? (
                <button
                  type="button"
                  onClick={() => openPinModal("setup")}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-500 text-[15px] text-white shadow-[0_0_16px_rgba(244,63,94,0.32)] transition-colors hover:bg-rose-400"
                >
                  <KeyRound className="h-4 w-4" />
                  Set Up PIN
                </button>
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => openPinModal("change")}
                    className="h-11 rounded-xl bg-slate-800/80 text-[14px] text-slate-200 transition-colors hover:bg-slate-700"
                  >
                    Change PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => openPinModal("remove")}
                    className="h-11 rounded-xl bg-slate-800/80 text-[14px] text-slate-300 transition-colors hover:bg-red-900/30 hover:text-red-300"
                  >
                    Remove PIN
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="mb-3 flex items-center gap-3">
                <MapPin className="h-5 w-5 text-slate-500" />
                <div>
                  <div className="text-[18px] font-light text-slate-100">Location Tracking</div>
                  <div className="text-[14px] text-slate-500">Choose location precision level</div>
                </div>
              </div>

              <div className="space-y-2">
                {locationOptions.map((option) => {
                  const selected = locationMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={pending}
                      onClick={() => handleLocationModeChange(option.value)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                        selected
                          ? "border-rose-500 bg-rose-500/10"
                          : "border-slate-800 text-slate-300 hover:border-slate-700"
                      )}
                    >
                      <div>
                        <p className={cn("text-[17px] font-light", selected ? "text-rose-400" : "text-slate-200")}>
                          {option.title}
                        </p>
                        <p className="text-[14px] text-slate-500">{option.subtitle}</p>
                      </div>
                      {selected ? <span className="h-2 w-2 rounded-full bg-rose-500" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section>
          <SectionHeader icon={<Bell className="h-3.5 w-3.5" />} title="Notifications" />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-slate-500" />
                <div>
                  <div className="text-[18px] font-light text-slate-100">Push Notifications</div>
                  <div className="text-[14px] text-slate-500">Daily reminders and insights</div>
                </div>
              </div>
              <LinearSwitch
                checked={pushEnabled}
                onCheckedChange={setPushEnabled}
                ariaLabel="Toggle Push Notifications"
              />
            </div>
          </div>
        </section>

        <section>
          <SectionHeader icon={<Download className="h-3.5 w-3.5" />} title="Data Management" />
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={pending}
              className="group flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition-colors hover:border-slate-700"
            >
              <div>
                <div className="text-[18px] font-light text-slate-100">Export Data</div>
                <div className="text-[14px] text-slate-500">Download as encrypted CSV</div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-rose-400" />
            </button>

            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              disabled={pending}
              className="group flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition-colors hover:border-red-900/50"
            >
              <div>
                <div className="text-[18px] font-light text-red-400">Delete All Data</div>
                <div className="text-[14px] text-slate-500">Permanently erase all encounters</div>
              </div>
              <ChevronRight className="h-5 w-5 text-red-900 transition-colors group-hover:text-red-500" />
            </button>
          </div>
        </section>

        <section>
          <SectionHeader icon={<Info className="h-3.5 w-3.5" />} title="About" />
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => toast.info("Privacy Policy is coming soon")}
              className="group flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition-colors hover:border-slate-700"
            >
              <span className="text-[18px] font-light text-slate-100">Privacy Policy</span>
              <ChevronRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-rose-400" />
            </button>
            <button
              type="button"
              onClick={() => toast.info("Terms of Service is coming soon")}
              className="group flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition-colors hover:border-slate-700"
            >
              <span className="text-[18px] font-light text-slate-100">Terms of Service</span>
              <ChevronRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-rose-400" />
            </button>
          </div>
        </section>

        <footer className="border-t border-slate-800 pt-5 text-center">
          <p className="text-[11px] text-slate-600">Encounter v1.0.0</p>
          <p className="mt-1 text-[10px] text-slate-700">All data is encrypted and stored locally</p>
        </footer>
      </div>

      <Dialog.Root open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-slate-900 p-6 focus:outline-none">
            <div className="mb-5 flex items-center justify-between">
              <Dialog.Title className="text-[20px] font-light text-slate-100">Edit Profile</Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="mb-5 flex flex-col items-center">
              <button
                type="button"
                disabled={avatarUploading || pending}
                onClick={() => avatarInputRef.current?.click()}
                className="relative h-24 w-24 overflow-hidden rounded-full border border-slate-700 bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {draftAvatar ? (
                  <img src={draftAvatar} alt="Avatar preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-rose-500 text-white">
                    <UserIcon className="h-9 w-9" />
                  </div>
                )}
                <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200">
                  <Camera className="h-3.5 w-3.5" />
                </span>
              </button>

              <p className="mt-2 text-[12px] text-slate-500">{avatarUploading ? "Uploading..." : "Click to upload photo"}</p>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <div>
              <label htmlFor="profile-name" className="mb-2 block text-[13px] text-slate-400">
                Display Name
              </label>
              <input
                id="profile-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                maxLength={32}
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-800/70 px-3 text-[14px] text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-rose-500/50"
                placeholder="Display name"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                disabled={avatarUploading || pending}
                className="h-10 rounded-xl bg-slate-800 px-4 text-[14px] text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={avatarUploading || pending}
                onClick={saveProfile}
                className="h-10 rounded-xl bg-rose-500 px-4 text-[14px] text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Saving..." : "Save"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={pinModalOpen} onOpenChange={(open) => (open ? setPinModalOpen(true) : closePinModal())}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-slate-900 p-6 focus:outline-none">
            <div className="mb-2 flex items-center justify-between">
              <Dialog.Title className="text-[20px] font-light text-slate-100">{pinTitle}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <p className="mb-4 text-[13px] text-slate-500">{pinDescription}</p>

            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={pinInput}
              onChange={(event) => {
                setPinInput(event.target.value.replace(/\D/g, ""));
                setPinError("");
              }}
              placeholder="......"
              className="h-12 w-full rounded-xl border border-slate-800 bg-slate-800/70 px-3 text-center text-[20px] tracking-[0.35em] text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/30"
            />

            {pinError ? <p className="mt-2 text-[13px] text-rose-400">{pinError}</p> : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closePinModal}
                className="h-10 rounded-xl bg-slate-800 px-4 text-[14px] text-slate-200 transition-colors hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || pinInput.length === 0}
                onClick={handlePinFlowSubmit}
                className="h-10 rounded-xl bg-rose-500 px-4 text-[14px] text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pinPrimaryLabel}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rose-500/25 bg-slate-900 p-6 focus:outline-none">
            <div className="mb-2 flex items-center justify-between">
              <Dialog.Title className="text-[20px] font-light text-rose-400">Delete All Data</Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <p className="mb-3 text-[14px] text-slate-400">
              This action permanently removes all records. Type DELETE to confirm.
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder="DELETE"
              className="h-11 w-full rounded-xl border border-slate-800 bg-slate-800/70 px-3 text-[14px] text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-rose-500/50"
            />

            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button className="h-10 rounded-xl bg-slate-800 px-4 text-[14px] text-slate-200 transition-colors hover:bg-slate-700">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                disabled={pending || deleteConfirmText !== "DELETE"}
                onClick={handleDeleteAll}
                className="h-10 rounded-xl bg-rose-500 px-4 text-[14px] text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
