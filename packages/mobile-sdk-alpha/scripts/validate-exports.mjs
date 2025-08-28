// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Dev-only script to ensure named exports only and ESM shape (ok to use Node here)
import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const files = await readdir(dist);
let hasDefault = false;

for (const f of files) {
  if (!f.endsWith('.js')) continue;
  const src = await readFile(join(dist.pathname, f), 'utf8');
  if (/\bexport\s+default\b/.test(src)) {
    console.error(`Default export found in dist/${f}`);
    hasDefault = true;
  }
}
if (hasDefault) {
  process.exitCode = 1;
} else {
  console.log('OK: no default exports, ESM build looks clean.');
}
