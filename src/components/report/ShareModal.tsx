"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, Link, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { PosterTheme } from "@/components/report/poster/AnnualPoster";

type ShareModalProps = {
  open: boolean;
  onClose: () => void;
  year: number;
  theme: PosterTheme;
};

type PrivacyOptions = {
  showTotalCount: boolean;
  showTimeInfo: boolean;
  showPercentile: boolean;
  showPartner: boolean;
};

export function ShareModal({ open, onClose, year, theme }: ShareModalProps) {
  const [privacy, setPrivacy] = useState<PrivacyOptions>({
    showTotalCount: true,
    showTimeInfo: true,
    showPercentile: true,
    showPartner: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          theme: theme.id,
          options: {
            showPartner: privacy.showPartner,
            showTimeInfo: privacy.showTimeInfo,
            showLocation: false,
            showPercentile: privacy.showPercentile,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to generate");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `encounter-${year}-wrapped-safe.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Generate failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-[var(--app-border)] bg-[var(--app-panel)] p-6 shadow-linear">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <Dialog.Title className="text-[16px] font-semibold text-[var(--app-text)]">
                Share Report
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[13px] text-[var(--app-text-muted)]">
                Choose what to include. Location and notes are always hidden for
                privacy.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-[6px] border border-[var(--app-border-subtle)] bg-surface/2 p-2 text-[var(--app-text-secondary)] hover:bg-surface/4"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="totalCount" className="flex flex-col gap-1">
                <span className="text-[var(--app-text)]">Record Count</span>
                <span className="text-[12px] text-[var(--app-text-muted)]">
                  Show total encounters
                </span>
              </Label>
              <Switch
                id="totalCount"
                checked={privacy.showTotalCount}
                onCheckedChange={(checked) =>
                  setPrivacy({ ...privacy, showTotalCount: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="timeInfo" className="flex flex-col gap-1">
                <span className="text-[var(--app-text)]">Time Information</span>
                <span className="text-[12px] text-[var(--app-text-muted)]">
                  Show peak hours and days
                </span>
              </Label>
              <Switch
                id="timeInfo"
                checked={privacy.showTimeInfo}
                onCheckedChange={(checked) =>
                  setPrivacy({ ...privacy, showTimeInfo: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="percentile" className="flex flex-col gap-1">
                <span className="text-[var(--app-text)]">Percentile Data</span>
                <span className="text-[12px] text-[var(--app-text-muted)]">
                  Show population comparison
                </span>
              </Label>
              <Switch
                id="percentile"
                checked={privacy.showPercentile}
                onCheckedChange={(checked) =>
                  setPrivacy({ ...privacy, showPercentile: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="partner" className="flex flex-col gap-1">
                <span className="text-[var(--app-text)]">Partner Info</span>
                <span className="text-[12px] text-[var(--app-text-muted)]">
                  Show partner names/avatars
                </span>
              </Label>
              <Switch
                id="partner"
                checked={privacy.showPartner}
                onCheckedChange={(checked) =>
                  setPrivacy({ ...privacy, showPartner: checked })
                }
              />
            </div>
          </div>

          <div className="text-[12px] text-[var(--app-text-muted)] bg-[var(--app-surface)] p-3 rounded-lg">
            <strong>Privacy Notice:</strong> Location data and notes are always
            hidden in shared reports. Partner information is hidden by default.
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Dialog.Close asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="button" variant="ghost" onClick={handleCopyLink}>
              {copied ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Link className="w-4 h-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{ background: theme.accent }}
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "Download"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
