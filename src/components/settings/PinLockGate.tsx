"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useLockStore } from "@/stores/lock-store";

export function PinLockGate({ requirePin }: { requirePin: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const unlocked = useLockStore((s) => s.unlocked);

  useEffect(() => {
    if (!requirePin) return;
    if (unlocked) return;
    if (pathname === "/lock") return;
    const next = encodeURIComponent(pathname || "/dashboard");
    router.replace(`/lock?next=${next}`);
  }, [pathname, requirePin, router, unlocked]);

  return null;
}
