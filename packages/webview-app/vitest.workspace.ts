// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { defineWorkspace } from 'vitest/config';

// Two projects so the flow tests can inline @selfxyz/common (which imports the
// CommonJS `blakejs` via named exports) for CJS↔ESM interop WITHOUT changing
// module resolution for the existing isolated screen/unit tests — inlining it
// globally rebuilds shared singletons and breaks provider-mocking tests.
export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      exclude: ['node_modules', 'dist', 'eslint-rules/**', 'tests/flows/**'],
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'flows',
      include: ['tests/flows/**/*.test.{ts,tsx}'],
      server: {
        deps: {
          inline: ['blakejs', '@zk-kit/eddsa-poseidon', '@selfxyz/common'],
        },
      },
    },
  },
]);
