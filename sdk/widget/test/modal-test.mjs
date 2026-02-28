import { chromium } from 'playwright';
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

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForTimeout(500);

  // Test 1: Open modal via SelfVerify.open()
  const modalResult = await page.evaluate(() => {
    return new Promise(resolve => {
      const promise = SelfVerify.SelfVerify.open({
        appName: 'Modal Test',
        appScope: 'modal-test',
        appEndpoint: 'https://example.com/api/verify',
        preset: 'human',
      });

      setTimeout(() => {
        const backdrop = document.querySelector('div[style*="position: fixed"]');
        const closeBtn = backdrop ? backdrop.querySelector('button[aria-label="Close verification"]') : null;
        const widget = backdrop ? backdrop.querySelector('self-verify') : null;

        const result = {
          hasBackdrop: backdrop !== null,
          hasWidget: widget !== null,
          hasShadow: widget ? widget.shadowRoot !== null : false,
          hasCloseBtn: closeBtn !== null,
          widgetPreset: widget ? widget.getAttribute('preset') : null,
          widgetAppName: widget ? widget.getAttribute('app-name') : null,
        };

        // Close by pressing Escape
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        setTimeout(() => {
          result.backdropRemovedOnEscape = document.querySelector('div[style*="position: fixed"]') === null;
          resolve(result);
        }, 300);
      }, 1000);

      promise.catch(() => {}); // Expected rejection from Escape
    });
  });

  console.log('Modal test results:', modalResult);
  assert.ok(modalResult.hasBackdrop, 'Modal backdrop should render');
  console.log('PASS: Modal backdrop renders');
  assert.ok(modalResult.hasWidget, 'Modal should contain self-verify element');
  console.log('PASS: Modal contains self-verify widget');
  assert.ok(modalResult.hasShadow, 'Widget in modal should have Shadow DOM');
  console.log('PASS: Widget has Shadow DOM');
  assert.ok(modalResult.hasCloseBtn, 'Modal should have close button');
  console.log('PASS: Close button present');
  assert.equal(modalResult.widgetPreset, 'human', 'Widget should have human preset');
  console.log('PASS: Preset passed to modal widget');
  assert.equal(modalResult.widgetAppName, 'Modal Test', 'Widget should have correct app name');
  console.log('PASS: App name passed to modal widget');
  assert.ok(modalResult.backdropRemovedOnEscape, 'Escape should close modal');
  console.log('PASS: Escape key closes modal');

  // Test 2: Close button works
  const closeBtnResult = await page.evaluate(() => {
    return new Promise(resolve => {
      const promise = SelfVerify.SelfVerify.open({
        appName: 'Close Test',
        appScope: 'close-test',
        appEndpoint: 'https://example.com/api/verify',
        preset: 'age-21',
      });

      setTimeout(() => {
        const backdrop = document.querySelector('div[style*="position: fixed"]');
        const closeBtn = backdrop ? backdrop.querySelector('button[aria-label="Close verification"]') : null;
        if (closeBtn) closeBtn.click();

        setTimeout(() => {
          resolve(document.querySelector('div[style*="position: fixed"]') === null);
        }, 300);
      }, 500);

      promise.catch(() => {});
    });
  });
  assert.ok(closeBtnResult, 'Close button should remove modal');
  console.log('PASS: Close button removes modal');

  // Test 3: Backdrop click closes modal
  const backdropClickResult = await page.evaluate(() => {
    return new Promise(resolve => {
      const promise = SelfVerify.SelfVerify.open({
        appName: 'Backdrop Test',
        appScope: 'backdrop-test',
        appEndpoint: 'https://example.com/api/verify',
        preset: 'human',
      });

      setTimeout(() => {
        const backdrop = document.querySelector('div[style*="position: fixed"]');
        if (backdrop) {
          // Click backdrop (not the modal content)
          backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }

        setTimeout(() => {
          resolve(document.querySelector('div[style*="position: fixed"]') === null);
        }, 300);
      }, 500);

      promise.catch(() => {});
    });
  });
  assert.ok(backdropClickResult, 'Backdrop click should close modal');
  console.log('PASS: Backdrop click closes modal');

  console.log('');
  console.log('=== ALL MODAL TESTS PASSED ===');
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  server.close();
}
