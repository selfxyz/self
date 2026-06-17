#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Watchman config guard.
//
// Metro resolves modules from a file map built by crawling the tree with
// watchman (when the binary is on PATH). `.watchmanconfig`'s `ignore_dirs`
// tells watchman which directories to skip, so anything listed there is
// invisible to Metro's resolver.
//
// `node_modules` (and the built `dist` output of workspace packages) MUST stay
// crawlable: a previous config ignored them, which made watchman hide installed
// packages from Metro and broke local bundling — the documented workaround was
// to strip watchman from PATH so Metro fell back to its slower Node crawler.
// The stock React Native `.watchmanconfig` does not ignore `node_modules` for
// exactly this reason.
//
// Because `.watchmanconfig` is strict JSON and cannot carry a comment, this
// guard is the home for that rationale. It exists so neither a human nor an
// automated reviewer "optimizes" the pnpm store back into `ignore_dirs` and
// silently reintroduces the resolution failure. If watchman crawl cost ever
// becomes a real problem, tune it at the OS/watchman level (ulimit, gc,
// settle) — do not hide `node_modules` from Metro.

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..', '..');
const workspaceRoot = path.resolve(appRoot, '..');
const watchmanConfigPath = path.join(workspaceRoot, '.watchmanconfig');

const watchmanConfig = JSON.parse(readFileSync(watchmanConfigPath, 'utf8'));
const ignoreDirs = watchmanConfig.ignore_dirs ?? [];

// Directories that Metro must be able to resolve through, so they must never
// appear in watchman's ignore list.
const MUST_STAY_CRAWLABLE = ['node_modules', 'dist'];

describe('.watchmanconfig', () => {
  for (const dir of MUST_STAY_CRAWLABLE) {
    it(`does not ignore "${dir}" (Metro resolution depends on it)`, () => {
      assert.ok(
        !ignoreDirs.includes(dir),
        `"${dir}" must not be in .watchmanconfig ignore_dirs — see this file's header`,
      );
    });
  }
});
