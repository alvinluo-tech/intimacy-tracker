"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { QuickLogForm } from "@/components/forms/QuickLogForm";
import type { Partner, Tag } from "@/features/records/types";
import { useTimerStore } from "@/stores/timer-store";

export function AddLogModal({
  partners,
  tags,
  defaultLocationMode,
}: {
  partners: Partner[];
  tags: Tag[];
  defaultLocationMode: "off" | "city" | "exact";
}) {
  const router = useRouter();
  const isOpen = useTimerStore((s) => s.isOpen);
  const setOpen = useTimerStore((s) => s.setOpen);
  const recordedDuration = useTimerStore((s) => s.recordedDuration);
  const recordedStartTime = useTimerStore((s) => s.recordedStartTime);
  const recordedEndTime = useTimerStore((s) => s.recordedEndTime);
  const setRecordedData = useTimerStore((s) => s.setRecordedData);
  const defaultPartnerId = partners.find((p) => p.is_default)?.id;

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) setRecordedData(null, null, null); // clear duration when closing
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="fixed bottom-[80px] right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[var(--brand-hover)] md:bottom-8 md:right-8"
          aria-label="新增记录"
        >
          <Plus className="h-6 w-6" />
        </button>
      </Dialog.Trigger>
      
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] p-4 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] md:p-0">
          <div className="relative flex max-h-[90svh] flex-col rounded-[16px] bg-[var(--app-bg)] shadow-xl ring-1 ring-white/[0.08]">
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.05] p-4">
              <Dialog.Title className="text-lg font-semibold tracking-[-0.2px] text-[var(--app-text)]">
                快速记录
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-full p-2 text-[var(--app-text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(113,112,255,0.4)]">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </Dialog.Close>
            </div>
            
            <div className="overflow-y-auto p-4 md:p-6">
              <QuickLogForm
                mode="create"
                partners={partners}
                tags={tags}
                initial={{ 
                  partnerId: defaultPartnerId ?? undefined,
                  locationPrecision: defaultLocationMode,
                  durationMinutes: recordedDuration ?? undefined,
                  startedAt: recordedStartTime ?? undefined,
                  endedAt: recordedEndTime ?? undefined
                }}
                onSuccess={(id) => {
                  handleOpenChange(false);
                  router.push(`/records/${id}/edit`);
                }}
                onCancel={() => handleOpenChange(false)}
              />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
