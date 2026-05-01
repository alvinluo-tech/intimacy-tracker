export const CACHE_TAGS = {
  dashboard: (userId: string) => `dashboard-stats-${userId}`,
  analytics: (userId: string) => `analytics-stats-${userId}`,
  partnerList: (userId: string) => `partner-list-${userId}`,
  partnerDetail: (partnerId: string) => `partner-detail-${partnerId}`,
  timeline: (userId: string) => `timeline-${userId}`,
  settings: (userId: string) => `settings-${userId}`,
  layout: (userId: string) => `layout-${userId}`,
} as const;

export const REVALIDATE_PROFILE = "seconds" as const;
