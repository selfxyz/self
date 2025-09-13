// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { defineConfig } from 'tsup';

const banner = `// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11`;

const entry = {
  index: 'src/index.ts',
  browser: 'src/browser.ts',
  'constants/analytics': 'src/constants/analytics.ts',
  stores: 'src/stores/index.ts',
};

export default defineConfig([
  {
    entry,
    format: ['esm'],
    dts: true,
    sourcemap: true,
    splitting: false,
    clean: true,
    outDir: 'dist/esm',
    tsconfig: './tsconfig.json',
    target: 'es2020',
    external: ['react', 'react-native', '@selfxyz/common'],
    esbuildOptions(options) {
      options.supported = {
        ...options.supported,
        'import-assertions': true,
        'import-attributes': true,
      };
      // Handle React Native's import typeof syntax
      options.loader = {
        ...options.loader,
        '.js': 'jsx',
      };
      // keep comments with SPDX in the final file
      options.legalComments = 'eof';
    },
    banner: {
      js: banner,
    },
  },
  {
    entry,
    format: ['cjs'],
    dts: false,
    sourcemap: true,
    splitting: false,
    clean: false,
    outDir: 'dist/cjs',
    tsconfig: './tsconfig.cjs.json',
    target: 'es2020',
    external: ['react', 'react-native', '@selfxyz/common'],
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
    esbuildOptions(options) {
      options.supported = {
        ...options.supported,
        'import-assertions': true,
        'import-attributes': true,
      };
      // Handle React Native's import typeof syntax
      options.loader = {
        ...options.loader,
        '.js': 'jsx',
      };
    },
  },
]);
