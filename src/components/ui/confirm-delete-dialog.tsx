"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ConfirmDeleteDialog({
  title = "确认删除？",
  description = "删除后不可恢复。",
  trigger,
  onConfirm,
  pending,
}: {
  title?: string;
  description?: string;
  trigger: React.ReactNode;
  onConfirm: () => void;
  pending?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-linear">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="text-[14px] font-semibold tracking-[-0.13px] text-[var(--app-text)]">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[13px] leading-5 text-[var(--app-text-muted)]">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-[6px] border border-[var(--app-border-subtle)] bg-white/[0.02] p-2 text-[var(--app-text-secondary)] hover:bg-white/[0.04]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                取消
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              variant="primary"
              disabled={pending}
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
            >
              删除
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

