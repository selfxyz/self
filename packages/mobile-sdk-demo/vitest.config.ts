// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**'],
    // Skip checking node_modules for faster testing
    server: {
      deps: {
        inline: ['react-native', '@react-native'],
      },
    },
  },
  esbuild: {
    target: 'node18',
  },
  build: {
    target: 'node18',
  },
  resolve: {
    alias: [
      {
        find: 'react-native',
        replacement: resolve(__dirname, './tests/mocks/react-native.ts'),
      },
    ],
  },
});
