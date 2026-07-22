// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { defineConfig } from 'tsup';

const banner = `// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11`;

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  // `clean` intentionally disabled: under the parallel workspace typecheck
  // (turbo), a redundant rebuild can re-run while rn-sdk-test-app#types is
  // reading dist/. `clean` deletes dist/index.d.ts first, so tsc briefly sees
  // dist/index.js with no declarations and falls back to it via allowJs — the
  // consumer then fails with phantom "no exported member" / all-`any` props.
  // tsup overwrites the single `index` entry in place, so stale outputs are a
  // non-issue and dropping clean keeps the .d.ts present throughout a rebuild.
  clean: false,
  outDir: 'dist',
  target: 'es2020',
  external: [
    'react',
    'react-native',
    /^react-native\/.*/,
    'react-native-webview',
    'react-native-nfc-manager',
    'react-native-biometrics',
    'react-native-keychain',
    '@selfxyz/webview-bridge',
  ],
  banner: {
    js: banner,
  },
});
