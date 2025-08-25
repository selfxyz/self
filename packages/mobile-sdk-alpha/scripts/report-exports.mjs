// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const files = await readdir(dist);
const report = {};

for (const f of files) {
  if (!f.endsWith('.js')) continue;
  const src = await readFile(join(dist.pathname, f), 'utf8');
  const direct = [...src.matchAll(/export\s+(?:const|function|class|let|var)\s+([A-Za-z0-9_$]+)/g)].map(m => m[1]);
  const re = [...src.matchAll(/export\s*{([^}]+)}/g)]
    .flatMap(m => m[1].split(',').map(s => s.trim()))
    .map(s => s.split('\s+as\s+').pop())
    .filter(name => name && name !== 'default');
  report[f] = [...direct, ...re];
}

console.log('Exported symbols by file:');
for (const [file, names] of Object.entries(report)) {
  console.log(`- ${file}: ${names.join(', ') || '(none)'}`);
}
