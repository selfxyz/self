// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * @jest-environment node
 */

import { execSync, spawn } from 'child_process';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';

// Ensure fetch is available (Node.js 18+ has built-in fetch)
if (typeof fetch === 'undefined') {
  throw new Error(
    'fetch is not available. This test requires Node.js 18+ with built-in fetch support.',
  );
}

// Increase default timeouts for build and page load
const BUILD_TIMEOUT = 120_000;
const PAGE_LOAD_TIMEOUT = 10_000;
const PREVIEW_URL = 'http://localhost:4173';

describe('Web Build and Render', () => {
  let previewProcess: ReturnType<typeof spawn> | undefined;

  beforeAll(async () => {
    // Build the web app
    execSync('yarn web:build', {
      stdio: 'inherit',
      timeout: BUILD_TIMEOUT,
      cwd: process.cwd(),
    });

    // Start preview server
    previewProcess = spawn(
      'yarn',
      ['web:preview', '--port', '4173', '--host'],
      {
        cwd: process.cwd(),
        stdio: 'pipe',
      },
    );

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Preview server failed to start')),
        15_000, // Increased timeout to account for Tamagui build time
      );

      let serverOutput = '';

      if (previewProcess?.stdout) {
        previewProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          serverOutput += output;

          // Suppress noisy output in tests
          if (process.env.DEBUG_BUILD_TEST) {
            console.log('Preview server stdout:', JSON.stringify(output));
          }

          // Look for the Local: indicator that the server is ready
          // Be more flexible with pattern matching
          const isReady =
            output.includes('Local:') ||
            output.includes('localhost:4173') ||
            /Local:\s*http:\/\/localhost:4173/i.test(output) ||
            /➜\s*Local:/i.test(output) ||
            (output.includes('4173') && output.includes('Local'));

          if (isReady) {
            if (process.env.DEBUG_BUILD_TEST) {
              console.log('Server ready detected!');
            }
            clearTimeout(timeout);
            resolve();
          }
        });
      }

      if (previewProcess?.stderr) {
        previewProcess.stderr.on('data', (data: Buffer) => {
          const error = data.toString();

          console.error('Preview server stderr:', error);
          serverOutput += error;
        });
      }

      previewProcess?.on('error', error => {
        clearTimeout(timeout);
        reject(new Error(`Preview server process error: ${error.message}`));
      });

      previewProcess?.on('exit', (code, _signal) => {
        if (code !== null && code !== 0) {
          clearTimeout(timeout);
          reject(
            new Error(
              `Preview server exited with code ${code}. Output: ${serverOutput}`,
            ),
          );
        }
      });
    });

    // Give the server a moment to fully start
    await new Promise(resolve => setTimeout(resolve, 3000));
  }, BUILD_TIMEOUT + 10_000);

  afterAll(async () => {
    if (previewProcess) {
      try {
        previewProcess.kill('SIGTERM');
        // Give it a moment to terminate gracefully
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!previewProcess.killed) {
          previewProcess.kill('SIGKILL');
        }
      } catch (error) {
        console.error('Error killing preview process:', error);
      }
    }
  });

  test(
    'web app builds and server responds with valid HTML',
    async () => {
      // Test that the server responds with a 200 status
      const response = await fetch(PREVIEW_URL);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');

      // Test that the response contains basic HTML structure
      const html = await response.text();
      expect(html.toLowerCase()).toContain('<!doctype html>');
      expect(html).toContain('<html');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('<div id="root">');

      // Test that essential assets are referenced
      expect(html).toContain('.js');
      expect(html).toContain('.css');

      // Verify the HTML is not empty or minimal
      expect(html.length).toBeGreaterThan(500);

      // Test that the title is present
      expect(html).toContain('<title>');
      expect(html).toContain('Self App');
    },
    PAGE_LOAD_TIMEOUT,
  );
});
