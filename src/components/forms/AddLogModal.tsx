"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { QuickLogDrawerForm } from "@/components/forms/QuickLogDrawerForm";
import type { Partner, Tag } from "@/features/records/types";
import { useTimerStore } from "@/stores/timer-store";
import { clearQuickLogLocationDraft, consumeQuickLogReopenFlag } from "@/lib/utils/quicklog-location-draft";

export function AddLogModal({
  partners,
  tags,
  defaultLocationMode,
  showTrigger = true,
}: {
  partners: Partner[];
  tags: Tag[];
  defaultLocationMode: "off" | "city" | "exact";
  showTrigger?: boolean;
}) {
  const t = useTranslations("encounter");
  const router = useRouter();
  const isOpen = useTimerStore((s) => s.isOpen);
  const setOpen = useTimerStore((s) => s.setOpen);
  const recordedDuration = useTimerStore((s) => s.recordedDuration);
  const recordedStartTime = useTimerStore((s) => s.recordedStartTime);
  const recordedEndTime = useTimerStore((s) => s.recordedEndTime);
  const setRecordedData = useTimerStore((s) => s.setRecordedData);
  const defaultSelectionId = partners.find((p) => p.is_default)?.id ?? null;

  // Track whether the modal was opened due to location picker return
  const openedFromReopen = React.useRef(false);

  React.useEffect(() => {
    if (consumeQuickLogReopenFlag()) {
      openedFromReopen.current = true;
      setOpen(true);
    }
  }, [setOpen]);

  // Safety net: clear stale draft when opening from timer or "+" button
  React.useEffect(() => {
    if (!isOpen) return;
    if (!openedFromReopen.current) {
      clearQuickLogLocationDraft();
    }
    openedFromReopen.current = false;
  }, [isOpen]);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) setRecordedData(null, null, null); // clear duration when closing
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      {showTrigger ? (
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="fixed bottom-[80px] right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[var(--brand-hover)] md:bottom-8 md:right-8"
            aria-label={t("addRecord")}
          >
            <Plus className="h-6 w-6" />
          </button>
        </Dialog.Trigger>
      ) : null}
      
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-md rounded-t-3xl border-t border-white/5 bg-[#0f172a] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom max-h-[90vh] overflow-y-auto">
          <div className="relative">
            <div className="flex shrink-0 items-center justify-between px-6 pb-2 pt-5">
              <Dialog.Title className="text-[18px] font-light text-slate-200">
                Log Encounter
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800">
                  <X className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  <span className="sr-only">Close</span>
                </button>
              </Dialog.Close>
            </div>
            
            <div className="px-2 pb-2">
              <QuickLogDrawerForm
                partners={partners}
                tags={tags}
                defaultSelectionId={defaultSelectionId ?? undefined}
                defaultLocationMode={defaultLocationMode}
                recordedDuration={recordedDuration}
                recordedStartTime={recordedStartTime}
                onSuccess={(id) => {
                  handleOpenChange(false);
                }}
                onClose={() => handleOpenChange(false)}
              />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
