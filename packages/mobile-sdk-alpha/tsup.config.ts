// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import * as fs from 'node:fs';
import * as path from 'node:path';

import { defineConfig } from 'tsup';

const banner = `// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11`;

// Dynamically find all flow files
function findFlowFiles(dir: string, basePath = ''): Record<string, string> {
  const entries: Record<string, string> = {};

  if (!fs.existsSync(dir)) return entries;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const itemPath = path.join(dir, item.name);
    const relativePath = basePath ? path.join(basePath, item.name) : item.name;

    if (item.isDirectory()) {
      Object.assign(entries, findFlowFiles(itemPath, relativePath));
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
      const key = path.join('flows', relativePath).replace(/\.tsx?$/, '');
      entries[key] = path.join('src', 'flows', relativePath);
    }
  }

  return entries;
}

const flowEntries = findFlowFiles('src/flows');

const entry = {
  index: 'src/index.ts',
  browser: 'src/browser.ts',
  'constants/analytics': 'src/constants/analytics.ts',
  'constants/colors': 'src/constants/colors.ts',
  'components/index': 'src/components/index.ts',
  stores: 'src/stores/index.ts',
  ...flowEntries,
};

export default defineConfig([
  {
    entry,
    format: ['esm'],
    dts: true,
    sourcemap: true,
    splitting: true,
    clean: true,
    outDir: 'dist/esm',
    tsconfig: './tsconfig.json',
    target: 'es2020',
    external: [
      'react',
      'react-native',
      '@selfxyz/common',
      // Common crypto dependencies (already in main app)
      'elliptic',
      'js-sha256',
      'js-sha1',
      'js-sha512',
      'node-forge',
      'ethers',
      // React Native dependencies
      '@react-native-async-storage/async-storage',
      'react-native-keychain',
      'react-native-sqlite-storage',
      // State management (xstate included in bundle)
      // SVG files should be handled by React Native's SVG transformer
      /\.svg$/,
    ],
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
    splitting: true,
    clean: false,
    outDir: 'dist/cjs',
    onSuccess: 'node ./scripts/copy-assets.mjs',
    tsconfig: './tsconfig.cjs.json',
    target: 'es2020',
    external: [
      'react',
      'react-native',
      '@selfxyz/common',
      // Common crypto dependencies (already in main app)
      'elliptic',
      'js-sha256',
      'js-sha1',
      'js-sha512',
      'node-forge',
      'ethers',
      // React Native dependencies
      '@react-native-async-storage/async-storage',
      'react-native-keychain',
      'react-native-sqlite-storage',
      // State management (xstate included in bundle)
      // SVG files should be handled by React Native's SVG transformer
      /\.svg$/,
    ],
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
