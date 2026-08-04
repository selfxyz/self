// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Renders the extension action icons from the mobile app's icon so both
// surfaces carry the same mark. Small sizes zoom into the center (the app
// icon has generous built-in margins that would render the mark illegible
// at 16px).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(
  root,
  '../../app/ios/Self/Images.xcassets/AppIcon.appiconset/self-app-icon.png',
);
const OUT_DIR = join(root, 'icons');
const SIZES = [
  { size: 16, zoom: 1.35 },
  { size: 32, zoom: 1.2 },
  { size: 48, zoom: 1.1 },
  { size: 128, zoom: 1.0 },
];

const source = readFileSync(SOURCE).toString('base64');
mkdirSync(OUT_DIR, { recursive: true });

const CHROME =
  process.env.CHROME_PATH ??
  join(
    root,
    'chrome/mac_arm-152.0.7962.2/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  );

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage();
  for (const { size, zoom } of SIZES) {
    const img = Math.round(size * zoom);
    const offset = Math.round((img - size) / 2);
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(
      `<!doctype html><style>
         html,body{margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden}
         img{width:${img}px;height:${img}px;margin:-${offset}px 0 0 -${offset}px;display:block}
       </style><img src="data:image/png;base64,${source}">`,
      { waitUntil: 'load' },
    );
    const buffer = await page.screenshot({
      type: 'png',
      omitBackground: false,
    });
    writeFileSync(join(OUT_DIR, `icon-${size}.png`), buffer);
    console.log(`icons/icon-${size}.png`);
  }
} finally {
  await browser.close();
}
