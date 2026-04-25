"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { BottomNav } from "@/components/layout/BottomNav";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { PinLockGate } from "@/components/settings/PinLockGate";
import { useLockStore } from "@/stores/lock-store";
import { usePrivacyStore } from "@/stores/privacy-store";

export function AppShell({
  children,
  requirePin,
  initialUnlocked,
}: {
  children: React.ReactNode;
  requirePin: boolean;
  initialUnlocked: boolean;
}) {
  const pathname = usePathname();
  const isLockPage = pathname === "/lock";
  
  // We sync the server's unlock cookie state to our client store on mount.
  // This avoids hydration mismatch and ensures the user doesn't get bounced to /lock on refresh.
  const unlocked = useLockStore((s) => s.unlocked);
  const unlock = useLockStore((s) => s.unlock);

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    if (initialUnlocked) {
      unlock();
    }
    setMounted(true);
  }, [initialUnlocked, unlock]);

  // Effective unlock state is either what we know from server (before mount) or store (after mount)
  const isEffectivelyUnlocked = mounted ? unlocked : initialUnlocked;
  
  const blurEnabled = usePrivacyStore((s) => s.blurEnabled);

  // If PIN is required but not unlocked, we ONLY render the LockGate logic,
  // completely hiding the main children to prevent any flashing of protected content.
  if (requirePin && !isEffectivelyUnlocked && !isLockPage) {
    return (
      <div className="min-h-full bg-[var(--app-bg)]">
        <PinLockGate requirePin={requirePin} isUnlocked={isEffectivelyUnlocked} />
      </div>
    );
  }

  // Once we are on the lock page or effectively unlocked, we can safely render children.
  // Note: we removed the empty div return to ensure Server Components render properly during SSR.

  return (
    <div className={`min-h-full bg-[var(--app-bg)] ${mounted && blurEnabled ? "privacy-blur" : ""}`}>
      <PinLockGate requirePin={requirePin} isUnlocked={isEffectivelyUnlocked} />
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
