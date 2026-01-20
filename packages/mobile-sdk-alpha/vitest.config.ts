// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**'],
  },
  resolve: {
    conditions: ['browser', 'import', 'module', 'default'],
    alias: [
      {
        find: /^@selfxyz\/common$/,
        replacement: path.resolve(__dirname, '../../common/index.ts'),
      },
      {
        find: /^@selfxyz\/common\/(.*)$/,
        replacement: path.resolve(__dirname, '../../common/src/$1'),
      },
      {
        find: /^ws$/,
        replacement: path.resolve(__dirname, './tests/shims/ws.ts'),
      },
    ],
  },
  server: {
    deps: {
      inline: ['blakejs', '@zk-kit/eddsa-poseidon', 'ethers', 'ws'],
    },
  },
});
