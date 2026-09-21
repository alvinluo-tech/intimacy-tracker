"use client";

import { useEffect } from "react";

import { purgePrivatePageCaches } from "@/lib/utils/offline-privacy";

/**
 * Mounted by every logged-out surface (sign-out redirects here). Anything the
 * worker cached for the previous session stops belonging to this visitor the
 * moment they arrive.
 */
export function PublicCachePurge() {
  useEffect(() => {
    purgePrivatePageCaches().catch(() => {});
  }, []);

  return null;
}
