#!/usr/bin/env node
/**
 * Generate all app icons from the Ghost SVG logo.
 * White ghost on black circle background.
 * Uses sharp for PNG generation.
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Ghost SVG on black background (rounded for iOS-style, square canvas)
function makeIconSvg(size) {
  const ghostScale = size * 0.55; // Ghost takes up ~55% of the icon
  const offset = (size - ghostScale) / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#000000"/>
  <g transform="translate(${offset}, ${offset}) scale(${ghostScale / 100})">
    <path d="M50 8C30 8 18 24 18 42v32c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8V42C82 24 70 8 50 8z" fill="white"/>
    <circle cx="38" cy="38" r="5" fill="black"/>
    <circle cx="62" cy="38" r="5" fill="black"/>
    <ellipse cx="50" cy="52" rx="4" ry="3" fill="black"/>
  </g>
</svg>`;
}

// Android adaptive icon foreground (ghost centered on transparent bg, with padding)
function makeAdaptiveForeground(size) {
  // Android adaptive icons need 108dp with 72dp safe zone (66.67%)
  // The foreground should have the icon centered in the safe zone
  const ghostScale = size * 0.40; // Smaller to fit in safe zone
  const offset = (size - ghostScale) / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(${offset}, ${offset}) scale(${ghostScale / 100})">
    <path d="M50 8C30 8 18 24 18 42v32c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8V42C82 24 70 8 50 8z" fill="white"/>
    <circle cx="38" cy="38" r="5" fill="black"/>
    <circle cx="62" cy="38" r="5" fill="black"/>
    <ellipse cx="50" cy="52" rx="4" ry="3" fill="black"/>
  </g>
</svg>`;
}

// Splash screen SVG (ghost centered, larger canvas)
function makeSplashSvg(width, height) {
  const ghostScale = Math.min(width, height) * 0.15;
  const offsetX = (width - ghostScale) / 2;
  const offsetY = (height - ghostScale) / 2;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#000000"/>
  <g transform="translate(${offsetX}, ${offsetY}) scale(${ghostScale / 100})">
    <path d="M50 8C30 8 18 24 18 42v32c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8V42C82 24 70 8 50 8z" fill="white"/>
    <circle cx="38" cy="38" r="5" fill="black"/>
    <circle cx="62" cy="38" r="5" fill="black"/>
    <ellipse cx="50" cy="52" rx="4" ry="3" fill="black"/>
  </g>
</svg>`;
}

async function generateIcon(svgStr, outputPath, size) {
  const dir = dirname(outputPath);
  mkdirSync(dir, { recursive: true });

  const ext = outputPath.endsWith('.webp') ? 'webp' : 'png';
  let pipeline = sharp(Buffer.from(svgStr)).resize(size, size);

  if (ext === 'webp') {
    await pipeline.webp({ quality: 95 }).toFile(outputPath);
  } else {
    await pipeline.png().toFile(outputPath);
  }
  console.log(`  ${outputPath} (${size}x${size})`);
}

async function main() {
  console.log('Generating GhostLog icons...\n');

  // --- iOS ---
  console.log('iOS:');
  await generateIcon(makeIconSvg(1024), join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), 1024);

  // --- Web / PWA ---
  console.log('\nWeb/PWA:');
  await generateIcon(makeIconSvg(32), join(ROOT, 'public/favicon-32x32.png'), 32);
  await generateIcon(makeIconSvg(180), join(ROOT, 'public/apple-touch-icon.png'), 180);
  await generateIcon(makeIconSvg(192), join(ROOT, 'public/icon-192.png'), 192);
  await generateIcon(makeIconSvg(512), join(ROOT, 'public/icon-512.png'), 512);

  // --- Android launcher icons ---
  console.log('\nAndroid launcher:');
  const androidDensities = [
    { name: 'mdpi', size: 48 },
    { name: 'hdpi', size: 72 },
    { name: 'xhdpi', size: 96 },
    { name: 'xxhdpi', size: 144 },
    { name: 'xxxhdpi', size: 192 },
  ];

  for (const { name, size } of androidDensities) {
    const base = join(ROOT, `android/app/src/main/res/mipmap-${name}`);
    await generateIcon(makeIconSvg(size), join(base, 'ic_launcher.webp'), size);
    await generateIcon(makeIconSvg(size), join(base, 'ic_launcher_round.webp'), size);
  }

  // Android adaptive foreground
  console.log('\nAndroid adaptive foreground:');
  const adaptiveDensities = [
    { name: 'mdpi', size: 108 },
    { name: 'hdpi', size: 162 },
    { name: 'xhdpi', size: 216 },
    { name: 'xxhdpi', size: 324 },
    { name: 'xxxhdpi', size: 432 },
  ];

  for (const { name, size } of adaptiveDensities) {
    const base = join(ROOT, `android/app/src/main/res/mipmap-${name}`);
    await generateIcon(makeAdaptiveForeground(size), join(base, 'ic_launcher_foreground.webp'), size);
  }

  // Android adaptive background (solid black)
  console.log('\nAndroid adaptive background:');
  const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
  <path
      android:fillColor="#000000"
      android:pathData="M0,0h108v108h-108z"/>
</vector>`;
  const bgPath = join(ROOT, 'android/app/src/main/res/drawable/ic_launcher_background.xml');
  mkdirSync(dirname(bgPath), { recursive: true });
  writeFileSync(bgPath, bgXml);
  console.log(`  ${bgPath}`);

  // --- Splash screens ---
  console.log('\nSplash screens:');

  // iOS splash
  const iosSplashSizes = [
    { name: 'splash-2732x2732-2.png', size: 2732 },   // 1x
    { name: 'splash-2732x2732-1.png', size: 2732 },   // 2x
    { name: 'splash-2732x2732.png', size: 2732 },      // 3x
  ];
  for (const { name, size } of iosSplashSizes) {
    const svg = makeSplashSvg(size, size);
    const outPath = join(ROOT, `ios/App/App/Assets.xcassets/Splash.imageset/${name}`);
    mkdirSync(dirname(outPath), { recursive: true });
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
    console.log(`  ${outPath} (${size}x${size})`);
  }

  // Android splash (single drawable)
  const androidSplashSvg = makeSplashSvg(480, 480);
  const androidSplashPath = join(ROOT, 'android/app/src/main/res/drawable/splash.png');
  await sharp(Buffer.from(androidSplashSvg)).resize(480, 480).png().toFile(androidSplashPath);
  console.log(`  ${androidSplashPath} (480x480)`);

  console.log('\nDone! All icons generated.');
}

main().catch(console.error);
