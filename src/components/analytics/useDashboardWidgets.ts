"use client";

import { useEffect, useState } from "react";

export type DashboardWidgets = {
  quickStats: boolean;
  activity30Days: boolean;
  yearOverview: boolean;
  weekdayPattern: boolean;
  mapSlice: boolean;
  mapCountry: boolean;
  mapCities: boolean;
  mapFootprints: boolean;
  mapCount: boolean;
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
  mapCountry: true,
  mapCities: true,
  mapFootprints: true,
  mapCount: true,
  timeOfDay: true,
  durationDistribution: true,
  topTags: true,
};

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<DashboardWidgets>(defaultWidgets);

  useEffect(() => {
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
    setWidgets((current) => {
      const updated = { ...current, ...newWidgets };
      localStorage.setItem("dashboard_widgets", JSON.stringify(updated));
      return updated;
    });
  };

  return { widgets, updateWidgets };
}
