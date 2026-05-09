const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'public', 'icon-1254.png');
const OUTPUT_DIR = path.join(__dirname, '..', 'public');

const bgColor = { r: 2, g: 6, b: 23, alpha: 1 }; // slate-950 #020617

const sizes = [48, 72, 96, 144, 180, 192, 256, 384, 512];
const maskableSizes = [192, 512]; // PWA only needs 192 & 512 as maskable
const SAFE_ZONE_RATIO = 0.667;    // Android safe zone = inner 66.7% of canvas

// Also generate favicon sizes
const faviconSizes = [16, 32];

async function generate() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Source not found:', SOURCE);
    process.exit(1);
  }

  const sourceBuffer = fs.readFileSync(SOURCE);
  console.log(`Source: icon-1254.png (${(sourceBuffer.length / 1024).toFixed(0)} KB)\n`);

  // ---- Standard icons ----
  for (const size of [...faviconSizes, ...sizes]) {
    const filename = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    await sharp(sourceBuffer)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(outputPath);

    const stat = fs.statSync(outputPath);
    console.log(`  ${filename.padEnd(26)} ${size}x${size}  ${(stat.size / 1024).toFixed(1)} KB`);
  }

  // Also keep icon-180.png as copy of apple-touch-icon
  const applePath = path.join(OUTPUT_DIR, 'apple-touch-icon.png');
  const icon180Path = path.join(OUTPUT_DIR, 'icon-180.png');
  if (fs.existsSync(applePath)) {
    fs.copyFileSync(applePath, icon180Path);
    console.log(`  icon-180.png                (copy)`);
  }

  // ---- Maskable icons (with 30%+ safe-zone padding) ----
  console.log('');
  for (const size of maskableSizes) {
    const filename = `icon-${size}-maskable.png`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    // Scale content to fit within safe zone
    const contentSize = Math.round(size * SAFE_ZONE_RATIO);
    const padding = Math.round((size - contentSize) / 2);

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: bgColor,
      },
    })
      .composite([
        {
          input: await sharp(sourceBuffer)
            .resize(contentSize, contentSize, { fit: 'cover' })
            .png()
            .toBuffer(),
          top: padding,
          left: padding,
        },
      ])
      .png()
      .toFile(outputPath);

    const stat = fs.statSync(outputPath);
    console.log(`  ${filename.padEnd(26)} ${size}x${size}  ${(stat.size / 1024).toFixed(1)} KB (maskable)`);
  }

  // ---- Splash screen ----
  const splashPath = path.join(OUTPUT_DIR, 'splash-2556.png');
  await sharp({
    create: {
      width: 2556,
      height: 2556,
      channels: 4,
      background: bgColor,
    },
  })
    .composite([
      {
        input: await sharp(sourceBuffer)
          .resize(600, 600, { fit: 'contain' })
          .png()
          .toBuffer(),
        top: Math.round((2556 - 600) / 2),
        left: Math.round((2556 - 600) / 2),
      },
    ])
    .png()
    .toFile(splashPath);

  const splashStat = fs.statSync(splashPath);
  console.log(`\n  splash-2556.png             2556x2556  ${(splashStat.size / 1024).toFixed(1)} KB (centered 600px icon)`);

  // ---- PWA Screenshots (placeholder — replace with real device screenshots) ----
  const screenshotsDir = path.join(OUTPUT_DIR, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  const screenshotDefs = [
    { name: 'home', label: 'Dashboard' },
    { name: 'timeline', label: 'Timeline' },
    { name: 'map', label: 'Map' },
  ];

  for (const { name, label } of screenshotDefs) {
    const ssPath = path.join(screenshotsDir, `${name}.png`);
    // Only create placeholder if it doesn't exist (preserve real screenshots)
    if (fs.existsSync(ssPath)) {
      console.log(`  screenshots/${name}.png       (exists, skipped)`);
      continue;
    }

    const labelSvg = Buffer.from(
      `<svg width="390" height="844" xmlns="http://www.w3.org/2000/svg">
        <rect width="390" height="844" fill="#020617"/>
        <rect x="0" y="0" width="390" height="60" fill="#0f172a"/>
        <text x="20" y="38" fill="#f1f5f9" font-family="Inter,sans-serif" font-size="16" font-weight="600">${label}</text>
      </svg>`
    );

    await sharp({
      create: { width: 390, height: 844, channels: 4, background: bgColor },
    })
      .composite([
        { input: await sharp(sourceBuffer).resize(120, 120).png().toBuffer(), top: 220, left: 135 },
        { input: await sharp(labelSvg).png().toBuffer(), top: 0, left: 0 },
      ])
      .png()
      .toFile(ssPath);
    console.log(`  screenshots/${name}.png       390x844 (placeholder)`);
  }

  console.log(`\nDone! ${sizes.length * 2 + faviconSizes.length} icons + splash + ${screenshotDefs.length} screenshots generated.`);
}

generate().catch(console.error);
