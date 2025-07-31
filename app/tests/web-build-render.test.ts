// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/**
 * @jest-environment node
 */

import { execSync, spawn } from 'child_process';
import { chromium, Page } from 'playwright';
import { beforeAll, afterAll, describe, expect, test } from '@jest/globals';

// Increase default timeouts for build and page load
const BUILD_TIMEOUT = 120_000;
const PAGE_LOAD_TIMEOUT = 10_000;
const PREVIEW_URL = 'http://localhost:4173';

describe('Web Build and Render', () => {
  let previewProcess: ReturnType<typeof spawn> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let page: Page | undefined;

  beforeAll(async () => {
    // Build the web app
    execSync('yarn web:build', { stdio: 'inherit', timeout: BUILD_TIMEOUT, cwd: process.cwd() });

    // Start preview server
    previewProcess = spawn('yarn', ['web:preview', '--port', '4173', '--host'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Preview server failed to start')), 10_000);
      previewProcess!.stdout.on('data', (data: Buffer) => {
        if (data.toString().includes('Local:')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      previewProcess!.stderr.on('data', (data: Buffer) => {
        console.error('Preview server error:', data.toString());
      });
    });

    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  }, BUILD_TIMEOUT + 20_000);

  afterAll(async () => {
    if (page) await page.close();
    if (browser) await browser.close();
    if (previewProcess) previewProcess.kill();
  });

  test(
    'web app builds and renders without JavaScript errors',
    async () => {
      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];
      const pageErrors: string[] = [];

      page!.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        } else if (msg.type() === 'warning') {
          consoleWarnings.push(msg.text());
        }
      });

      page!.on('pageerror', (err) => pageErrors.push(err.message));

      await page!.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: PAGE_LOAD_TIMEOUT });
      await page!.waitForSelector('#root', { timeout: 5_000 });

      const rootContent = await page!.locator('#root').innerHTML();
      expect(rootContent.trim()).not.toBe('');

      const renderedCount = await page!.locator('#root > div').count();
      expect(renderedCount).toBeGreaterThan(0);

      await page!.waitForTimeout(2_000);

      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes('favicon.ico') && !e.includes('DevTools'),
      );

      if (consoleWarnings.length) {
        console.warn('Console warnings:', consoleWarnings);
      }

      expect(pageErrors).toEqual([]);
      expect(criticalErrors).toEqual([]);
    },
    PAGE_LOAD_TIMEOUT + 10_000,
  );
});
