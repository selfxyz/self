// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// WIA-13 invariant: Session Replay / Sentry wiring is owned by webview-app. The
// platform-agnostic SDK core and the bridge must never import a Sentry SDK — they
// only pass pure helpers/callbacks across the boundary.
const PACKAGES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const GUARDED_ROOTS = [join(PACKAGES_DIR, 'mobile-sdk-alpha', 'src'), join(PACKAGES_DIR, 'webview-bridge', 'src')];
const SENTRY_IMPORT =
  /(?:import\s+[^'"]*from\s*|import\s*|export\s+[^'"]*from\s*|require\(\s*|import\(\s*)['"]@sentry\//;

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Sentry import boundary', () => {
  it.each(GUARDED_ROOTS)('no @sentry import leaks into %s', root => {
    const offenders = collectSourceFiles(root).filter(file => SENTRY_IMPORT.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
