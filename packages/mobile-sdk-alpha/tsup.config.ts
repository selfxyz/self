// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      browser: 'src/browser.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    splitting: false,
    clean: true,
    outDir: 'dist/esm',
    tsconfig: './tsconfig.json',
    target: 'es2020',
    // preserve license header in output bundles
    esbuildOptions: options => {
      // keep comments with SPDX in the final file
      options.legalComments = 'eof';
    },
    banner: {
      js: `// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11`,
    },
  },
  {
    entry: {
      index: 'src/index.ts',
      browser: 'src/browser.ts',
    },
    format: ['cjs'],
    dts: false,
    sourcemap: true,
    splitting: false,
    clean: false,
    outDir: 'dist/cjs',
    tsconfig: './tsconfig.cjs.json',
    target: 'es2020',
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
    // preserve license header in output bundles
    esbuildOptions: options => {
      // keep comments with SPDX in the final file
      options.legalComments = 'eof';
    },
    banner: {
      js: `// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11`,
    },
  },
]);
