import type { AnnualReportData } from "./aggregator";

export type PersonalTag = {
  id: string;
  label: string;
  emoji: string;
  category: "time" | "frequency" | "persistence" | "location" | "season";
};

type TagRule = {
  id: string;
  label: string;
  emoji: string;
  category: PersonalTag["category"];
  condition: (data: AnnualReportData) => boolean;
};

const TAG_RULES: TagRule[] = [
  // Time-based tags
  {
    id: "night-owl",
    label: "Night Owl",
    emoji: "\u{1F977}",
    category: "time",
    condition: (data) => {
      const nightHours = data.hourDistribution.slice(22).reduce((a, b) => a + b, 0) +
        data.hourDistribution[0];
      return data.totalCount > 0 && nightHours / data.totalCount > 0.4;
    },
  },
  {
    id: "early-bird",
    label: "Early Bird",
    emoji: "\u{1F426}",
    category: "time",
    condition: (data) => {
      const morningHours = data.hourDistribution.slice(6, 9).reduce((a, b) => a + b, 0);
      return data.totalCount > 0 && morningHours / data.totalCount > 0.3;
    },
  },
  {
    id: "lunch-break",
    label: "Lunch Break Lover",
    emoji: "\u{1F37D}\uFE0F",
    category: "time",
    condition: (data) => {
      const lunchHours = data.hourDistribution.slice(11, 14).reduce((a, b) => a + b, 0);
      return data.totalCount > 0 && lunchHours / data.totalCount > 0.25;
    },
  },
  {
    id: "golden-hour",
    label: "Golden Hour",
    emoji: "\u{1F305}",
    category: "time",
    condition: (data) => {
      const eveningHours = data.hourDistribution.slice(17, 20).reduce((a, b) => a + b, 0);
      return data.totalCount > 0 && eveningHours / data.totalCount > 0.35;
    },
  },
  {
    id: "midnight-serial",
    label: "Midnight Serial",
    emoji: "\u{1F319}",
    category: "time",
    condition: (data) => {
      return data.totalCount > 0 && data.hourDistribution[0] / data.totalCount > 0.15;
    },
  },

  // Frequency tags
  {
    id: "weekend-warrior",
    label: "Weekend Warrior",
    emoji: "\u{1F3C6}",
    category: "frequency",
    condition: (data) => {
      const weekendCount = data.weekdayDistribution[0] + data.weekdayDistribution[6];
      return data.totalCount > 0 && weekendCount / data.totalCount > 0.6;
    },
  },
  {
    id: "weekday-lover",
    label: "Weekday Lover",
    emoji: "\u{1F4BC}",
    category: "frequency",
    condition: (data) => {
      const weekdayCount = data.weekdayDistribution.slice(1, 6).reduce((a, b) => a + b, 0);
      return data.totalCount > 0 && weekdayCount / data.totalCount > 0.7;
    },
  },
  {
    id: "consistent-dater",
    label: "Consistent Dater",
    emoji: "\u{1F4C5}",
    category: "frequency",
    condition: (data) => data.avgFrequencyPerWeek >= 3,
  },
  {
    id: "quality-seeker",
    label: "Quality Seeker",
    emoji: "\u{2B50}",
    category: "frequency",
    condition: (data) =>
      data.avgDurationMinutes >= 30 && data.avgRating !== null && data.avgRating >= 4,
  },
  {
    id: "speed-runner",
    label: "Speed Runner",
    emoji: "\u{26A1}",
    category: "frequency",
    condition: (data) => data.avgDurationMinutes <= 10 && data.totalCount >= 10,
  },

  // Persistence tags
  {
    id: "忠实记录者",
    label: "Dedicated Logger",
    emoji: "\u{1F4DD}",
    category: "persistence",
    condition: (data) => data.totalCount >= 100,
  },
  {
    id: "streak-master",
    label: "Streak Master",
    emoji: "\u{1F525}",
    category: "persistence",
    condition: (data) => data.longestStreakDays >= 7,
  },
  {
    id: "marathon-runner",
    label: "Marathon Runner",
    emoji: "\u{1F3C3}",
    category: "persistence",
    condition: (data) => data.longestStreakDays >= 14,
  },
  {
    id: "year-veteran",
    label: "Year Veteran",
    emoji: "\u{1F3C5}",
    category: "persistence",
    condition: (data) => data.totalCount >= 50,
  },
  {
    id: "centurion",
    label: "Centurion",
    emoji: "\u{1F3AF}",
    category: "persistence",
    condition: (data) => data.totalCount >= 100,
  },

  // Location tags
  {
    id: "homebody",
    label: "Homebody",
    emoji: "\u{1F3E0}",
    category: "location",
    condition: (data) =>
      data.cityCount <= 1 || (data.homeCount + data.awayCount > 0 && data.homeCount / (data.homeCount + data.awayCount) > 0.8),
  },
  {
    id: "city-explorer",
    label: "City Explorer",
    emoji: "\u{1F5FA}\uFE0F",
    category: "location",
    condition: (data) => data.cityCount >= 3,
  },
  {
    id: "jet-setter",
    label: "Jet Setter",
    emoji: "\u{2708}\uFE0F",
    category: "location",
    condition: (data) => data.cityCount >= 5,
  },
  {
    id: "balanced-traveler",
    label: "Balanced Traveler",
    emoji: "\u{2696}\uFE0F",
    category: "location",
    condition: (data) =>
      data.homeCount > 0 &&
      data.awayCount > 0 &&
      Math.abs(data.homeCount - data.awayCount) / (data.homeCount + data.awayCount) < 0.2,
  },

  // Season tags
  {
    id: "february-love",
    label: "February Love",
    emoji: "\u{1F496}",
    category: "season",
    condition: (data) => {
      const febCount = data.monthlyDistribution[1];
      const maxMonth = Math.max(...data.monthlyDistribution);
      return febCount === maxMonth && febCount > 0;
    },
  },
  {
    id: "summer-passion",
    label: "Summer Passion",
    emoji: "\u{2600}\uFE0F",
    category: "season",
    condition: (data) => {
      const summerCount = data.monthlyDistribution[5] + data.monthlyDistribution[6] + data.monthlyDistribution[7];
      return data.totalCount > 0 && summerCount / data.totalCount > 0.35;
    },
  },
  {
    id: "winter-warmer",
    label: "Winter Warmer",
    emoji: "\u{2744}\uFE0F",
    category: "season",
    condition: (data) => {
      const winterCount = data.monthlyDistribution[11] + data.monthlyDistribution[0] + data.monthlyDistribution[1];
      return data.totalCount > 0 && winterCount / data.totalCount > 0.35;
    },
  },
  {
    id: "holiday-lover",
    label: "Holiday Lover",
    emoji: "\u{1F389}",
    category: "season",
    condition: (data) => {
      const holidayCount = data.monthlyDistribution[11] + data.monthlyDistribution[0];
      return data.totalCount > 0 && holidayCount / data.totalCount > 0.25;
    },
  },
  {
    id: "spring-fling",
    label: "Spring Fling",
    emoji: "\u{1F338}",
    category: "season",
    condition: (data) => {
      const springCount = data.monthlyDistribution[2] + data.monthlyDistribution[3] + data.monthlyDistribution[4];
      return data.totalCount > 0 && springCount / data.totalCount > 0.35;
    },
  },
];

export function generatePersonalTags(data: AnnualReportData): PersonalTag[] {
  const matchedTags: PersonalTag[] = [];

  for (const rule of TAG_RULES) {
    if (rule.condition(data)) {
      matchedTags.push({
        id: rule.id,
        label: rule.label,
        emoji: rule.emoji,
        category: rule.category,
      });
    }
  }

  const categoryOrder: Record<PersonalTag["category"], number> = {
    time: 0,
    frequency: 1,
    persistence: 2,
    location: 3,
    season: 4,
  };

  matchedTags.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);

  return matchedTags.slice(0, 6);
}
