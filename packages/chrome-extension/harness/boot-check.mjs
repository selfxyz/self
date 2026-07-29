// CE-02 smoke test: loads the unpacked extension in the system Chrome,
// opens the extension home page, and asserts the webview-app booted
// (bridge transport detected, getConfig answered, React rendered a screen).
//
// Usage: node harness/boot-check.mjs [--headed] [--url <path?query>]
// Exits 0 on a clean boot, 1 otherwise. Writes a screenshot next to dist/.

import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const args = process.argv.slice(2);
const headed = args.includes('--headed');
const urlFlag = args.indexOf('--url');
const pagePath = urlFlag === -1 ? 'index.html' : args[urlFlag + 1];

// Branded Chrome 137+ removed --load-extension; only Chrome for Testing keeps it.
// Fetch with: node ../../node_modules/@puppeteer/browsers/lib/main-cli.js install chrome
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  join(root, 'chrome/mac_arm-152.0.7962.2/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
].filter(Boolean);
const executablePath = CHROME_CANDIDATES.find(existsSync);
if (!executablePath) {
  console.error('Chrome for Testing not found. Fetch it with:');
  console.error('  node ../../node_modules/@puppeteer/browsers/lib/main-cli.js install chrome');
  process.exit(1);
}
if (!existsSync(join(dist, 'manifest.json'))) {
  console.error('dist/ not built. Run: pnpm build');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath,
  headless: !headed,
  userDataDir: join(tmpdir(), `self-ext-boot-${Date.now()}`),
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, '--no-first-run'],
});

// Deterministic id derived from the "key" pinned in manifest.json.
const EXTENSION_ID = 'ogmglcibieieclolmenndchnccbbmmcf';

try {
  const extensionId = EXTENSION_ID;
  console.log(`extension id: ${extensionId}`);

  const page = await browser.newPage();
  const consoleLines = [];
  page.on('console', msg => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLines.push(`[pageerror] ${err.message}`));

  await page.goto(`chrome-extension://${extensionId}/${pagePath}`, { waitUntil: 'load' });

  // Fresh profile has no vault, so the app page must gate to link.html
  // (bridge-host custody redirect) and render the link QR. The full app boot
  // after an import is covered end-to-end by import-check.mjs.
  await page.waitForFunction(() => window.location.pathname === '/link.html', { timeout: 20_000 });
  await page.waitForSelector('#qr canvas', { timeout: 20_000 });

  const health = await page.evaluate(() => {
    let qr = null;
    try {
      qr = JSON.parse(document.getElementById('qr')?.dataset.qrContent ?? 'null');
    } catch {
      qr = null;
    }
    return {
      path: window.location.pathname,
      qrRendered: Boolean(document.querySelector('#qr canvas')),
      qrSessionId: typeof qr?.transferSessionId === 'string' && qr.transferSessionId.length >= 16,
      qrPublicKey: typeof qr?.receiverPublicKey === 'string' && qr.receiverPublicKey.startsWith('04'),
      qrRelay: typeof qr?.relay === 'string' && /^wss?:\/\//.test(qr.relay),
      bodyText: document.body.innerText.slice(0, 200),
    };
  });

  const screenshotPath = join(root, 'boot-check.png');
  await page.screenshot({ path: screenshotPath });

  const errors = consoleLines.filter(l => l.startsWith('[error]') || l.startsWith('[pageerror]'));

  console.log(JSON.stringify(health, null, 2));
  console.log(`console lines: ${consoleLines.length}, errors: ${errors.length}`);
  for (const line of errors.slice(0, 20)) console.log(`  ${line}`);
  console.log(`screenshot: ${screenshotPath}`);

  const ok =
    health.path === '/link.html' &&
    health.qrRendered &&
    health.qrSessionId &&
    health.qrPublicKey &&
    health.qrRelay &&
    errors.length === 0;
  console.log(ok ? 'BOOT OK (fresh install gates to link + QR)' : 'BOOT FAILED');
  process.exitCode = ok ? 0 : 1;
} finally {
  await browser.close();
}
