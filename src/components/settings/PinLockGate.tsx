"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useLockStore } from "@/stores/lock-store";

export function PinLockGate({
  requirePin,
  isUnlocked,
}: {
  requirePin: boolean;
  isUnlocked: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!requirePin) return;
    if (isUnlocked) return;
    if (pathname === "/lock") return;
    const next = encodeURIComponent(pathname || "/dashboard");
    router.replace(`/lock?next=${next}`);
  }, [pathname, requirePin, router, isUnlocked]);

  return null;
}
