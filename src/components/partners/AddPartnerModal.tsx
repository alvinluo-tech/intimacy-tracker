"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link, UserPlus, User, X } from "lucide-react";
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
  const t = useTranslations("partners");
  const tc = useTranslations("common");
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
      toast.error(tc("error"));
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
      toast.success(t("partnerAdded"));
      onOpenChange(false);
      router.refresh();
    });
  };

  const handleRequestBinding = () => {
    if (!inputCode.trim()) {
      toast.error(tc("error"));
      return;
    }
    startTransition(async () => {
      try {
        await requestBindingByIdentityCode(inputCode.trim().toUpperCase());
        toast.success(t("sendRequest"));
        setInputCode("");
        onOpenChange(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || tc("error"));
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Dialog.Title className="text-[18px] font-light text-slate-200">{t("addPartner")}</Dialog.Title>
              <p className="text-[13px] text-slate-500">{t("addPartner")}</p>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mb-5 flex rounded-lg bg-slate-800/60 p-1">
            <button
              onClick={() => setTab("local")}
              className={`flex-1 rounded-md py-1.5 text-[13px] transition-colors ${
                tab === "local"
                  ? "bg-slate-700 text-slate-200"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t("addPartner")}
            </button>
            <button
              onClick={() => setTab("remote")}
              className={`flex-1 rounded-md py-1.5 text-[13px] transition-colors ${
                tab === "remote"
                  ? "bg-slate-700 text-slate-200"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t("bindPartner")}
            </button>
          </div>

          {tab === "local" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[14px] text-slate-200">{t("addPartner")}</div>
                    <div className="text-[12px] text-slate-500">{t("addPartner")}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[13px] text-slate-300">
                    {t("partnerName")}
                  </label>
                  <Input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={t("nicknamePlaceholder")}
                    className="border-slate-800 bg-slate-900 text-slate-200 placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] text-slate-300">
                    {t("avatar")}
                  </label>
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder={t("colorPlaceholder")}
                    className="border-slate-800 bg-slate-900 text-slate-200 placeholder:text-slate-600"
                  />
                </div>
                <Button
                  variant="primary"
                  className="mt-2 w-full bg-[#f43f5e] text-white hover:bg-rose-600"
                  disabled={pending || !nickname.trim()}
                  onClick={handleCreateLocal}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t("addPartner")}
                </Button>
              </div>
            </div>
          )}

          {tab === "remote" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f43f5e]/20 text-[#f43f5e]">
                    <Link className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[14px] text-slate-200">{t("bindPartner")}</div>
                    <div className="text-[12px] text-slate-500">{t("bindInviteCode")}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[13px] text-slate-300">
                    {t("inviteCode")}
                  </label>
                  <Input
                    placeholder={t("inviteCodePlaceholder")}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="border-slate-800 bg-slate-900 font-mono uppercase text-slate-200 placeholder:text-slate-600"
                  />
                </div>
                <Button
                  variant="primary"
                  className="mt-2 w-full bg-[#f43f5e] text-white hover:bg-rose-600"
                  disabled={pending || inputCode.length < 6}
                  onClick={handleRequestBinding}
                >
                  <Link className="mr-2 h-4 w-4" />
                  {t("sendRequest")}
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
