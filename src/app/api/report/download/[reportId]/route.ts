import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import sharp from "sharp";

import { getServerUser } from "@/features/auth/queries";
import { getAnnualReportData } from "@/lib/report/aggregator";
import { getAllPercentiles } from "@/lib/report/percentile";
import { generatePersonalTags } from "@/lib/report/tag-engine";
import { AnnualPoster } from "@/components/report/poster/AnnualPoster";
import { loadSatoriFonts } from "@/lib/report/fonts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId } = await params;

    const parts = reportId.split("-");
    if (parts.length < 3 || parts[0] !== "annual") {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
    }

    const reportUserId = parts[1];
    const year = parseInt(parts[2], 10);

    if (reportUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isNaN(year) || year < 2000 || year > new Date().getFullYear()) {
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

    const { fonts: satoriFonts, fontFamily } = await loadSatoriFonts();

    const posterProps = AnnualPoster({
      data: reportData,
      percentiles,
      tags,
      fontFamily,
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
    console.error("[Report Download]", error);
    return NextResponse.json(
      { error: "Failed to download report" },
      { status: 500 }
    );
  }
}
