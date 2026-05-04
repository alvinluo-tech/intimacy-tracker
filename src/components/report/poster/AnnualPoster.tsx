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
  },
};

type AnnualPosterProps = {
  data: AnnualReportData;
  percentiles: AllPercentiles;
  tags: PersonalTag[];
  theme?: PosterTheme;
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

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function AnnualPoster({
  data,
  percentiles,
  tags,
  theme = THEMES.darkPurple,
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
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative" as const,
      },
      children: [
        // Header Section
        {
          type: "div",
          props: {
            style: {
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              padding: "60px 60px 40px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "24px",
                    fontWeight: 500,
                    color: theme.textSecondary,
                    letterSpacing: "2px",
                    textTransform: "uppercase" as const,
                  },
                  children: "Encounter",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "72px",
                    fontWeight: 700,
                    letterSpacing: "-2px",
                    lineHeight: "1",
                  },
                  children: `${data.year} Wrapped`,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "20px",
                    color: theme.textSecondary,
                    marginTop: "8px",
                  },
                  children: "Your Year in Review",
                },
              },
            ],
          },
        },

        // Main Number Section
        {
          type: "div",
          props: {
            style: {
              padding: "50px 60px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "120px",
                    fontWeight: 700,
                    color: theme.accent,
                    lineHeight: "1",
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
                  },
                  children: "encounters recorded",
                },
              },
            ],
          },
        },

        // Percentile Banner (conditional)
        ...(showPercentile
          ? [
              {
                type: "div",
                props: {
                  style: {
                    margin: "0 60px",
                    padding: "24px 32px",
                    background: theme.accent,
                    borderRadius: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "22px",
                          fontWeight: 600,
                        },
                        children: `Top ${100 - percentiles.frequency.percentile}%`,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "16px",
                          opacity: 0.9,
                        },
                        children: "compared to population average",
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
              gap: "24px",
            },
            children: [
              // Duration
              {
                type: "div",
                props: {
                  style: {
                    flex: 1,
                    padding: "24px",
                    background: theme.secondary,
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "36px",
                          fontWeight: 700,
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
                        children: "total time",
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
                    padding: "24px",
                    background: theme.secondary,
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "36px",
                          fontWeight: 700,
                        },
                        children: `${data.longestStreakDays}`,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "14px",
                          color: theme.textSecondary,
                        },
                        children: "day streak",
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
                          padding: "24px",
                          background: theme.secondary,
                          borderRadius: "12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "36px",
                                fontWeight: 700,
                              },
                              children: `${data.cityCount}`,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "14px",
                                color: theme.textSecondary,
                              },
                              children: "cities",
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

        // Top Stats
        {
          type: "div",
          props: {
            style: {
              padding: "0 60px 30px",
              display: "flex",
              gap: "16px",
              flexWrap: "wrap" as const,
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    padding: "12px 20px",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "16px",
                  },
                  children: `Top Day: ${WEEKDAY_NAMES[data.topWeekday]}`,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    padding: "12px 20px",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "16px",
                  },
                  children: `Top Month: ${MONTH_NAMES[data.topMonth]}`,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    padding: "12px 20px",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "16px",
                  },
                  children: `Peak Hour: ${data.topHour}:00`,
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
                    padding: "30px 60px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "20px",
                          fontWeight: 600,
                          color: theme.textSecondary,
                        },
                        children: "Your Tags",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexWrap: "wrap" as const,
                          gap: "12px",
                        },
                        children: tags.map((tag) => ({
                          type: "div",
                          props: {
                            style: {
                              padding: "10px 20px",
                              background: `${theme.accent}33`,
                              borderRadius: "24px",
                              fontSize: "16px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            },
                            children: [`${tag.emoji} `, tag.label],
                          },
                        })),
                      },
                    },
                  ],
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
              padding: "40px 60px",
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
                    fontSize: "14px",
                    color: theme.textSecondary,
                    opacity: 0.8,
                  },
                  children: "Private by default. Only you can see this.",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "16px",
                    fontWeight: 600,
                    color: theme.accent,
                  },
                  children: "Encounter",
                },
              },
            ],
          },
        },
      ],
    },
  } as React.ReactElement;
}
