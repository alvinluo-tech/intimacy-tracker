import { LogOut } from "lucide-react";

import { signOutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function TopBar({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-20 border-b border-white/[0.05] bg-[var(--app-panel)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)]">
          {title}
        </div>
        <form action={signOutAction}>
          <Button variant="ghost" size="sm" type="submit" className="gap-2">
            <LogOut className="h-4 w-4" />
            退出
          </Button>
        </form>
      </div>
    </div>
  );
}

