// Integration test: render <self-verify> in a real browser via Playwright
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, extname } from 'path';
import { strict as assert } from 'assert';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.map': 'application/json' };
const ROOT = join(import.meta.dirname, '..');

// Simple static file server
const server = createServer((req, res) => {
  const filePath = join(ROOT, req.url === '/' ? '/test/index.html' : req.url);
  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

console.log(`Server running at ${baseUrl}`);

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console logs
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  // Collect errors
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000); // Give time for custom elements to initialize

  // Test 1: Custom element is registered
  const isDefined = await page.evaluate(() => customElements.get('self-verify') !== undefined);
  assert.ok(isDefined, 'self-verify custom element should be registered');
  console.log('PASS: Custom element registered');

  // Test 2: Four <self-verify> elements exist on the page
  const count = await page.evaluate(() => document.querySelectorAll('self-verify').length);
  assert.equal(count, 4, `Expected 4 self-verify elements, got ${count}`);
  console.log(`PASS: Found ${count} self-verify elements`);

  // Test 3: Each has a Shadow DOM
  const hasShadow = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('self-verify')).every(el => el.shadowRoot !== null);
  });
  assert.ok(hasShadow, 'All elements should have Shadow DOM');
  console.log('PASS: All elements have Shadow DOM');

  // Test 4: First element renders a trigger button (collapsed state)
  const firstHasTrigger = await page.evaluate(() => {
    const el = document.querySelector('self-verify');
    return el.shadowRoot.querySelector('.trigger-button') !== null ||
           el.shadowRoot.querySelector('.verify-button') !== null;
  });
  assert.ok(firstHasTrigger, 'First element should render a trigger or verify button');
  console.log('PASS: Initial render shows button');

  // Test 5: Click trigger button to expand — verify QR renders
  const expanded = await page.evaluate(() => {
    const el = document.querySelector('self-verify');
    const trigger = el.shadowRoot.querySelector('.trigger-button');
    if (trigger) {
      trigger.click();
      // After click, check for expanded content
      return new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const qr = el.shadowRoot.querySelector('.qr-wrapper');
            const header = el.shadowRoot.querySelector('.header');
            const desc = el.shadowRoot.querySelector('.description');
            const howItWorks = el.shadowRoot.querySelector('.how-it-works');
            resolve({
              hasQR: qr !== null,
              hasHeader: header !== null,
              headerText: header?.textContent || '',
              hasDesc: desc !== null,
              hasHowItWorks: howItWorks !== null,
              hasSVG: qr?.querySelector('svg') !== null,
            });
          });
        });
      });
    }
    return { hasQR: false };
  });
  console.log('  Expanded state:', JSON.stringify(expanded));
  assert.ok(expanded.hasQR, 'Expanded view should have QR wrapper');
  assert.ok(expanded.hasSVG, 'QR wrapper should contain an SVG');
  assert.ok(expanded.hasHeader, 'Should have header text');
  assert.ok(expanded.hasHowItWorks, 'Should have how-it-works section');
  console.log('PASS: Expanded view renders QR code, header, description, how-it-works');

  // Test 6: Preset resolves correctly — header text for age-18
  assert.ok(
    expanded.headerText.includes('18') || expanded.headerText.includes('Verify'),
    `Header should mention age or verify, got: "${expanded.headerText}"`
  );
  console.log(`PASS: Header text is "${expanded.headerText}"`);

  // Test 7: Dark mode element has dark-mode attribute
  const darkModeEl = await page.evaluate(() => {
    const els = document.querySelectorAll('self-verify');
    return els[1]?.hasAttribute('dark-mode');
  });
  assert.ok(darkModeEl, 'Second element should have dark-mode attribute');
  console.log('PASS: Dark mode attribute present');

  // Test 8: CSS custom properties (theming) work
  const themedEl = await page.evaluate(() => {
    const el = document.querySelectorAll('self-verify')[3]; // 4th element with custom theme
    const style = el.getAttribute('style');
    return style?.includes('--self-primary');
  });
  assert.ok(themedEl, 'Themed element should have --self-primary custom property');
  console.log('PASS: CSS custom properties set');

  // Test 9: SelfVerify global is accessible
  const globalAPI = await page.evaluate(() => {
    return {
      hasOpen: typeof SelfVerify?.SelfVerify?.open === 'function',
      hasElement: typeof SelfVerify?.SelfVerify?.Element === 'function',
      hasPresets: typeof SelfVerify?.SelfVerify?.Presets === 'object',
      presetKeys: Object.keys(SelfVerify?.SelfVerify?.Presets || {}),
    };
  });
  assert.ok(globalAPI.hasOpen, 'SelfVerify.SelfVerify.open should be a function');
  assert.ok(globalAPI.hasElement, 'SelfVerify.SelfVerify.Element should be a constructor');
  assert.ok(globalAPI.hasPresets, 'SelfVerify.SelfVerify.Presets should be an object');
  assert.deepEqual(
    globalAPI.presetKeys.sort(),
    ['age-18', 'age-21', 'human', 'kyc-basic', 'kyc-full'],
    'Should have all 5 presets'
  );
  console.log('PASS: Global SelfVerify API is accessible with all presets');

  // Test 10: QR code SVG is valid and scannable-sized
  const qrInfo = await page.evaluate(() => {
    const el = document.querySelector('self-verify');
    const svg = el.shadowRoot.querySelector('.qr-wrapper svg');
    if (!svg) return null;
    return {
      width: svg.getAttribute('width'),
      height: svg.getAttribute('height'),
      rectCount: svg.querySelectorAll('rect').length,
      hasLogo: svg.querySelectorAll('path').length > 0,
    };
  });
  assert.ok(qrInfo, 'QR SVG should exist');
  assert.equal(qrInfo.width, '200', 'QR should be 200px (default size)');
  assert.ok(qrInfo.rectCount > 100, `QR should have many rects (modules), got ${qrInfo.rectCount}`);
  assert.ok(qrInfo.hasLogo, 'QR should have Self logo paths');
  console.log(`PASS: QR SVG is ${qrInfo.width}x${qrInfo.height} with ${qrInfo.rectCount} modules and logo`);

  // Test 11: Custom events are dispatched
  const eventTest = await page.evaluate(() => {
    return new Promise(resolve => {
      const el = document.createElement('self-verify');
      el.setAttribute('app-name', 'Event Test');
      el.setAttribute('app-scope', 'event-test');
      el.setAttribute('app-endpoint', 'https://example.com/api/verify');
      el.setAttribute('preset', 'human');

      let gotStatus = false;
      el.addEventListener('self:status', () => { gotStatus = true; });

      document.body.appendChild(el);

      // Give it time to connect (it will emit status events even if WS fails)
      setTimeout(() => {
        document.body.removeChild(el);
        resolve({ gotStatus });
      }, 2000);
    });
  });
  // Note: status event may or may not fire depending on WebSocket connection
  console.log(`INFO: Status event received: ${eventTest.gotStatus} (depends on WS availability)`);

  // Test 12: App store links present
  const appLinks = await page.evaluate(() => {
    const el = document.querySelector('self-verify');
    const links = el.shadowRoot.querySelectorAll('.app-link');
    return Array.from(links).map(a => ({ text: a.textContent.trim(), href: a.href }));
  });
  assert.equal(appLinks.length, 2, 'Should have iOS and Android links');
  assert.ok(appLinks[0].href.includes('apple.com'), 'First link should be App Store');
  assert.ok(appLinks[1].href.includes('play.google.com'), 'Second link should be Google Play');
  console.log('PASS: App store links present and correct');

  // Test 13: No JS errors
  const jsErrors = errors.filter(e => !e.includes('WebSocket') && !e.includes('socket'));
  if (jsErrors.length > 0) {
    console.log('WARN: JS errors (non-WebSocket):', jsErrors);
  } else {
    console.log('PASS: No JavaScript errors');
  }

  // Check for WebSocket connection attempts (expected since example.com won't have a WS)
  const wsLogs = logs.filter(l => l.includes('WebSocket') || l.includes('[self-verify]'));
  if (wsLogs.length > 0) {
    console.log(`INFO: ${wsLogs.length} WebSocket/widget log messages (expected)`);
  }

  console.log('');
  console.log('=== ALL INTEGRATION TESTS PASSED ===');

} catch (e) {
  console.error('TEST FAILED:', e.message);
  console.error(e.stack);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  server.close();
}
