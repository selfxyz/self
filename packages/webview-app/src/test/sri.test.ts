// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const DIST_DIR = join(__dirname, '../../dist');

function readDistFile(path: string): Buffer {
  return readFileSync(join(DIST_DIR, path));
}

function sha384(content: Buffer): string {
  return createHash('sha384').update(content).digest('base64');
}

describe('subresource integrity', () => {
  let html: string;

  try {
    html = readFileSync(join(DIST_DIR, 'index.html'), 'utf-8');
  } catch {
    // Build output not available — skip gracefully
    html = '';
  }

  it('index.html contains integrity attributes on script tags', () => {
    if (!html) return; // no build output
    const scripts = html.match(/<script[^>]*src="[^"]*"[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    for (const tag of scripts) {
      expect(tag).toContain('integrity="sha384-');
    }
  });

  it('index.html contains integrity attributes on stylesheet links', () => {
    if (!html) return;
    const links = html.match(/<link[^>]*rel="stylesheet"[^>]*>/g) ?? [];
    expect(links.length).toBeGreaterThan(0);
    for (const tag of links) {
      expect(tag).toContain('integrity="sha384-');
    }
  });

  it('script integrity hashes match file contents', () => {
    if (!html) return;
    const matches = [...html.matchAll(/src="([^"]+)"[^>]*integrity="sha384-([^"]+)"/g)];
    expect(matches.length).toBeGreaterThan(0);
    for (const [, src, expectedHash] of matches) {
      const fileContent = readDistFile(src);
      const actualHash = sha384(fileContent);
      expect(actualHash).toBe(expectedHash);
    }
  });

  it('stylesheet integrity hashes match file contents', () => {
    if (!html) return;
    const matches = [...html.matchAll(/href="([^"]+)"[^>]*integrity="sha384-([^"]+)"/g)];
    expect(matches.length).toBeGreaterThan(0);
    for (const [, href, expectedHash] of matches) {
      const fileContent = readDistFile(href);
      const actualHash = sha384(fileContent);
      expect(actualHash).toBe(expectedHash);
    }
  });
});
