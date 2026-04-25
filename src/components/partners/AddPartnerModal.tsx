"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link, UserPlus, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPartnerAction } from "@/features/partners/actions";
import { requestBindingByIdentityCode } from "@/features/partner-binding/actions";

export function AddPartnerModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"local" | "remote">("local");

  // Local Partner
  const [nickname, setNickname] = useState("");
  const [color, setColor] = useState("#7170ff");

  // Remote Binding
  const [inputCode, setInputCode] = useState("");

  const handleCreateLocal = () => {
    if (!nickname.trim()) {
      toast.error("请输入伴侣名称");
      return;
    }
    startTransition(async () => {
      const res = await createPartnerAction({
        nickname: nickname.trim(),
        color: color.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setNickname("");
      toast.success("已创建伴侣档案");
      onOpenChange(false);
      router.refresh();
    });
  };

  const handleRequestBinding = () => {
    if (!inputCode.trim()) {
      toast.error("请输入身份码");
      return;
    }
    startTransition(async () => {
      try {
        await requestBindingByIdentityCode(inputCode.trim().toUpperCase());
        toast.success("已发送绑定请求，等待对方同意");
        setInputCode("");
        onOpenChange(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "发起请求失败");
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-[var(--app-border)] bg-[var(--app-panel)] p-5 shadow-linear z-50">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-[16px] font-semibold text-[var(--app-text)]">
              添加伴侣
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-[6px] p-2 text-[var(--app-text-muted)] hover:bg-white/[0.04]"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex rounded-[8px] bg-black/20 p-1 mb-5">
            <button
              onClick={() => setTab("local")}
              className={`flex-1 rounded-[6px] py-1.5 text-[13px] font-medium transition-colors ${
                tab === "local"
                  ? "bg-white/[0.08] text-[var(--app-text)]"
                  : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
              }`}
            >
              本地档案
            </button>
            <button
              onClick={() => setTab("remote")}
              className={`flex-1 rounded-[6px] py-1.5 text-[13px] font-medium transition-colors ${
                tab === "remote"
                  ? "bg-white/[0.08] text-[var(--app-text)]"
                  : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
              }`}
            >
              连接账号
            </button>
          </div>

          {tab === "local" && (
            <div className="space-y-4">
              <div className="text-[13px] text-[var(--app-text-muted)]">
                创建一个本地档案，用于在记录中标记对方。数据仅你自己可见。
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[var(--app-text)]">
                    昵称
                  </label>
                  <Input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="如：老公 / 老婆"
                    className="text-[var(--app-text)]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[var(--app-text)]">
                    主题色
                  </label>
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#7170ff"
                    className="text-[var(--app-text)]"
                  />
                </div>
                <Button
                  variant="primary"
                  className="w-full mt-2"
                  disabled={pending || !nickname.trim()}
                  onClick={handleCreateLocal}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  创建档案
                </Button>
              </div>
            </div>
          )}

          {tab === "remote" && (
            <div className="space-y-4">
              <div className="text-[13px] text-[var(--app-text-muted)]">
                通过身份码向对方发送绑定请求。绑定后，双方将自动共享所有记录。
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[var(--app-text)]">
                    对方身份码
                  </label>
                  <Input
                    placeholder="输入8位身份码"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="font-mono uppercase text-[var(--app-text)]"
                  />
                </div>
                <Button
                  variant="primary"
                  className="w-full mt-2"
                  disabled={pending || inputCode.length < 6}
                  onClick={handleRequestBinding}
                >
                  <Link className="mr-2 h-4 w-4" />
                  发送绑定请求
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
