// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { defineConfig } from 'vitest/config';

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
      '@selfxyz/common': '/Volumes/files/Projects/selfxyz/selfapp/common/dist/cjs/index.cjs',
      '@selfxyz/mobile-sdk-alpha': '/Volumes/files/Projects/selfxyz/selfapp/packages/mobile-sdk-alpha/src/index.ts',
    },
  },
});
