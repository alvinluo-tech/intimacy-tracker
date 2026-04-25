"use client";

import { useEffect, useState } from "react";

export type DashboardWidgets = {
  quickStats: boolean;
  activity30Days: boolean;
  yearOverview: boolean;
  weekdayPattern: boolean;
  mapSlice: boolean;
  timeOfDay: boolean;
  durationDistribution: boolean;
  topTags: boolean;
};

const defaultWidgets: DashboardWidgets = {
  quickStats: true,
  activity30Days: true,
  yearOverview: true,
  weekdayPattern: true,
  mapSlice: true,
  timeOfDay: true,
  durationDistribution: true,
  topTags: true,
};

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<DashboardWidgets>(defaultWidgets);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("dashboard_widgets");
    if (saved) {
      try {
        setWidgets({ ...defaultWidgets, ...JSON.parse(saved) });
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const updateWidgets = (newWidgets: Partial<DashboardWidgets>) => {
    const updated = { ...widgets, ...newWidgets };
    setWidgets(updated);
    localStorage.setItem("dashboard_widgets", JSON.stringify(updated));
  };

  return { widgets, updateWidgets, mounted };
}
