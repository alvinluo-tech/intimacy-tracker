import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import sharp from "sharp";

import { getServerUser } from "@/features/auth/queries";
import { getAnnualReportData } from "@/lib/report/aggregator";
import { getAllPercentiles } from "@/lib/report/percentile";
import { generatePersonalTags } from "@/lib/report/tag-engine";
import { AnnualPoster, THEMES } from "@/components/report/poster/AnnualPoster";
import { loadSatoriFonts } from "@/lib/report/fonts";
import { rateLimit } from "@/lib/rate-limit";

type GenerateRequest = {
  year: number;
  theme?: string;
  options?: {
    showPartner?: boolean;
    showTimeInfo?: boolean;
    showLocation?: boolean;
    showPercentile?: boolean;
    showTotalCount?: boolean;
  };
};

export async function POST(request: NextRequest) {
  try {
    // Step 1: Auth
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Poster rendering is CPU-heavy (satori + sharp) — throttle per user
    const rl = await rateLimit(`report-generate:${user.id}`, { windowMs: 60_000, max: 5 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Step 2: Parse body
    let body: GenerateRequest;
    try {
      body = (await request.json()) as GenerateRequest;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { year, options = {} } = body;

    if (!year || year < 2000 || year > new Date().getFullYear()) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    // Step 3: Fetch data
    const reportData = await getAnnualReportData(user.id, year);
    if (!reportData) {
      return NextResponse.json(
        { error: "No data found for this year" },
        { status: 404 }
      );
    }

    // Step 4: Compute percentiles + tags
    const percentiles = getAllPercentiles(
      reportData.avgFrequencyPerWeek * 52,
      reportData.avgDurationMinutes,
      reportData.longestStreakDays,
      reportData.cityCount
    );
    const tags = generatePersonalTags(reportData);

    // Step 5: Build poster VDOM — only accept known theme keys so prototype
    // values like "toString" can never reach the renderer
    const themeKey =
      typeof body.theme === "string" &&
      Object.prototype.hasOwnProperty.call(THEMES, body.theme)
        ? body.theme
        : "darkPurple";
    const posterTheme = THEMES[themeKey as keyof typeof THEMES];

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
      showTotalCount: options.showTotalCount ?? true,
    });

    const svg = await satori(posterProps, {
      width: 1080,
      height: 1920,
      fonts: satoriFonts,
    });

    // Step 8: Convert to PNG
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    // Step 9: Return
    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="encounter-${year}-wrapped.png"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[Report Generate]", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
