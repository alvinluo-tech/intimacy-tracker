export type CountPoint = {
  label: string;
  value: number;
};

export type TagPoint = {
  label: string;
  value: number;
};

export type DashboardStats = {
  weekCount: number;
  monthCount: number;
  avgDuration: number | null;
  lastEncounterAt: string | null;
  recent30Days: CountPoint[];
  topRecentTags: TagPoint[];
};

export type AnalyticsStats = {
  weeklyTrend12: CountPoint[];
  monthlyTrend12: CountPoint[];
  durationDistribution: CountPoint[];
  weekdayDistribution: CountPoint[];
  tagRanking: TagPoint[];
};
