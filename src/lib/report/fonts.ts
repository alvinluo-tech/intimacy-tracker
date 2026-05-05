const INTER_FONT_URLS: Record<number, string> = {
  400: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuBWYAZ9hiJ-Ek-_EeA.woff2",
  700: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFo4AZ9hiJ-Ek-_EeA.woff2",
};

const NOTO_SANS_SC_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap";

export type SatoriFont = {
  name: string;
  data: ArrayBuffer;
  weight: number;
  style: string;
};

type FontResult = {
  fonts: SatoriFont[];
  fontFamily: string;
};

let cache: FontResult | null = null;

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed (${res.status}): ${url}`);
  return res.arrayBuffer();
}

function extractWoff2Urls(css: string): string[] {
  return [...css.matchAll(/url\((https?:\/\/[^)]+\.woff2)\)/g)].map(
    (m) => m[1]
  );
}

export async function loadSatoriFonts(): Promise<FontResult> {
  if (cache) return cache;

  const fonts: SatoriFont[] = [];
  const chineseFontNames: string[] = [];

  // 1. Load Inter (Latin) – weight 400 + 700
  const interEntries = Object.entries(INTER_FONT_URLS);
  const interResults = await Promise.allSettled(
    interEntries.map(([weight, url]) =>
      fetchArrayBuffer(url).then((data) => ({
        weight: Number(weight),
        data,
      }))
    )
  );

  for (const r of interResults) {
    if (r.status === "fulfilled") {
      fonts.push({
        name: "Inter",
        data: r.value.data,
        weight: r.value.weight,
        style: "normal",
      });
    }
  }

  // 2. Load Noto Sans SC (CJK) – all subset slices
  try {
    const cssRes = await fetch(NOTO_SANS_SC_CSS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (cssRes.ok) {
      const css = await cssRes.text();
      const woff2Urls = extractWoff2Urls(css);

      const subsetResults = await Promise.allSettled(
        woff2Urls.map((url) => fetchArrayBuffer(url))
      );

      let idx = 0;
      for (const r of subsetResults) {
        if (r.status === "fulfilled") {
          const name = `NotoSansSC_${idx}`;
          fonts.push({
            name,
            data: r.value,
            weight: 400,
            style: "normal",
          });
          chineseFontNames.push(name);
          idx++;
        }
      }
    }
  } catch (err) {
    console.error("[fonts] Failed to load Noto Sans SC:", err);
  }

  // 3. Build font-family string for satori
  //    On the server, sмедицинскай tries each name in order until a glyph is found.
  //    On the client (preview), the browser ignores unknown names and falls through
  //    to system fonts that support CJK.
  const fontFamily = [
    "'Inter'",
    ...chineseFontNames.map((n) => `'${n}'`),
    "'SF Pro Display'",
    "-apple-system",
    "sans-serif",
  ].join(", ");

  cache = { fonts, fontFamily };
  return cache;
}
