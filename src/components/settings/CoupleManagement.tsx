"use client";

import { useState, useTransition } from "react";
import { Users, Copy, Check, Link as LinkIcon, Unlink } from "lucide-react";
import { toast } from "sonner";
import { createInviteCode, acceptInviteCode, unbindPartner } from "@/features/couples/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CoupleManagement({
  partnerProfile,
  inviteCode: initialInviteCode,
}: {
  partnerProfile: { id: string; email: string; display_name: string | null } | null;
  inviteCode: { invite_code: string; expires_at: string } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [inviteCode, setInviteCode] = useState(initialInviteCode?.invite_code || null);
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerateCode = () => {
    startTransition(async () => {
      try {
        const code = await createInviteCode();
        setInviteCode(code);
        toast.success("Invite code generated!");
      } catch (err: any) {
        toast.error(err.message || "Failed to generate invite code.");
      }
    });
  };

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleBind = () => {
    if (!inputCode) return;
    startTransition(async () => {
      try {
        await acceptInviteCode(inputCode);
        toast.success("Successfully bound with partner!");
      } catch (err: any) {
        toast.error(err.message || "Failed to bind partner.");
      }
    });
  };

  const handleUnbind = () => {
    if (!confirm("Are you sure you want to unbind? You will no longer share records.")) return;
    startTransition(async () => {
      try {
        await unbindPartner();
        toast.success("Successfully unbound.");
      } catch (err: any) {
        toast.error(err.message || "Failed to unbind.");
      }
    });
  };

  return (
    <div className="flex flex-col rounded-[16px] bg-[#1a1f2e] p-5 border border-white/[0.02]">
      <div className="flex items-center gap-4 mb-4">
        <Users className="h-5 w-5 text-[var(--app-text-muted)]" />
        <div>
          <div className="text-[15px] font-medium text-[var(--app-text)]">Couple Binding</div>
          <div className="text-[13px] text-[var(--app-text-muted)]">Share and sync your records with your partner</div>
        </div>
      </div>

      {partnerProfile ? (
        <div className="mt-4 pt-4 border-t border-white/[0.05]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-medium text-[var(--brand)] flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Bound to {partnerProfile.display_name || partnerProfile.email}
              </div>
              <div className="text-[12px] text-[var(--app-text-muted)] mt-1">
                You both now share records automatically.
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnbind}
              disabled={pending}
              className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
            >
              <Unlink className="h-4 w-4 mr-2" />
              Unbind
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-white/[0.05] space-y-4">
          <div className="bg-white/[0.02] p-4 rounded-[12px] border border-white/[0.05]">
            <div className="text-[13px] font-medium text-[var(--app-text)] mb-2">1. Invite your partner</div>
            {inviteCode ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/20 px-3 py-2 rounded-md font-mono text-center tracking-widest text-[var(--brand)] text-lg">
                  {inviteCode}
                </div>
                <Button variant="ghost" size="sm" onClick={handleCopyCode} className="shrink-0 w-10 h-10 px-0">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-[var(--app-text-muted)]" />}
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={handleGenerateCode}
                disabled={pending}
                className="w-full"
              >
                Generate Invite Code
              </Button>
            )}
            <div className="text-[11px] text-[var(--app-text-muted)] mt-2">
              Share this code with your partner. They have 24 hours to enter it.
            </div>
          </div>

          <div className="bg-white/[0.02] p-4 rounded-[12px] border border-white/[0.05]">
            <div className="text-[13px] font-medium text-[var(--app-text)] mb-2">2. Or enter an invite code</div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter 6-character code"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono uppercase"
              />
              <Button
                variant="primary"
                onClick={handleBind}
                disabled={pending || inputCode.length !== 6}
              >
                Bind
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}