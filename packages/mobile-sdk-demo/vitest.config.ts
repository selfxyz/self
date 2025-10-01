// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**'],
    // Skip checking node_modules for faster testing
    server: {
      deps: {
        inline: ['react-native', '@react-native'],
      },
    },
  },
  resolve: {
    alias: {
      '@selfxyz/common': resolve(repoRoot, 'common/dist/cjs/index.cjs'),
      '@selfxyz/mobile-sdk-alpha': resolve(repoRoot, 'packages/mobile-sdk-alpha/src/index.ts'),
    },
  },
});
