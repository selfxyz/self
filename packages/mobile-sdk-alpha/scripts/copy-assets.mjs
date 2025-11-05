#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function copyAssets() {
  // Copy SVGs
  const sourceSvgDir = join(rootDir, 'svgs');
  const targetSvgDir = join(rootDir, 'dist/svgs');

  if (existsSync(sourceSvgDir)) {
    // Create target directory if it doesn't exist
    mkdirSync(targetSvgDir, { recursive: true });

    // Copy SVGs to single shared location in dist
    try {
      cpSync(sourceSvgDir, targetSvgDir, { recursive: true });
      console.log('✅ SVG assets copied to dist/svgs');
    } catch (error) {
      console.error('❌ Failed to copy SVG assets:', error.message);
      process.exit(1);
    }
  } else {
    console.log('No svgs directory found, skipping SVG copy');
  }

  // Copy animations
  const sourceAnimationsDir = join(rootDir, 'src/animations');
  const targetAnimationsDir = join(rootDir, 'dist/animations');

  if (existsSync(sourceAnimationsDir)) {
    // Create target directory if it doesn't exist
    mkdirSync(targetAnimationsDir, { recursive: true });

    // Copy animation JSONs to single shared location in dist
    try {
      cpSync(sourceAnimationsDir, targetAnimationsDir, { recursive: true });
      console.log('✅ Animation assets copied to dist/animations');
    } catch (error) {
      console.error('❌ Failed to copy animation assets:', error.message);
      process.exit(1);
    }
  } else {
    console.log('No src/animations directory found, skipping animation copy');
  }
}

copyAssets();
