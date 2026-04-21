"use client";

import type React from "react";
import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/layout/BottomNav";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { PinLockGate } from "@/components/settings/PinLockGate";

export function AppShell({
  children,
  requirePin,
}: {
  children: React.ReactNode;
  requirePin: boolean;
}) {
  const pathname = usePathname();
  const isLockPage = pathname === "/lock";

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
