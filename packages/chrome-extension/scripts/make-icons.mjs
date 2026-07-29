// Rasterizes the Self mark into the PNG sizes the Chrome Web Store and the
// browser toolbar require (16/32/48/128). Run when the brand asset changes:
//   node scripts/make-icons.mjs
// Output lands in icons/ and is committed: the store cannot accept a build
// without them, so they are distribution artifacts rather than build noise.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(root, '../webview-app/public/logos/self.svg');
const OUT_DIR = join(root, 'icons');
// Small icons get less padding: at 16px the toolbar has no room to spare, while
// the 128px store icon wants the breathing room the icon guidelines expect.
const SIZES = [
  { size: 16, artRatio: 0.92 },
  { size: 32, artRatio: 0.86 },
  { size: 48, artRatio: 0.8 },
  { size: 128, artRatio: 0.75 },
];
// The store renders icons on light and dark chrome, so the mark sits on an
// opaque brand ground rather than transparent, with the padding the store's
// icon guidelines expect (art at ~75% of the canvas).
const BACKGROUND = '#0B0B0B';

const svg = readFileSync(SOURCE, 'utf8');
mkdirSync(OUT_DIR, { recursive: true });

// Reuse the pinned Chrome for Testing the harnesses already fetch, so this
// script does not depend on puppeteer's own cache being populated.
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
  for (const { size, artRatio } of SIZES) {
    const art = Math.round(size * artRatio);
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(
      `<!doctype html><style>
         html,body{margin:0;padding:0;width:${size}px;height:${size}px;background:${BACKGROUND};
           display:flex;align-items:center;justify-content:center;overflow:hidden}
         svg{width:${art}px;height:${art}px;display:block}
         path{fill:#FFFFFF}
       </style>${svg}`,
      { waitUntil: 'load' },
    );
    const buffer = await page.screenshot({ type: 'png', omitBackground: false });
    writeFileSync(join(OUT_DIR, `icon-${size}.png`), buffer);
    console.log(`icons/icon-${size}.png`);
  }
} finally {
  await browser.close();
}
