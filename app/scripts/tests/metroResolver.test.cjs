#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Regression coverage for the metro.config.cjs resolveRequest re-anchor.
//
// Dynamically imported (await import(...)) packages that are hoisted to the
// workspace root get rewritten by Metro's dev server into a path relative to
// the app server root, e.g. "./node_modules/react-native-biometrics/build/cjs/
// index". That resolves against app/node_modules and misses the hoisted
// install, breaking lazy imports (biometrics, haptic-feedback) on the dev
// server. The resolver re-anchors any such request to the real install. This
// behaviour must hold identically for ios and android.

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const config = require('../../metro.config.cjs');

const { resolveRequest } = config.resolver;

const DEFAULT_SENTINEL = Symbol('default-resolution');

function makeContext() {
  return {
    // Fallback stub: returns a sentinel so we can assert non-matching requests
    // are delegated to Metro's default resolver rather than intercepted.
    resolveRequest: () => DEFAULT_SENTINEL,
    originModulePath: path.resolve(__dirname, '../../index.js'),
  };
}

// The rewritten lazy-import requests Metro hands to resolveRequest, with the
// concrete file each must re-anchor to (relative to the workspace root).
const REWRITTEN_LAZY_IMPORTS = [
  {
    moduleName: './node_modules/react-native-biometrics/build/cjs/index',
    endsWith: path.join('react-native-biometrics', 'build', 'cjs', 'index.js'),
  },
  {
    moduleName:
      './node_modules/react-native-haptic-feedback/lib/commonjs/index',
    endsWith: path.join(
      'react-native-haptic-feedback',
      'lib',
      'commonjs',
      'index.js',
    ),
  },
];

for (const platform of ['ios', 'android']) {
  describe(`metro resolveRequest (${platform})`, () => {
    for (const { moduleName, endsWith } of REWRITTEN_LAZY_IMPORTS) {
      it(`re-anchors hoisted lazy import "${moduleName}"`, () => {
        const result = resolveRequest(makeContext(), moduleName, platform);

        assert.strictEqual(
          result.type,
          'sourceFile',
          'should resolve to a concrete source file',
        );
        assert.ok(
          path.isAbsolute(result.filePath),
          `filePath should be absolute, got ${result.filePath}`,
        );
        assert.ok(
          result.filePath.endsWith(endsWith),
          `filePath ${result.filePath} should end with ${endsWith}`,
        );
        assert.ok(
          fs.existsSync(result.filePath),
          `resolved file should exist on disk: ${result.filePath}`,
        );
      });
    }

    it('delegates non-node_modules relative imports to the default resolver', () => {
      const result = resolveRequest(makeContext(), './foo/bar', platform);
      assert.strictEqual(
        result,
        DEFAULT_SENTINEL,
        'ordinary relative imports must not be intercepted',
      );
    });

    it('does NOT intercept Reanimated — it resolves as a real dependency', () => {
      // Reanimated is an installed package; native screens/gesture-handler need
      // the real module. The custom resolver must leave it to Metro's default
      // resolver. A regression that re-adds a shim route would fail here.
      for (const moduleName of [
        'react-native-reanimated',
        'react-native-reanimated/lib/module/index',
      ]) {
        const result = resolveRequest(makeContext(), moduleName, platform);
        assert.strictEqual(
          result,
          DEFAULT_SENTINEL,
          `${moduleName} must delegate to the default resolver, not a shim`,
        );
      }
    });
  });
}
