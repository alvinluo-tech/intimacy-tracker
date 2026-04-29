export type CountPoint = {
  label: string;
  value: number;
};

export type TagPoint = {
  label: string;
  value: number;
};

export type DashboardStats = {
  totalCount: number;
  weekCount: number;
  weekOverWeekChange: number | null;
  monthCount: number;
  avgDuration: number | null;
  avgRating: number | null;
  lastEncounterAt: string | null;
  cityCount: number;
  footprintCount: number;
  recent30Days: CountPoint[];
  recent7DaysDurations: number[];
  topRecentTags: TagPoint[];
};

export type AnalyticsStats = DashboardStats & {
  weeklyTrend12: CountPoint[];
  monthlyTrend12: CountPoint[];
  durationDistribution: CountPoint[];
  weekdayDistribution: CountPoint[];
  timeOfDayDistribution: CountPoint[];
  heatmapData: { date: string; count: number }[];
  tagRanking: TagPoint[];
};
