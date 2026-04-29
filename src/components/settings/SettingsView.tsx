"use client";

import { useTranslations, useLocale } from "next-intl";
import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { format } from "date-fns";
import {
  Archive,
  Bell,
  Camera,
  ChevronRight,
  Clock,
  Download,
  Languages,
  Heart,
  Info,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
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
import { savePrivacySettingsAction, saveProfileAction, saveTimezoneAction, verifyPinAction } from "@/features/privacy/actions";
import type { PrivacySettings } from "@/features/privacy/queries";
import { deleteAllDataAction } from "@/features/records/actions";
import { signOutAction, changePasswordAction, deleteAccountAction } from "@/features/auth/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { compressImage } from "@/lib/utils/compressImage";
import { cn } from "@/lib/utils/cn";
import { FeedbackModal } from "@/components/settings/FeedbackModal";
import { AvatarCropper } from "@/components/ui/AvatarCropper";

const PROFILE_STORAGE_KEY = "encounter_profile";
const PUSH_STORAGE_KEY = "encounter_push_notifications";

type PinFlowMode = "setup" | "change" | "remove";
type PinFlowStep = "verify" | "new" | "confirm";

type LocalProfile = {
  displayName: string;
  avatarUrl: string | null;
};

function getTimezoneOptions(): string[] {
  if (typeof Intl !== "undefined" && Intl.supportedValuesOf) {
    return Intl.supportedValuesOf("timeZone");
  }
  return [
    "UTC",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Madrid",
    "Europe/Rome",
    "Europe/Stockholm",
    "Europe/Moscow",
    "Europe/Istanbul",
    "Asia/Dubai",
    "Asia/Karachi",
    "Asia/Kolkata",
    "Asia/Dhaka",
    "Asia/Bangkok",
    "Asia/Singapore",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Australia/Sydney",
    "Pacific/Auckland",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "America/Halifax",
    "America/St_Johns",
    "America/Sao_Paulo",
    "America/Mexico_City",
    "America/Phoenix",
  ];
}

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
    return tc("you");
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
  const locale = useLocale();
  const [timezone, setTimezone] = useState(initial.timezone);
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

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);

  const [pwChangeModalOpen, setPwChangeModalOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");

  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState("");

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const tp = useTranslations("pin");
  const tpr = useTranslations("partners");

  const activePartners = partners.filter((p) => p.status === "active").length;
  const pastPartners = partners.filter((p) => p.status === "past").length;
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

    const storedLocationMode = localStorage.getItem("encounter_location_mode");
    if (storedLocationMode === "off" || storedLocationMode === "city" || storedLocationMode === "exact") {
      setLocationMode(storedLocationMode);
    }

    setHydrated(true);
  }, [serverAvatarUrl, serverDisplayName]);

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
        timezone,
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
    const nextName = draftName.trim() || tc("you");
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
    toast.success(t("profileUpdated"));
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("chooseImageError"));
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error(t("imageSizeError"));
      return;
    }

    setAvatarUploading(true);
    try {
      const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1024 });
      const objectUrl = URL.createObjectURL(compressed);
      setCropImageUrl(objectUrl);
      setCropModalOpen(true);
    } finally {
      setAvatarUploading(false);
    }

    event.target.value = "";
  };

  const handleAvatarCropComplete = async (croppedBlob: Blob) => {
    if (!user?.id) {
      toast.error(t("loginAgainError"));
      return;
    }

    setAvatarUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      if (!publicData.publicUrl) {
        toast.error(t("avatarUrlError"));
        return;
      }

      setDraftAvatar(publicData.publicUrl);
      toast.success(t("photoUploaded"));
    } finally {
      setAvatarUploading(false);
    }

    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl(null);
    setCropModalOpen(false);
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
  };

  const handlePinFlowSubmit = async () => {
    if (pending) return;

    if (pinStep === "verify") {
      if (!pinInput) {
        setPinError(tp("enterCurrentPin"));
        return;
      }

      setPinError("");
      setPending(true);
      try {
        const verify = await verifyPinAction(pinInput);
        if (!verify.ok) {
          setPinError(tp("wrongPin"));
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
        closePinModal();
        toast.success(tp("pinReset"));
        return;
      }

      setPinStep("new");
      setPinInput("");
      return;
    }

    if (pinStep === "new") {
      if (!isValidPinLength(pinInput)) {
        setPinError(tp("pinTooShort"));
        return;
      }

      setPinError("");
      setPinCandidate(pinInput);
      setPinInput("");
      setPinStep("confirm");
      return;
    }

    if (!isValidPinLength(pinInput)) {
      setPinError(tp("pinTooShort"));
      return;
    }
    if (pinInput !== pinCandidate) {
      setPinError(tp("pinMismatch"));
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
    closePinModal();
    toast.success(pinMode === "setup" ? tp("pinSet") : tp("pinChanged"));
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
      toast.success(t("exportSuccess", { rows: res.rows }));
    } finally {
      setPending(false);
    }
  };

  const handleDeleteAll = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error(t("pleaseTypeDelete"));
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
      toast.success(t("allDataDeleted"));
    } finally {
      setPending(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwError(tc("error"));
      return;
    }
    if (pwNew.length < 8) {
      setPwError(t("newPasswordMinLength"));
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError(t("passwordsDoNotMatch"));
      return;
    }

    setPending(true);
    setPwError("");
    try {
      const res = await changePasswordAction(pwCurrent, pwNew);
      if ("error" in res) {
        setPwError(res.error);
        return;
      }
      toast.success(t("passwordChanged"));
      setPwChangeModalOpen(false);
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    } finally {
      setPending(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirmText !== "DELETE") {
      setDeleteAccountError(t("pleaseTypeDelete"));
      return;
    }
    if (!deleteAccountPassword) {
      setDeleteAccountError(t("pleaseEnterCurrentPassword"));
      return;
    }

    setPending(true);
    setDeleteAccountError("");
    try {
      const res = await deleteAccountAction(deleteAccountPassword);
      // redirect happens in action on success, so if we get here it's an error
      if ("error" in res) {
        setDeleteAccountError(res.error);
        return;
      }
    } finally {
      setPending(false);
    }
  };

  const pinTitle =
    pinMode === "setup"
      ? tp("setUpPin")
      : pinMode === "change"
        ? tp("changePin")
        : t("removePin");
  const pinDescription =
    pinStep === "verify"
      ? tp("enterCurrentPin")
      : pinStep === "new"
        ? tp("enterNewPin")
        : tp("confirmPin");
  const pinPrimaryLabel =
    pinStep === "verify"
      ? pinMode === "remove"
        ? t("removePin")
        : tc("continue")
      : pinStep === "new"
        ? tc("continue")
        : tc("save");

  const profileName = profile.displayName.trim() || tc("you");

  const locationOptions: Array<{
    value: "off" | "city" | "exact";
    title: string;
    subtitle: string;
  }> = [
    { value: "off", title: t("locationDisabled"), subtitle: t("locationDisabledSubtitle") },
    { value: "city", title: t("locationCity"), subtitle: t("locationCitySubtitle") },
    { value: "exact", title: t("locationExact"), subtitle: t("locationExactSubtitle") },
  ];

  return (
    <div className="relative mx-auto max-w-4xl px-4 pb-24 pt-8 font-light md:px-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(168,85,247,0.16),transparent_32%),radial-gradient(circle_at_85%_5%,rgba(244,63,94,0.16),transparent_30%)]" />

      <header className="mb-8">
        <h1 className="text-[24px] font-light tracking-[0.01em] text-slate-100">{t("title")}</h1>
        <p className="mt-1 text-[13px] text-slate-500">{t("profile")}</p>
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
                <img src={profile.avatarUrl} alt={t("profileAvatar")} className="h-full w-full object-cover" />
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
            {joinDate ? <p className="mt-1 text-[13px] text-slate-500">{t("memberSince")} {joinDate}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/70 px-3 py-1.5 text-[13px] text-rose-300">
                <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" />
                {activePartners} {tc("active")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/60 px-3 py-1.5 text-[13px] text-slate-400">
                <Archive className="h-3.5 w-3.5" />
                {pastPartners} {tc("past")}
              </span>
            </div>
          </div>
        </button>

        <section>
          <SectionHeader icon={<Heart className="h-3.5 w-3.5" />} title={t("partnerManagement")} />
          <Link
            href="/partners"
            className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-colors hover:border-rose-500/50"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-rose-500/20 text-rose-400 transition-colors group-hover:text-rose-300">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[18px] font-light text-slate-100 transition-colors group-hover:text-rose-300">{t("partnerManagement")}</p>
                <p className="text-[14px] text-slate-500 transition-colors group-hover:text-rose-300/80">{activePartners + pastPartners} {t("totalPartners")}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-rose-400" />
          </Link>
        </section>

        <section>
          <SectionHeader icon={<Shield className="h-3.5 w-3.5" />} title={t("privacyAndSecurity")} />

          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-slate-500" />
                  <div>
                    <div className="text-[18px] font-light text-slate-100">{t("pinLock")}</div>
                    <div className="text-[14px] text-slate-500">
                      {hasPin
                        ? requirePin
                          ? t("pinRequire")
                          : t("pinSavedDisabled")
                        : t("pinSetup")}
                    </div>
                  </div>
                </div>

                {hasPin ? (
                  <LinearSwitch
                    checked={requirePin}
                    onCheckedChange={handlePinToggle}
                    disabled={pending}
                    ariaLabel={t("togglePinLock")}
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
                  {tp("setUpPin")}
                </button>
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => openPinModal("change")}
                    className="h-11 rounded-xl bg-slate-800/80 text-[14px] text-slate-200 transition-colors hover:bg-slate-700"
                  >
                    {tp("changePin")}
                  </button>
                  <button
                    type="button"
                    onClick={() => openPinModal("remove")}
                    className="h-11 rounded-xl bg-slate-800/80 text-[14px] text-slate-300 transition-colors hover:bg-red-900/30 hover:text-red-300"
                  >
                    {t("removePin")}
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="mb-3 flex items-center gap-3">
                <MapPin className="h-5 w-5 text-slate-500" />
                <div>
                  <div className="text-[18px] font-light text-slate-100">{t("locationTracking")}</div>
                  <div className="text-[14px] text-slate-500">{t("locationPrecision")}</div>
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
          <SectionHeader icon={<Languages className="h-3.5 w-3.5" />} title={t("language")} />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="mb-3 flex items-center gap-3">
              <Languages className="h-5 w-5 text-slate-500" />
              <div>
                <div className="text-[18px] font-light text-slate-100">{t("language")}</div>
                <div className="text-[14px] text-slate-500">{t("languageDescription")}</div>
              </div>
            </div>
            <select
              value={locale}
              onChange={(e) => {
                const next = e.target.value;
                document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
                window.location.reload();
              }}
              className="h-11 w-full rounded-xl border border-slate-800 bg-slate-800/70 px-3 text-[14px] text-slate-100 outline-none transition-colors focus:border-rose-500/50"
            >
              <option value="en" className="bg-slate-900 text-slate-200">English</option>
              <option value="zh" className="bg-slate-900 text-slate-200">中文</option>
            </select>
          </div>
        </section>

        <section>
          <SectionHeader icon={<Clock className="h-3.5 w-3.5" />} title={t("dateAndTime")} />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="mb-3 flex items-center gap-3">
              <Clock className="h-5 w-5 text-slate-500" />
              <div>
                <div className="text-[18px] font-light text-slate-100">{t("timezone")}</div>
                <div className="text-[14px] text-slate-500">{t("timezoneDescription")}</div>
              </div>
            </div>
            <select
              value={timezone}
              onChange={async (e) => {
                const next = e.target.value;
                setTimezone(next);
                const res = await saveTimezoneAction(next);
                if (!res.ok) {
                  setTimezone(initial.timezone);
                  toast.error(res.error);
                }
              }}
              disabled={pending}
              className="h-11 w-full rounded-xl border border-slate-800 bg-slate-800/70 px-3 text-[14px] text-slate-100 outline-none transition-colors focus:border-rose-500/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {getTimezoneOptions().map((tz) => (
                <option key={tz} value={tz} className="bg-slate-900 text-slate-200">
                  {tz}
                </option>
              ))}
            </select>
            <p className="mt-3 text-[12px] text-slate-500 leading-relaxed">
              {t("timezoneDescription")}
            </p>
          </div>
        </section>

        <section>
          <SectionHeader icon={<Bell className="h-3.5 w-3.5" />} title={t("notifications")} />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-slate-500" />
                <div>
                  <div className="text-[18px] font-light text-slate-100">{t("pushNotifications")}</div>
                  <div className="text-[14px] text-slate-500">{t("pushNotificationsSubtitle")}</div>
                </div>
              </div>
              <LinearSwitch
                checked={pushEnabled}
                onCheckedChange={setPushEnabled}
                ariaLabel={t("togglePushNotifications")}
              />
            </div>
          </div>
        </section>

        <section>
          <SectionHeader icon={<Download className="h-3.5 w-3.5" />} title={t("dataManagement")} />
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={pending}
              className="group flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition-colors hover:border-slate-700"
            >
              <div>
                <div className="text-[18px] font-light text-slate-100">{t("exportData")}</div>
                <div className="text-[14px] text-slate-500">{t("downloadEncryptedCsv")}</div>
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
                <div className="text-[18px] font-light text-red-400">{t("deleteAllData")}</div>
                <div className="text-[14px] text-slate-500">{t("permanentlyErase")}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-red-900 transition-colors group-hover:text-red-500" />
            </button>
          </div>
        </section>

        <section>
          <SectionHeader icon={<Info className="h-3.5 w-3.5" />} title={t("about")} />
          <div className="space-y-3">
            <Link
              href="/settings/about"
              className="group flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition-colors hover:border-rose-500/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-rose-500/20 text-rose-400 transition-colors group-hover:text-rose-300">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[18px] font-light text-slate-100 transition-colors group-hover:text-rose-300">{t("about")}</p>
                  <p className="text-[14px] text-slate-500 transition-colors group-hover:text-rose-300/80">{t("developerInfo")}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-rose-400" />
            </Link>
            <button
              type="button"
              onClick={() => setFeedbackModalOpen(true)}
              className="group flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition-colors hover:border-rose-500/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-rose-500/20 text-rose-400 transition-colors group-hover:text-rose-300">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[18px] font-light text-slate-100 transition-colors group-hover:text-rose-300">{t("feedbackCenter")}</p>
                  <p className="text-[14px] text-slate-500 transition-colors group-hover:text-rose-300/80">{t("shareThoughts")}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-rose-400" />
            </button>
            <Link
              href="/settings/privacy-policy"
              className="group flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition-colors hover:border-slate-700"
            >
              <span className="text-[18px] font-light text-slate-100">{t("privacyPolicy")}</span>
              <ChevronRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-rose-400" />
            </Link>
            <Link
              href="/settings/terms-of-service"
              className="group flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition-colors hover:border-slate-700"
            >
              <span className="text-[18px] font-light text-slate-100">{t("termsOfService")}</span>
              <ChevronRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-rose-400" />
            </Link>
          </div>
        </section>

        <section>
          <SectionHeader icon={<Shield className="h-3.5 w-3.5" />} title={t("account")} />
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setPwCurrent("");
                setPwNew("");
                setPwConfirm("");
                setPwError("");
                setPwChangeModalOpen(true);
              }}
              className="group flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition-colors hover:border-rose-500/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/20 to-purple-500/20 text-rose-400 transition-colors group-hover:text-rose-300">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[18px] font-light text-slate-100 transition-colors group-hover:text-rose-300">{t("passwordSection")}</p>
                  <p className="text-[14px] text-slate-500 transition-colors group-hover:text-rose-300/80">{t("updatePasswordDescription")}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-rose-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                setDeleteAccountPassword("");
                setDeleteAccountConfirmText("");
                setDeleteAccountError("");
                setDeleteAccountModalOpen(true);
              }}
              className="group flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition-colors hover:border-red-900/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 text-red-400 transition-colors group-hover:text-red-300">
                  <LogOut className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[18px] font-light text-red-400 transition-colors group-hover:text-red-300">{t("deleteAccount")}</p>
                  <p className="text-[14px] text-slate-500 transition-colors group-hover:text-red-300/80">{t("deleteAccountDescription")}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-red-900 transition-colors group-hover:text-red-500" />
            </button>

            <form action={signOutAction}>
              <button
                type="submit"
                className="group flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition-colors hover:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500/20 to-slate-500/20 text-slate-400 transition-colors group-hover:text-slate-300">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[18px] font-light text-slate-100 transition-colors group-hover:text-slate-300">{t("signOut")}</p>
                    <p className="text-[14px] text-slate-500 transition-colors group-hover:text-slate-300/80">{t("signOutDescription")}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-slate-400" />
              </button>
            </form>
          </div>
        </section>
      </div>

      <Dialog.Root open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-slate-900 p-6 focus:outline-none">
            <div className="mb-5 flex items-center justify-between">
              <Dialog.Title className="text-[20px] font-light text-slate-100">{t("profile")}</Dialog.Title>
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
                  <img src={draftAvatar} alt={t("avatarPreview")} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-rose-500 text-white">
                    <UserIcon className="h-9 w-9" />
                  </div>
                )}
                <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200">
                  <Camera className="h-3.5 w-3.5" />
                </span>
              </button>

              <p className="mt-2 text-[12px] text-slate-500">{avatarUploading ? t("uploading") : t("clickToUpload")}</p>
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
                {t("displayName")}
              </label>
              <input
                id="profile-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                maxLength={32}
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-800/70 px-3 text-[14px] text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-rose-500/50"
                placeholder={t("displayName")}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                disabled={avatarUploading || pending}
                className="h-10 rounded-xl bg-slate-800 px-4 text-[14px] text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                disabled={avatarUploading || pending}
                onClick={saveProfile}
                className="h-10 rounded-xl bg-rose-500 px-4 text-[14px] text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? tc("loading") : tc("save")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {cropImageUrl && (
        <AvatarCropper
          imageUrl={cropImageUrl}
          open={cropModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              URL.revokeObjectURL(cropImageUrl);
              setCropImageUrl(null);
            }
            setCropModalOpen(open);
          }}
          onCropComplete={handleAvatarCropComplete}
        />
      )}

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
              placeholder={t("dotsPlaceholder")}
              className="h-12 w-full rounded-xl border border-slate-800 bg-slate-800/70 px-3 text-center text-[20px] tracking-[0.35em] text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/30"
            />

            {pinError ? <p className="mt-2 text-[13px] text-rose-400">{pinError}</p> : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closePinModal}
                className="h-10 rounded-xl bg-slate-800 px-4 text-[14px] text-slate-200 transition-colors hover:bg-slate-700"
              >
                {tc("cancel")}
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
              <Dialog.Title className="text-[20px] font-light text-rose-400">{t("deleteAllDataTitle")}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <p className="mb-3 text-[14px] text-slate-400">
              {tc("typeToDeleteConfirm", { placeholder: t("deletePlaceholder") })}
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder={t("deletePlaceholder")}
              className="h-11 w-full rounded-xl border border-slate-800 bg-slate-800/70 px-3 text-[14px] text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-rose-500/50"
            />

            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button className="h-10 rounded-xl bg-slate-800 px-4 text-[14px] text-slate-200 transition-colors hover:bg-slate-700">
                  {tc("cancel")}
                </button>
              </Dialog.Close>
              <button
                type="button"
                disabled={pending || deleteConfirmText !== "DELETE"}
                onClick={handleDeleteAll}
                className="h-10 rounded-xl bg-rose-500 px-4 text-[14px] text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tc("confirm")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={pwChangeModalOpen} onOpenChange={setPwChangeModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-slate-900 p-6 focus:outline-none">
            <div className="mb-2 flex items-center justify-between">
              <Dialog.Title className="text-[20px] font-light text-slate-100">{t("passwordSection")}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <p className="mb-4 text-[13px] text-slate-500">{t("enterCurrentAndNewPassword")}</p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[13px] text-slate-400">{t("currentPassword")}</label>
                <input
                  type="password"
                  value={pwCurrent}
                  onChange={(e) => { setPwCurrent(e.target.value); setPwError(""); }}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-800/70 px-3 text-[14px] text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-rose-500/50"
                  placeholder={t("currentPassword")}
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] text-slate-400">{t("newPassword")}</label>
                <input
                  type="password"
                  value={pwNew}
                  onChange={(e) => { setPwNew(e.target.value); setPwError(""); }}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-800/70 px-3 text-[14px] text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-rose-500/50"
                  placeholder={t("passwordPlaceholder")}
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] text-slate-400">{t("confirmNewPassword")}</label>
                <input
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => { setPwConfirm(e.target.value); setPwError(""); }}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-800/70 px-3 text-[14px] text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-rose-500/50"
                  placeholder={t("confirmPasswordPlaceholder")}
                />
              </div>
            </div>

            {pwError ? <p className="mt-2 text-[13px] text-rose-400">{pwError}</p> : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPwChangeModalOpen(false)}
                className="h-10 rounded-xl bg-slate-800 px-4 text-[14px] text-slate-200 transition-colors hover:bg-slate-700"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                disabled={pending || !pwCurrent || !pwNew || !pwConfirm}
                onClick={handlePasswordChange}
                className="h-10 rounded-xl bg-rose-500 px-4 text-[14px] text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? tc("loading") : t("updatePassword")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={deleteAccountModalOpen} onOpenChange={setDeleteAccountModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rose-500/25 bg-slate-900 p-6 focus:outline-none">
            <div className="mb-2 flex items-center justify-between">
              <Dialog.Title className="text-[20px] font-light text-rose-400">{t("deleteAccount")}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <p className="mb-4 text-[14px] text-slate-400">
              {t("deleteAccountWarning")}
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[13px] text-slate-400">{t("currentPassword")}</label>
                <input
                  type="password"
                  value={deleteAccountPassword}
                  onChange={(e) => { setDeleteAccountPassword(e.target.value); setDeleteAccountError(""); }}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-800/70 px-3 text-[14px] text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-rose-500/50"
                  placeholder={t("currentPassword")}
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] text-slate-400">{tc("typeToDeleteConfirm", { placeholder: t("deletePlaceholder") })}</label>
                <input
                  type="text"
                  value={deleteAccountConfirmText}
                  onChange={(e) => { setDeleteAccountConfirmText(e.target.value); setDeleteAccountError(""); }}
                  placeholder={t("deletePlaceholder")}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-800/70 px-3 text-[14px] text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-rose-500/50"
                />
              </div>
            </div>

            {deleteAccountError ? <p className="mt-2 text-[13px] text-rose-400">{deleteAccountError}</p> : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteAccountModalOpen(false)}
                className="h-10 rounded-xl bg-slate-800 px-4 text-[14px] text-slate-200 transition-colors hover:bg-slate-700"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                disabled={pending || !deleteAccountPassword || deleteAccountConfirmText !== "DELETE"}
                onClick={handleDeleteAccount}
                className="h-10 rounded-xl bg-rose-500 px-4 text-[14px] text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? tc("loading") : tc("delete")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <FeedbackModal open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen} />
    </div>
  );
}
