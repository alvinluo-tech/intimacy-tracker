"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, Eye, EyeOff, ArrowLeft } from "lucide-react";

import { signOutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { usePrivacyStore } from "@/stores/privacy-store";

export function TopBar({ 
  title, 
  action, 
  showBack = false 
}: { 
  title: string, 
  action?: React.ReactNode,
  showBack?: boolean
}) {
  const router = useRouter();
  const t = useTranslations('nav');
  const blurEnabled = usePrivacyStore((s) => s.blurEnabled);
  const toggleBlur = usePrivacyStore((s) => s.toggleBlur);

  return (
    <div className="sticky top-0 z-20 border-b border-border/5 bg-[var(--app-panel)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.back()} 
              className="h-8 w-8 px-0 text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-surface/4 -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)]">
            {title}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <Button variant="ghost" size="sm" onClick={toggleBlur} className="w-8 h-8 px-0" title={blurEnabled ? t("disablePrivacy") : t("enablePrivacy")}>
            {blurEnabled ? <EyeOff className="h-4 w-4 text-[var(--app-text-muted)]" /> : <Eye className="h-4 w-4 text-[var(--app-text-muted)]" />}
          </Button>
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit" className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('logOut')}</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

