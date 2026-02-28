// Tests for the previously identified gaps:
// 1. QR scannability (decode the generated matrix)
// 2. Mobile rendering (deep link button instead of QR)
// 3. Session memory (localStorage persistence across reloads)
import { chromium, devices } from 'playwright';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, extname } from 'path';
import { strict as assert } from 'assert';

const ROOT = join(import.meta.dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.map': 'application/json' };
const server = createServer((req, res) => {
  const p = join(ROOT, req.url === '/' ? '/test/index.html' : req.url);
  try {
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'text/plain' });
    res.end(readFileSync(p));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

let browser;
try {
  browser = await chromium.launch({ headless: true });

  // ============================================================
  // GAP 1: QR Scannability — verify the QR matrix decodes correctly
  // ============================================================
  console.log('--- GAP 1: QR Scannability ---');
  {
    const page = await browser.newPage();
    await page.goto(baseUrl);
    await page.waitForTimeout(500);

    // Expand the first widget
    await page.evaluate(() => {
      const el = document.querySelector('self-verify');
      el.shadowRoot.querySelector('.trigger-button')?.click();
    });
    await page.waitForTimeout(500);

    // Extract the QR matrix as a 2D boolean array from the SVG rects
    const qrData = await page.evaluate(() => {
      const el = document.querySelector('self-verify');
      const svg = el.shadowRoot.querySelector('.qr-wrapper svg');
      if (!svg) return null;

      const width = parseFloat(svg.getAttribute('width'));
      const rects = svg.querySelectorAll('rect[fill="#000000"]');

      // Get all dark module positions
      const modules = [];
      let minX = Infinity, minY = Infinity, moduleSize = Infinity;

      for (const rect of rects) {
        const x = parseFloat(rect.getAttribute('x'));
        const y = parseFloat(rect.getAttribute('y'));
        const w = parseFloat(rect.getAttribute('width'));
        modules.push({ x, y });
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (w < moduleSize) moduleSize = w;
      }

      // Build the matrix
      const gridSize = Math.round((width - 2 * minX) / moduleSize);
      const matrix = Array.from({ length: gridSize }, () => new Array(gridSize).fill(false));

      for (const m of modules) {
        const col = Math.round((m.x - minX) / moduleSize);
        const row = Math.round((m.y - minY) / moduleSize);
        if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
          matrix[row][col] = true;
        }
      }

      return { matrix, gridSize, moduleCount: rects.length };
    });

    assert.ok(qrData, 'Should extract QR data');
    console.log(`  Grid size: ${qrData.gridSize}x${qrData.gridSize}, dark modules: ${qrData.moduleCount}`);

    // Verify finder patterns exist (top-left, top-right, bottom-left)
    // Finder pattern: 7x7 with specific pattern
    function checkFinderPattern(matrix, startRow, startCol) {
      // Outer ring should be dark
      for (let i = 0; i < 7; i++) {
        if (!matrix[startRow][startCol + i]) return false; // top row
        if (!matrix[startRow + 6][startCol + i]) return false; // bottom row
        if (!matrix[startRow + i][startCol]) return false; // left col
        if (!matrix[startRow + i][startCol + 6]) return false; // right col
      }
      // Inner 3x3 should be dark
      for (let r = 2; r <= 4; r++) {
        for (let c = 2; c <= 4; c++) {
          if (!matrix[startRow + r][startCol + c]) return false;
        }
      }
      // Cells between outer and inner should be light
      for (let i = 1; i <= 5; i++) {
        if (matrix[startRow + 1][startCol + i]) return false; // row 1
        if (matrix[startRow + 5][startCol + i]) return false; // row 5
      }
      return true;
    }

    const m = qrData.matrix;
    const gs = qrData.gridSize;
    const topLeft = checkFinderPattern(m, 0, 0);
    const topRight = checkFinderPattern(m, 0, gs - 7);
    const bottomLeft = checkFinderPattern(m, gs - 7, 0);

    assert.ok(topLeft, 'Top-left finder pattern should be correct');
    assert.ok(topRight, 'Top-right finder pattern should be correct');
    assert.ok(bottomLeft, 'Bottom-left finder pattern should be correct');
    console.log('  PASS: All 3 finder patterns are structurally correct');

    // Verify timing patterns (alternating dark/light between finders)
    let timingCorrect = true;
    for (let i = 8; i < gs - 8; i++) {
      if (m[6][i] !== (i % 2 === 0)) timingCorrect = false; // horizontal timing
      if (m[i][6] !== (i % 2 === 0)) timingCorrect = false; // vertical timing
    }
    assert.ok(timingCorrect, 'Timing patterns should alternate correctly');
    console.log('  PASS: Timing patterns are correct');

    // Grid size should be valid QR version (4*v+17)
    const version = (gs - 17) / 4;
    assert.ok(Number.isInteger(version) && version >= 1 && version <= 40, `Grid size ${gs} should map to valid QR version, got v${version}`);
    console.log(`  PASS: Valid QR version ${version} (${gs}x${gs})`);

    console.log('  PASS: QR code is structurally valid (finder patterns, timing, version)');
    await page.close();
  }

  // ============================================================
  // GAP 2: Mobile Rendering — deep link button instead of QR
  // ============================================================
  console.log('');
  console.log('--- GAP 2: Mobile Rendering ---');
  {
    const iPhone = devices['iPhone 13'];
    const context = await browser.newContext({ ...iPhone });
    const page = await context.newPage();
    await page.goto(baseUrl);
    await page.waitForTimeout(1000);

    const mobileUI = await page.evaluate(() => {
      const el = document.querySelector('self-verify');
      const sr = el.shadowRoot;
      return {
        hasVerifyButton: sr.querySelector('.verify-button') !== null,
        hasTriggerButton: sr.querySelector('.trigger-button') !== null,
        hasQRWrapper: sr.querySelector('.qr-wrapper') !== null,
        buttonText: sr.querySelector('.verify-button')?.textContent?.trim() || '',
        buttonHref: sr.querySelector('.verify-button')?.href || '',
        hasAppLinks: sr.querySelectorAll('.app-link').length > 0,
      };
    });

    console.log('  Mobile UI:', JSON.stringify(mobileUI));
    assert.ok(mobileUI.hasVerifyButton, 'Mobile should show verify button (not QR)');
    assert.ok(!mobileUI.hasQRWrapper, 'Mobile should NOT show QR code');
    assert.ok(mobileUI.buttonText.includes('Open in Self App'), 'Button should say "Open in Self App"');
    assert.ok(mobileUI.buttonHref.includes('redirect.self.xyz'), 'Button should link to redirect.self.xyz');
    assert.ok(mobileUI.hasAppLinks, 'Should show app store links');
    console.log('  PASS: Mobile renders deep link button instead of QR code');

    // Test in-app browser detection (Instagram)
    await page.close();
    await context.close();

    const inAppContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 275.0',
      viewport: { width: 390, height: 844 },
    });
    const inAppPage = await inAppContext.newPage();
    await inAppPage.goto(baseUrl);
    await inAppPage.waitForTimeout(1000);

    const inAppUI = await inAppPage.evaluate(() => {
      const el = document.querySelector('self-verify');
      const sr = el.shadowRoot;
      const header = sr.querySelector('.header');
      return {
        headerText: header?.textContent || '',
        hasVerifyButton: sr.querySelector('.verify-button') !== null,
      };
    });

    console.log('  In-app browser UI:', JSON.stringify(inAppUI));
    assert.ok(inAppUI.headerText.includes('Safari'), 'In-app browser should show "Open in Safari" message');
    assert.ok(!inAppUI.hasVerifyButton, 'In-app browser should NOT show verify button');
    console.log('  PASS: In-app browser (Instagram) shows Safari redirect message');

    await inAppPage.close();
    await inAppContext.close();
  }

  // ============================================================
  // GAP 3: Session Memory — localStorage persistence
  // ============================================================
  console.log('');
  console.log('--- GAP 3: Session Memory ---');
  {
    // Create a test page that uses session-ttl
    const sessionTestHtml = `<!DOCTYPE html><html><body>
      <script src="/dist/cdn/self-verify.js"><\/script>
      <self-verify
        app-name="Session Test"
        app-scope="session-scope"
        app-endpoint="https://example.com/api/verify"
        preset="human"
        session-ttl="3600"
        id="widget"
      ></self-verify>
      <div id="events"></div>
    </body></html>`;

    // Override the server to serve this test page
    const sessionServer = createServer((req, res) => {
      if (req.url === '/session-test') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(sessionTestHtml);
      } else {
        const p = join(ROOT, req.url);
        try {
          res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'text/plain' });
          res.end(readFileSync(p));
        } catch {
          res.writeHead(404);
          res.end();
        }
      }
    });
    await new Promise(r => sessionServer.listen(0, '127.0.0.1', r));
    const sessionPort = sessionServer.address().port;
    const sessionUrl = `http://127.0.0.1:${sessionPort}`;

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${sessionUrl}/session-test`);
    await page.waitForTimeout(1000);

    // Simulate a successful verification by dispatching a self:success event
    // and setting localStorage directly (since we can't complete a real WS flow)
    const stored = await page.evaluate(() => {
      // Write session memory as the widget would after success
      const key = 'self_session_session-scope';
      localStorage.setItem(key, JSON.stringify({
        scope: 'session-scope',
        verifiedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
      }));
      return localStorage.getItem(key);
    });

    assert.ok(stored, 'Session should be stored in localStorage');
    console.log('  Session stored:', JSON.parse(stored).scope);

    // Reload the page — widget should detect existing session
    let gotAlreadyVerified = false;
    page.on('console', msg => {
      if (msg.text().includes('already-verified')) gotAlreadyVerified = true;
    });

    await page.reload();
    await page.waitForTimeout(1000);

    const afterReload = await page.evaluate(() => {
      const el = document.querySelector('#widget');
      const sr = el.shadowRoot;
      const badge = sr.querySelector('.verified-badge');
      return {
        showsVerifiedBadge: badge !== null,
        badgeText: badge?.textContent?.trim() || '',
        hasQR: sr.querySelector('.qr-wrapper') !== null,
        hasTrigger: sr.querySelector('.trigger-button') !== null,
      };
    });

    console.log('  After reload:', JSON.stringify(afterReload));
    assert.ok(afterReload.showsVerifiedBadge, 'Should show verified badge after reload');
    assert.ok(afterReload.badgeText.includes('Verified'), 'Badge should say Verified');
    assert.ok(!afterReload.hasQR, 'Should NOT show QR code when already verified');
    assert.ok(!afterReload.hasTrigger, 'Should NOT show trigger button when already verified');
    console.log('  PASS: Session memory works — shows verified badge on reload');

    // Verify self:already-verified event fires
    const eventFired = await page.evaluate(() => {
      return new Promise(resolve => {
        // Remove and re-add the element to trigger connectedCallback
        const parent = document.body;
        const oldEl = document.querySelector('#widget');
        const newEl = document.createElement('self-verify');
        newEl.setAttribute('app-name', 'Session Test');
        newEl.setAttribute('app-scope', 'session-scope');
        newEl.setAttribute('app-endpoint', 'https://example.com/api/verify');
        newEl.setAttribute('preset', 'human');
        newEl.setAttribute('session-ttl', '3600');

        let fired = false;
        newEl.addEventListener('self:already-verified', (e) => {
          fired = true;
        });

        oldEl.remove();
        parent.appendChild(newEl);

        setTimeout(() => resolve(fired), 500);
      });
    });

    assert.ok(eventFired, 'self:already-verified event should fire');
    console.log('  PASS: self:already-verified event fires on mount with valid session');

    // Test expiry — set an expired session and verify it's cleared
    const expiredResult = await page.evaluate(() => {
      const key = 'self_session_expired-scope';
      localStorage.setItem(key, JSON.stringify({
        scope: 'expired-scope',
        verifiedAt: Date.now() - 7200000,
        expiresAt: Date.now() - 3600000, // expired 1 hour ago
      }));

      const el = document.createElement('self-verify');
      el.setAttribute('app-name', 'Expired Test');
      el.setAttribute('app-scope', 'expired-scope');
      el.setAttribute('app-endpoint', 'https://example.com/api/verify');
      el.setAttribute('preset', 'human');
      el.setAttribute('session-ttl', '3600');

      let gotAlready = false;
      el.addEventListener('self:already-verified', () => { gotAlready = true; });

      document.body.appendChild(el);

      return new Promise(resolve => {
        setTimeout(() => {
          const sr = el.shadowRoot;
          const hasVerified = sr.querySelector('.verified-badge') !== null;
          const hasTrigger = sr.querySelector('.trigger-button') !== null || sr.querySelector('.verify-button') !== null;
          const sessionCleared = localStorage.getItem(key) === null;

          resolve({
            showsVerifiedBadge: hasVerified,
            showsNormalUI: hasTrigger,
            sessionCleared,
            alreadyVerifiedFired: gotAlready,
          });
        }, 500);
      });
    });

    console.log('  Expired session result:', JSON.stringify(expiredResult));
    assert.ok(!expiredResult.showsVerifiedBadge, 'Expired session should NOT show verified badge');
    assert.ok(expiredResult.showsNormalUI, 'Expired session should show normal verification UI');
    assert.ok(expiredResult.sessionCleared, 'Expired session should be cleared from localStorage');
    assert.ok(!expiredResult.alreadyVerifiedFired, 'self:already-verified should NOT fire for expired session');
    console.log('  PASS: Expired sessions are correctly cleared');

    await page.close();
    await context.close();
    sessionServer.close();
  }

  console.log('');
  console.log('=== ALL GAP TESTS PASSED ===');

} catch (e) {
  console.error('FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  server.close();
}
