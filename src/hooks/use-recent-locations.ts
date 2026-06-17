"use client";

import * as React from "react";
import { getRecentLocations, type RecentLocation } from "@/features/records/actions";

export function useRecentLocations() {
  const [locations, setLocations] = React.useState<RecentLocation[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetch = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await getRecentLocations(5);
      setLocations(result);
    } catch {
      // Silently fail - dropdown won't show
    } finally {
      setLoading(false);
    }
  }, []);

  return { locations, loading, fetch };
}
