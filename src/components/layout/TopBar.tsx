"use client";

import { LogOut, Eye, EyeOff } from "lucide-react";

import { signOutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { usePrivacyStore } from "@/stores/privacy-store";

export function TopBar({ title, action }: { title: string, action?: React.ReactNode }) {
  const blurEnabled = usePrivacyStore((s) => s.blurEnabled);
  const toggleBlur = usePrivacyStore((s) => s.toggleBlur);

  return (
    <div className="sticky top-0 z-20 border-b border-white/[0.05] bg-[var(--app-panel)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)]">
          {title}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <Button variant="ghost" size="sm" onClick={toggleBlur} className="w-8 h-8 px-0" title={blurEnabled ? "关闭隐私模式" : "开启隐私模式"}>
            {blurEnabled ? <EyeOff className="h-4 w-4 text-[var(--app-text-muted)]" /> : <Eye className="h-4 w-4 text-[var(--app-text-muted)]" />}
          </Button>
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit" className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">退出</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

