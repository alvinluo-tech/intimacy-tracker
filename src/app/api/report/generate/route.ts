import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import sharp from "sharp";

import { getServerUser } from "@/features/auth/queries";
import { getAnnualReportData } from "@/lib/report/aggregator";
import { getAllPercentiles } from "@/lib/report/percentile";
import { generatePersonalTags } from "@/lib/report/tag-engine";
import { AnnualPoster, THEMES } from "@/components/report/poster/AnnualPoster";
import { loadSatoriFonts } from "@/lib/report/fonts";

type GenerateRequest = {
  year: number;
  theme?: string;
  options?: {
    showPartner?: boolean;
    showTimeInfo?: boolean;
    showLocation?: boolean;
    showPercentile?: boolean;
  };
};

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as GenerateRequest;
    const { year, theme = "darkPurple", options = {} } = body;

    if (!year || year < 2000 || year > new Date().getFullYear()) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    const reportData = await getAnnualReportData(user.id, year);
    if (!reportData) {
      return NextResponse.json(
        { error: "No data found for this year" },
        { status: 404 }
      );
    }

    const percentiles = getAllPercentiles(
      reportData.avgFrequencyPerWeek * 52,
      reportData.avgDurationMinutes,
      reportData.longestStreakDays,
      reportData.cityCount
    );

    const tags = generatePersonalTags(reportData);

    const posterTheme = THEMES[theme] || THEMES.darkPurple;

    const { fonts: satoriFonts, fontFamily } = await loadSatoriFonts();

    const posterProps = AnnualPoster({
      data: reportData,
      percentiles,
      tags,
      theme: posterTheme,
      fontFamily,
      showPartner: options.showPartner ?? false,
      showTimeInfo: options.showTimeInfo ?? true,
      showLocation: options.showLocation ?? true,
      showPercentile: options.showPercentile ?? true,
    });

    const svg = await satori(posterProps, {
      width: 1080,
      height: 1920,
      fonts: satoriFonts,
    });

    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="encounter-${year}-wrapped.png"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[Report Generate]", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
