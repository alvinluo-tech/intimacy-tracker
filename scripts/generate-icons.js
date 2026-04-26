const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const themeColor = '#f43f5e';
const backgroundColor = '#020617';

async function generateIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
      <circle cx="${size/2}" cy="${size/2}" r="${size * 0.35}" fill="${themeColor}"/>
    </svg>
  `;

  const outputPath = path.join(__dirname, '..', 'public', `icon-${size}.png`);
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  
  console.log(`Generated icon-${size}.png`);
}

async function main() {
  for (const size of sizes) {
    await generateIcon(size);
  }
  console.log('All icons generated successfully!');
}

main().catch(console.error);
