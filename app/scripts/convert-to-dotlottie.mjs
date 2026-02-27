#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Convert large Lottie JSON animations to compressed dotLottie format.
// Usage: node scripts/convert-to-dotlottie.mjs
//
// Web compatibility: @lottiefiles/dotlottie-react-native supports .lottie
// natively, but lottie-web does NOT. If these animations are ever used on
// the web, use
// @lottiefiles/dotlottie-web (or its React/Vue wrappers) instead of lottie-web.

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { DotLottie } from '@dotlottie/dotlottie-js';

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error(
    'Usage: node convert-to-dotlottie.mjs <file1.json> [file2.json ...]',
  );
  process.exit(1);
}

for (const file of files) {
  const jsonData = readFileSync(file, 'utf-8');
  const animName = basename(file, '.json');
  const dir = dirname(file);
  const outFile = join(dir, `${animName}.lottie`);

  const dotlottie = new DotLottie();
  dotlottie.addAnimation({
    id: animName,
    data: JSON.parse(jsonData),
  });

  const buffer = await dotlottie.build();
  writeFileSync(outFile, Buffer.from(await buffer.toArrayBuffer()));

  const jsonSize = statSync(file).size;
  const lottieSize = statSync(outFile).size;
  const pct = ((1 - lottieSize / jsonSize) * 100).toFixed(1);
  console.log(
    `${basename(file)} → ${basename(outFile)}: ${(jsonSize / 1024).toFixed(0)}KB → ${(lottieSize / 1024).toFixed(0)}KB (${pct}% smaller)`,
  );
}
