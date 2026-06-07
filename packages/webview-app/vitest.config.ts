// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { defineConfig } from 'vitest/config';

import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // ESLint custom-rule unit tests live under eslint-rules/ and are run
    // with `node eslint-rules/handler-names.test.js`. They use ESLint's
    // RuleTester which assumes mocha/jest-style globals and is not
    // vitest-compatible.
    exclude: ['node_modules', 'dist', 'eslint-rules/**'],
  },
});
