"use client";

import { useState } from "react";
import { Download, Share2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShareModal } from "./ShareModal";
import type { PosterTheme } from "@/components/report/poster/AnnualPoster";

type ReportPreviewProps = {
  year: number;
  data: {
    totalCount: number;
    totalDurationMinutes: number;
    longestStreakDays: number;
    cityCount: number;
    avgFrequencyPerWeek: number;
  };
  theme: PosterTheme;
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days > 0) return `${days}d ${remainingHours}h`;
  return `${hours}h`;
}

export function ReportPreview({ year, data, theme }: ReportPreviewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, theme: theme.id }),
      });

      if (!response.ok) throw new Error("Failed to generate");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `encounter-${year}-wrapped.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Card className="p-6" style={{ background: theme.background }}>
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-4xl font-bold" style={{ color: theme.accent }}>
              {data.totalCount}
            </h2>
            <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
              encounters in {year}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xl font-semibold" style={{ color: theme.text }}>
                {formatDuration(data.totalDurationMinutes)}
              </div>
              <div className="text-xs" style={{ color: theme.textSecondary }}>
                total time
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold" style={{ color: theme.text }}>
                {data.longestStreakDays}
              </div>
              <div className="text-xs" style={{ color: theme.textSecondary }}>
                day streak
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold" style={{ color: theme.text }}>
                {data.cityCount}
              </div>
              <div className="text-xs" style={{ color: theme.textSecondary }}>
                cities
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex-1"
              style={{ background: theme.accent }}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download PNG
            </Button>
            <Button
              onClick={() => setShowShareModal(true)}
              variant="outline"
              style={{ borderColor: theme.accent, color: theme.accent }}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        year={year}
        theme={theme}
      />
    </>
  );
}
