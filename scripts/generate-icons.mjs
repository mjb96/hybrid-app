#!/usr/bin/env node
// =============================================================================
// APP ICON GENERATOR
//
// Source: assets/brand/icon.svg — two lanes forming an H (steel + cyan) joined
// by a lime running lane. Renders every launcher/web size from the vector so
// small icons stay crisp and the adaptive-foreground layer keeps its safe zone.
//
// Run: node scripts/generate-icons.mjs
// =============================================================================
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'assets', 'brand', 'icon.svg');
const source = await readFile(SOURCE, 'utf8');
const marked = source.match(/<g>([\s\S]*?)<\/g>/);
if (!marked) throw new Error('assets/brand/icon.svg must contain one <g> mark');
const MARK = marked[1];

function svg(mode) {
  const background = mode === 'foreground'
    ? ''
    : mode === 'round'
      ? '<circle cx="512" cy="512" r="512" fill="#070a12"/>'
      : '<rect width="1024" height="1024" fill="#070a12"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
    ${background}<g>${MARK}</g>
  </svg>`;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });

async function render(size, mode, output) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><style>
    html, body { margin: 0; background: transparent; }
    svg { display: block; width: ${size}px; height: ${size}px; }
  </style>${svg(mode)}`);
  await page.screenshot({
    path: output,
    omitBackground: mode !== 'full',
    clip: { x: 0, y: 0, width: size, height: size },
  });
  console.log(`  ${path.relative(ROOT, output)}  ${size}×${size}  ${mode}`);
}

try {
  await render(512, 'full', path.join(ROOT, 'icon-512.png'));
  await render(192, 'full', path.join(ROOT, 'icon-192.png'));
  await render(512, 'full', path.join(ROOT, 'icon-maskable-512.png'));

  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, size] of Object.entries(densities)) {
    await render(size, 'full', path.join(ROOT, 'android/app/src/main/res', `mipmap-${density}`, 'ic_launcher.png'));
    await render(size, 'round', path.join(ROOT, 'android/app/src/main/res', `mipmap-${density}`, 'ic_launcher_round.png'));
  }
  // Adaptive foreground: 108dp canvas, transparent, mark inside the 66dp safe zone.
  await render(432, 'foreground', path.join(ROOT, 'android/app/src/main/res/drawable/ic_launcher_foreground.png'));
} finally {
  await browser.close();
}

console.log('Icons generated from assets/brand/icon.svg');
