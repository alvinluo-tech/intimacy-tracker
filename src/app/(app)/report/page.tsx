"use client";

import { useState, useEffect } from "react";
import { Calendar, BarChart3 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportPreview } from "@/components/report/ReportPreview";
import { THEMES } from "@/components/report/poster/AnnualPoster";

type ReportData = {
  totalCount: number;
  totalDurationMinutes: number;
  longestStreakDays: number;
  cityCount: number;
  avgFrequencyPerWeek: number;
  avgDurationMinutes: number;
};

const AVAILABLE_YEARS = [2024, 2025, 2026];

export default function ReportPage() {
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );
  const [selectedTheme, setSelectedTheme] = useState(THEMES.darkPurple);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPreview() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/report/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year: selectedYear, theme: selectedTheme.id }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setReportData({
            totalCount: 0,
            totalDurationMinutes: 0,
            longestStreakDays: 0,
            cityCount: 0,
            avgFrequencyPerWeek: 0,
            avgDurationMinutes: 0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch preview:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPreview();
  }, [selectedYear, selectedTheme]);

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Annual Report</h1>
        <p className="text-muted-foreground">
          Generate your personalized year-in-review poster
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Select Year
          </h2>
          <div className="flex gap-2">
            {AVAILABLE_YEARS.map((year) => (
              <Button
                key={year}
                variant={selectedYear === year ? "primary" : "outline"}
                onClick={() => setSelectedYear(year)}
              >
                {year}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Choose Theme
          </h2>
          <div className="flex gap-3 flex-wrap">
            {Object.values(THEMES).map((theme) => (
              <Button
                key={theme.id}
                variant={selectedTheme.id === theme.id ? "primary" : "outline"}
                onClick={() => setSelectedTheme(theme)}
              >
                <span
                  className="w-4 h-4 rounded-full mr-2"
                  style={{ background: theme.accent }}
                />
                {theme.name}
              </Button>
            ))}
          </div>
        </Card>

        {error ? (
          <Card className="p-6 border-destructive">
            <p className="text-destructive">{error}</p>
          </Card>
        ) : (
          <ReportPreview
            year={selectedYear}
            data={
              reportData ?? {
                totalCount: 0,
                totalDurationMinutes: 0,
                longestStreakDays: 0,
                cityCount: 0,
                avgFrequencyPerWeek: 0,
              }
            }
            theme={selectedTheme}
          />
        )}

        <Card className="p-6 bg-muted/50">
          <h3 className="text-sm font-medium mb-2">Data Sources</h3>
          <p className="text-xs text-muted-foreground">
            Percentile comparisons are based on published academic research from
            the Kinsey Institute and NATSAL surveys. Your personal data is never
            compared to other users.
          </p>
        </Card>
      </div>
    </div>
  );
}
