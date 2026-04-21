"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { BottomNav } from "@/components/layout/BottomNav";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { PinLockGate } from "@/components/settings/PinLockGate";
import { useLockStore } from "@/stores/lock-store";

export function AppShell({
  children,
  requirePin,
}: {
  children: React.ReactNode;
  requirePin: boolean;
}) {
  const pathname = usePathname();
  const isLockPage = pathname === "/lock";
  const unlocked = useLockStore((s) => s.unlocked);
  
  // Prevent hydration mismatch and hide content until client store is ready
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // If PIN is required but not unlocked, we ONLY render the LockGate logic,
  // completely hiding the main children to prevent any flashing of protected content.
  if (requirePin && !unlocked && !isLockPage) {
    return (
      <div className="min-h-full bg-[var(--app-bg)]">
        <PinLockGate requirePin={requirePin} />
      </div>
    );
  }

  // Prevent rendering anything until client hydration is complete
  if (!mounted) {
    return <div className="min-h-full bg-[var(--app-bg)]" />;
  }

  return (
    <div className="min-h-full bg-[var(--app-bg)]">
      <PinLockGate requirePin={requirePin} />
      {isLockPage ? (
        <main className="min-h-full">{children}</main>
      ) : (
        <>
          <div className="mx-auto flex min-h-full max-w-6xl">
            <SidebarNav />
            <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
          </div>
          <BottomNav />
        </>
      )}
    </div>
  );
}
