// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function copyAssets() {
  const sourceDir = join(rootDir, 'svgs');
  const targetSvgDir = join(rootDir, 'dist/svgs');

  if (!existsSync(sourceDir)) {
    console.log('No svgs directory found, skipping asset copy');
    return;
  }

  // Create target directory if it doesn't exist
  mkdirSync(targetSvgDir, { recursive: true });

  // Copy SVGs to single shared location in dist
  try {
    cpSync(sourceDir, targetSvgDir, { recursive: true });
    console.log('✅ SVG assets copied to dist/svgs');
  } catch (error) {
    console.error('❌ Failed to copy SVG assets:', error.message);
    process.exit(1);
  }
}

copyAssets();