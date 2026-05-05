import type { AnnualReportData } from "@/lib/report/aggregator";
import type { PersonalTag } from "@/lib/report/tag-engine";
import type { AllPercentiles } from "@/lib/report/percentile";

export type PosterTheme = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textSecondary: string;
  cardBg: string;
  gradient: string;
};

export const THEMES: Record<string, PosterTheme> = {
  darkPurple: {
    id: "darkPurple",
    name: "Dark Purple",
    primary: "#26215C",
    secondary: "#1a1640",
    accent: "#8B5CF6",
    background: "#0f0d2a",
    text: "#FFFFFF",
    textSecondary: "#A5B4FC",
    cardBg: "rgba(139, 92, 246, 0.15)",
    gradient: "linear-gradient(135deg, #26215C 0%, #1a1640 100%)",
  },
  forestGreen: {
    id: "forestGreen",
    name: "Forest Green",
    primary: "#0F6E56",
    secondary: "#0A4D3D",
    accent: "#34D399",
    background: "#022C22",
    text: "#FFFFFF",
    textSecondary: "#6EE7B7",
    cardBg: "rgba(52, 211, 153, 0.15)",
    gradient: "linear-gradient(135deg, #0F6E56 0%, #0A4D3D 100%)",
  },
  coral: {
    id: "coral",
    name: "Coral",
    primary: "#993C1D",
    secondary: "#7C2F15",
    accent: "#FB923C",
    background: "#1C0A00",
    text: "#FFFFFF",
    textSecondary: "#FDBA74",
    cardBg: "rgba(251, 146, 60, 0.15)",
    gradient: "linear-gradient(135deg, #993C1D 0%, #7C2F15 100%)",
  },
};

type AnnualPosterProps = {
  data: AnnualReportData;
  percentiles: AllPercentiles;
  tags: PersonalTag[];
  theme?: PosterTheme;
  fontFamily?: string;
  showPartner?: boolean;
  showTimeInfo?: boolean;
  showLocation?: boolean;
  showPercentile?: boolean;
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

const WEEKDAY_NAMES_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const MONTH_NAMES_CN = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

function getTagByHour(hour: number): string {
  if (hour >= 22 || hour < 2) return "夜猫子型";
  if (hour >= 6 && hour < 9) return "清晨派";
  if (hour >= 11 && hour < 14) return "午间时光";
  if (hour >= 17 && hour < 20) return "黄金时段";
  return "随心时刻";
}

function getTagByWeekday(weekday: number): string {
  if (weekday === 0 || weekday === 6) return "周末战士";
  return "工作日热爱者";
}

function getTagByMonth(month: number): string {
  if (month === 1) return "情人节效应";
  if (month >= 5 && month <= 7) return "夏日激情";
  if (month === 11 || month === 0) return "冬日温暖";
  return "当季热门";
}

function getDurationComparison(minutes: number): string {
  if (minutes >= 30) return "高于均值";
  if (minutes >= 15) return "接近均值";
  return "精简高效";
}

export function AnnualPoster({
  data,
  percentiles,
  tags,
  theme = THEMES.darkPurple,
  fontFamily = "'Inter', 'SF Pro Display', -apple-system, sans-serif",
  showPartner = false,
  showTimeInfo = true,
  showLocation = true,
  showPercentile = true,
}: AnnualPosterProps): React.ReactElement {
  return {
    type: "div",
    props: {
      style: {
        width: "1080px",
        height: "1920px",
        background: theme.background,
        fontFamily,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      },
      children: [
        // Header Section with gradient
        {
          type: "div",
          props: {
            style: {
              background: theme.gradient,
              padding: "48px 60px 40px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "16px",
                    fontWeight: 500,
                    color: theme.textSecondary,
                    letterSpacing: "3px",
                    textTransform: "uppercase" as const,
                  },
                  children: `ENCOUNTER \u00B7 ${data.year} ANNUAL REPORT`,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "140px",
                    fontWeight: 700,
                    letterSpacing: "-4px",
                    lineHeight: "1",
                    marginTop: "16px",
                  },
                  children: data.totalCount.toString(),
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "28px",
                    color: theme.textSecondary,
                    marginTop: "8px",
                  },
                  children: "encounters this year",
                },
              },
            ],
          },
        },

        // Percentile Banner
        ...(showPercentile
          ? [
              {
                type: "div",
                props: {
                  style: {
                    margin: "0 60px",
                    padding: "28px 36px",
                    background: theme.cardBg,
                    borderRadius: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "-20px",
                    border: `1px solid ${theme.accent}33`,
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "42px",
                                fontWeight: 700,
                                color: theme.accent,
                              },
                              children: `TOP ${100 - percentiles.frequency.percentile}%`,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "16px",
                                color: theme.textSecondary,
                              },
                              children: `\u8D85\u8FC7\u4E86 ${percentiles.frequency.percentile}% \u7684\u540C\u9F84\u4EBA`,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "14px",
                                color: theme.textSecondary,
                                opacity: 0.8,
                              },
                              children: `\u5E74\u5747\u9891\u7387 ${data.avgFrequencyPerWeek.toFixed(1)}\u6B21/\u5468`,
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          textAlign: "right" as const,
                          fontSize: "12px",
                          color: theme.textSecondary,
                          opacity: 0.7,
                          lineHeight: "1.6",
                        },
                        children: "\u57FA\u4E8E Kinsey Institute \u516C\u5F00\u6570\u636E\n\u975E\u7528\u6237\u6570\u636E\u6BD4\u8F83",
                      },
                    },
                  ],
                },
              },
            ]
          : []),

        // Stats Grid
        {
          type: "div",
          props: {
            style: {
              padding: "40px 60px",
              display: "flex",
              gap: "20px",
            },
            children: [
              // Duration
              {
                type: "div",
                props: {
                  style: {
                    flex: 1,
                    padding: "28px 20px",
                    background: theme.cardBg,
                    borderRadius: "16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    border: `1px solid ${theme.accent}22`,
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "40px",
                          fontWeight: 700,
                          color: theme.accent,
                        },
                        children: formatDuration(data.totalDurationMinutes),
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "14px",
                          color: theme.textSecondary,
                        },
                        children: "\u603B\u65F6\u957F",
                      },
                    },
                  ],
                },
              },
              // Streak
              {
                type: "div",
                props: {
                  style: {
                    flex: 1,
                    padding: "28px 20px",
                    background: theme.cardBg,
                    borderRadius: "16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    border: `1px solid ${theme.accent}22`,
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "40px",
                          fontWeight: 700,
                          color: theme.accent,
                        },
                        children: `${data.longestStreakDays}\u5929`,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "14px",
                          color: theme.textSecondary,
                        },
                        children: "\u6700\u957F\u8FDE\u7EED",
                      },
                    },
                  ],
                },
              },
              // Cities
              ...(showLocation
                ? [
                    {
                      type: "div",
                      props: {
                        style: {
                          flex: 1,
                          padding: "28px 20px",
                          background: theme.cardBg,
                          borderRadius: "16px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "8px",
                          border: `1px solid ${theme.accent}22`,
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "40px",
                                fontWeight: 700,
                                color: theme.accent,
                              },
                              children: `${data.cityCount}\u57CE`,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "14px",
                                color: theme.textSecondary,
                              },
                              children: "\u5730\u70B9\u8DE8\u5EA6",
                            },
                          },
                        ],
                      },
                    },
                  ]
                : []),
            ],
          },
        },

        // Top Stats Grid (2x2)
        {
          type: "div",
          props: {
            style: {
              padding: "0 60px 30px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            },
            children: [
              // Row 1
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    gap: "16px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          flex: 1,
                          padding: "20px",
                          background: theme.cardBg,
                          borderRadius: "12px",
                          border: `1px solid ${theme.accent}22`,
                          display: "flex",
                          flexDirection: "column",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "12px",
                                color: theme.textSecondary,
                                marginBottom: "6px",
                              },
                              children: "\u6700\u6D3B\u8DC3\u65F6\u6BB5",
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "24px",
                                fontWeight: 700,
                                marginBottom: "4px",
                              },
                              children: `${String(data.topHour).padStart(2, "0")}:00 - ${String(data.topHour + 1).padStart(2, "0")}:00`,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "12px",
                                color: theme.textSecondary,
                              },
                              children: getTagByHour(data.topHour),
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          flex: 1,
                          padding: "20px",
                          background: theme.cardBg,
                          borderRadius: "12px",
                          border: `1px solid ${theme.accent}22`,
                          display: "flex",
                          flexDirection: "column",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "12px",
                                color: theme.textSecondary,
                                marginBottom: "6px",
                              },
                              children: "\u6700\u6D3B\u8DC3\u661F\u671F",
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "24px",
                                fontWeight: 700,
                                marginBottom: "4px",
                              },
                              children: WEEKDAY_NAMES_CN[data.topWeekday],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "12px",
                                color: theme.textSecondary,
                              },
                              children: getTagByWeekday(data.topWeekday),
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              // Row 2
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    gap: "16px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          flex: 1,
                          padding: "20px",
                          background: theme.cardBg,
                          borderRadius: "12px",
                          border: `1px solid ${theme.accent}22`,
                          display: "flex",
                          flexDirection: "column",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "12px",
                                color: theme.textSecondary,
                                marginBottom: "6px",
                              },
                              children: "\u6700\u6D3B\u8DC3\u6708\u4EFD",
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "24px",
                                fontWeight: 700,
                                marginBottom: "4px",
                              },
                              children: MONTH_NAMES_CN[data.topMonth],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "12px",
                                color: theme.textSecondary,
                              },
                              children: getTagByMonth(data.topMonth),
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          flex: 1,
                          padding: "20px",
                          background: theme.cardBg,
                          borderRadius: "12px",
                          border: `1px solid ${theme.accent}22`,
                          display: "flex",
                          flexDirection: "column",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "12px",
                                color: theme.textSecondary,
                                marginBottom: "6px",
                              },
                              children: "\u5E73\u5747\u65F6\u957F",
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "24px",
                                fontWeight: 700,
                                marginBottom: "4px",
                              },
                              children: `${Math.round(data.avgDurationMinutes)} min`,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "12px",
                                color: theme.textSecondary,
                              },
                              children: getDurationComparison(data.avgDurationMinutes),
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },

        // Personal Tags
        ...(tags.length > 0
          ? [
              {
                type: "div",
                props: {
                  style: {
                    padding: "0 60px 30px",
                    display: "flex",
                    flexWrap: "wrap" as const,
                    gap: "10px",
                  },
                  children: tags.map((tag) => ({
                    type: "div",
                    props: {
                      style: {
                        padding: "8px 16px",
                        background: theme.cardBg,
                        borderRadius: "20px",
                        fontSize: "14px",
                        border: `1px solid ${theme.accent}33`,
                        color: theme.accent,
                      },
                      children: `${tag.emoji} ${tag.label}`,
                    },
                  })),
                },
              },
            ]
          : []),

        // Spacer
        {
          type: "div",
          props: {
            style: {
              flex: 1,
            },
          },
        },

        // Footer
        {
          type: "div",
          props: {
            style: {
              padding: "32px 60px",
              background: theme.primary,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "13px",
                    color: theme.textSecondary,
                    opacity: 0.8,
                  },
                  children: "\u4EC5\u4F60\u53EF\u89C1 \u00B7 \u6570\u636E\u52A0\u5BC6\u5B58\u50A8",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "14px",
                    fontWeight: 600,
                    color: theme.accent,
                    opacity: 0.9,
                  },
                  children: "encounter \u00B7 2024",
                },
              },
            ],
          },
        },
      ],
    },
  } as React.ReactElement;
}
