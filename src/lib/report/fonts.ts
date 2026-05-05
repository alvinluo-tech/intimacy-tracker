type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

const INTER_FONTS: Array<{ weight: FontWeight; url: string }> = [
  { weight: 400, url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuBWYAZ9hiJ-Ek-_EeA.woff2" },
  { weight: 700, url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFo4AZ9hiJ-Ek-_EeA.woff2" },
];

const NOTO_SANS_SC_URL =
  "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk/Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf";

export type SatoriFont = {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: "normal" | "italic";
};

type FontResult = {
  fonts: SatoriFont[];
  fontFamily: string;
};

let cache: FontResult | null = null;

let decompressWoff2: ((buffer: Uint8Array) => Promise<Uint8Array>) | null = null;

async function getDecompressor() {
  if (!decompressWoff2) {
    // @ts-expect-error - wawoff2 has no type declarations
    const wawoff2 = await import("wawoff2");
    decompressWoff2 = wawoff2.decompress;
  }
  return decompressWoff2;
}

async function fetchFontAsTtf(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed (${res.status}): ${url}`);
  const buffer = await res.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  const isWoff2 =
    uint8[0] === 0x77 &&
    uint8[1] === 0x4f &&
    uint8[2] === 0x46 &&
    uint8[3] === 0x32;

  if (isWoff2) {
    const decompress = await getDecompressor();
    if (!decompress) throw new Error("Failed to load wawoff2 decompressor");
    const ttf = await decompress(uint8);
    const ttfArray = new Uint8Array(ttf);
    const result = new ArrayBuffer(ttfArray.byteLength);
    new Uint8Array(result).set(ttfArray);
    return result;
  }

  return buffer;
}

export async function loadSatoriFonts(): Promise<FontResult> {
  if (cache) return cache;

  const fonts: SatoriFont[] = [];

  const interResults = await Promise.allSettled(
    INTER_FONTS.map(({ weight, url }) =>
      fetchFontAsTtf(url).then((data) => ({ weight, data }))
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

  try {
    const notoData = await fetchFontAsTtf(NOTO_SANS_SC_URL);
    fonts.push({
      name: "NotoSansSC",
      data: notoData,
      weight: 400,
      style: "normal",
    });
  } catch (err) {
    console.error("[fonts] Failed to load Noto Sans SC:", err);
  }

  const fontFamily = [
    "'Inter'",
    "'NotoSansSC'",
    "'SF Pro Display'",
    "-apple-system",
    "sans-serif",
  ].join(", ");

  cache = { fonts, fontFamily };
  return cache;
}
