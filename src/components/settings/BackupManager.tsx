"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, FileDown, X } from "lucide-react";

import {
  BackupCryptoError,
  decryptBackup,
  encryptBackup,
  isBackupEnvelope,
} from "@/lib/crypto/backup-crypto";

const MIN_PASSPHRASE_LENGTH = 8;

type PendingImport = { payload: unknown; count: number };

/**
 * Encrypted backup download and restore. The passphrase is used in-browser via
 * WebCrypto and never sent to the server; the file at rest is always an
 * AES-256-GCM envelope.
 */
export function BackupManager() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [passphraseConfirm, setPassphraseConfirm] = useState("");

  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const pendingImport = useRef<PendingImport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const passphraseValid =
    passphrase.length >= MIN_PASSPHRASE_LENGTH && passphrase === passphraseConfirm;

  const reset = () => {
    setPassphrase("");
    setPassphraseConfirm("");
    setRestorePassphrase("");
    setRestoreError("");
  };

  async function handleDownload() {
    if (busy || !passphraseValid) return;
    setBusy(true);
    try {
      const res = await fetch("/api/export-json", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("backupFailed"));
        return;
      }
      const data = await res.json();
      const envelope = await encryptBackup(JSON.stringify(data), passphrase);

      const blob = new Blob([JSON.stringify(envelope)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `encounter-backup-${new Date().toISOString().slice(0, 10)}.enc.json`;
      anchor.click();
      URL.revokeObjectURL(url);

      toast.success(t("backupCreated", { rows: data.rows ?? 0 }));
      setDownloadModalOpen(false);
    } catch (err) {
      console.error("[backup] download failed:", err);
      toast.error(t("backupFailed"));
    } finally {
      setBusy(false);
      reset();
    }
  }

  async function handleFilePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;

    setBusy(true);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);

      if (isBackupEnvelope(parsed)) {
        // Encrypted envelope — the passphrase dialog continues the flow.
        pendingImport.current = { payload: parsed, count: 0 };
        setRestoreError("");
        setRestoreModalOpen(true);
        return;
      }

      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed as { schema_version?: unknown }).schema_version === 1
      ) {
        const rows = Array.isArray((parsed as { encounters?: unknown }).encounters)
          ? ((parsed as { encounters: unknown[] }).encounters.length)
          : 0;
        await submitImport(parsed, rows);
        return;
      }

      toast.error(t("backupUnrecognized"));
    } catch (err) {
      if (err instanceof SyntaxError) {
        toast.error(t("backupUnrecognized"));
      } else {
        console.error("[backup] restore failed:", err);
        toast.error(t("restoreFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRestoreDecrypt() {
    const pending = pendingImport.current;
    if (!pending || busy || restorePassphrase.length < MIN_PASSPHRASE_LENGTH) return;
    setBusy(true);
    try {
      const plaintext = await decryptBackup(
        pending.payload as Parameters<typeof decryptBackup>[0],
        restorePassphrase
      );
      const payload = JSON.parse(plaintext);
      const rows = Array.isArray((payload as { encounters?: unknown }).encounters)
        ? (payload as { encounters: unknown[] }).encounters.length
        : 0;
      setRestoreModalOpen(false);
      await submitImport(payload, rows);
    } catch (err) {
      if (err instanceof BackupCryptoError) {
        setRestoreError(
          err.code === "wrong_passphrase"
            ? t("backupWrongPassphrase")
            : t("backupUnrecognized")
        );
      } else {
        console.error("[backup] decrypt failed:", err);
        setRestoreError(t("backupUnrecognized"));
      }
    } finally {
      setBusy(false);
      pendingImport.current = null;
      reset();
    }
  }

  async function submitImport(payload: unknown, rows: number) {
    try {
      const res = await fetch("/api/import-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        imported?: number;
        updated?: number;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        toast.error(body.error ?? t("restoreFailed"));
        return;
      }
      const restored = (body.imported ?? 0) + (body.updated ?? 0);
      toast.success(t("restoreDone", { rows: restored, files: rows }));
      router.refresh();
    } catch (err) {
      console.error("[backup] import request failed:", err);
      toast.error(t("restoreFailed"));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setDownloadModalOpen(true);
        }}
        disabled={busy}
        className="group flex w-full items-center justify-between rounded-2xl border border-rose-500/25 bg-surface/80 p-4 text-left transition-colors hover:border-rose-500/50"
      >
        <div>
          <div className="text-[18px] font-light text-content">{t("backupTitle")}</div>
          <div className="text-[14px] text-muted">{t("backupDesc")}</div>
        </div>
        <FileDown className="h-5 w-5 text-rose-400 transition-colors group-hover:text-rose-300" />
      </button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        className="group flex w-full items-center justify-between rounded-2xl border border-border bg-surface/80 p-4 text-left transition-colors hover:border-border"
      >
        <div>
          <div className="text-[18px] font-light text-content">{t("restoreTitle")}</div>
          <div className="text-[14px] text-muted">{t("restoreDesc")}</div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted transition-colors group-hover:text-rose-400" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFilePicked}
      />

      {/* Passphrase dialog for creating a backup */}
      <Dialog.Root open={downloadModalOpen} onOpenChange={setDownloadModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 focus:outline-none">
            <div className="mb-2 flex items-center justify-between">
              <Dialog.Title className="text-[20px] font-light text-content">
                {t("backupPassphraseTitle")}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-content">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <p className="mb-4 text-[13px] leading-5 text-muted">{t("backupPassphraseHint")}</p>

            <div className="space-y-3">
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={t("backupPassphrasePlaceholder")}
                autoComplete="new-password"
                className="h-11 w-full rounded-xl border border-border bg-surface/70 px-3 text-[14px] text-content outline-none transition-colors placeholder:text-muted focus:border-rose-500/50"
              />
              <input
                type="password"
                value={passphraseConfirm}
                onChange={(e) => setPassphraseConfirm(e.target.value)}
                placeholder={t("backupPassphraseConfirm")}
                autoComplete="new-password"
                className="h-11 w-full rounded-xl border border-border bg-surface/70 px-3 text-[14px] text-content outline-none transition-colors placeholder:text-muted focus:border-rose-500/50"
              />
            </div>

            {passphrase.length > 0 && passphrase.length < MIN_PASSPHRASE_LENGTH ? (
              <p className="mt-2 text-[13px] text-rose-400">
                {t("backupPassphraseShort", { count: MIN_PASSPHRASE_LENGTH })}
              </p>
            ) : null}
            {passphraseConfirm.length > 0 && passphrase !== passphraseConfirm ? (
              <p className="mt-2 text-[13px] text-rose-400">{t("backupPassphraseMismatch")}</p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button className="h-10 rounded-xl bg-surface px-4 text-[14px] text-content transition-colors hover:bg-surface">
                  {tc("cancel")}
                </button>
              </Dialog.Close>
              <button
                type="button"
                disabled={busy || !passphraseValid}
                onClick={handleDownload}
                className="h-10 rounded-xl bg-rose-500 px-4 text-[14px] text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? tc("loading") : t("backupCreate")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Passphrase dialog for restoring an encrypted backup */}
      <Dialog.Root open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 focus:outline-none">
            <div className="mb-2 flex items-center justify-between">
              <Dialog.Title className="text-[20px] font-light text-content">
                {t("restorePassphraseTitle")}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-content">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <p className="mb-4 text-[13px] leading-5 text-muted">{t("restorePassphraseHint")}</p>

            <input
              type="password"
              value={restorePassphrase}
              onChange={(e) => {
                setRestorePassphrase(e.target.value);
                setRestoreError("");
              }}
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-border bg-surface/70 px-3 text-[14px] text-content outline-none transition-colors placeholder:text-muted focus:border-rose-500/50"
              placeholder={t("backupPassphrasePlaceholder")}
            />
            {restoreError ? (
              <p className="mt-2 text-[13px] text-rose-400">{restoreError}</p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button className="h-10 rounded-xl bg-surface px-4 text-[14px] text-content transition-colors hover:bg-surface">
                  {tc("cancel")}
                </button>
              </Dialog.Close>
              <button
                type="button"
                disabled={busy || restorePassphrase.length < MIN_PASSPHRASE_LENGTH}
                onClick={handleRestoreDecrypt}
                className="h-10 rounded-xl bg-rose-500 px-4 text-[14px] text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? tc("loading") : t("restoreDecrypt")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
