#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { join } = require('path');
const { existsSync, statSync, readFileSync } = require('fs');

// Test the core tree-shaking infrastructure that's still valuable
describe('Tree Shaking Infrastructure Tests', () => {
  it('should have tree-shaking analysis scripts', () => {
    const scriptsDir = join(__dirname, '..');

    const expectedScripts = [
      'test-tree-shaking.cjs',
      'analyze-tree-shaking.cjs',
    ];

    expectedScripts.forEach(script => {
      const scriptPath = join(scriptsDir, script);
      assert(existsSync(scriptPath), `Script ${script} should exist`);

      const stats = statSync(scriptPath);
      assert(stats.isFile(), `${script} should be a file`);

      // Check if file is executable (has execute permission)
      const isExecutable = (stats.mode & 0o111) !== 0; // eslint-disable-line no-bitwise
      assert(isExecutable, `${script} should be executable`);
    });
  });

  it('should have Vite config with bundle analyzer', () => {
    const viteConfigPath = join(__dirname, '..', '..', 'vite.config.ts');
    assert(existsSync(viteConfigPath), 'vite.config.ts should exist');

    const viteConfig = readFileSync(viteConfigPath, 'utf8');
    assert(
      viteConfig.includes('rollup-plugin-visualizer'),
      'Vite config should import visualizer',
    );
    assert(
      viteConfig.includes('visualizer('),
      'Vite config should use visualizer plugin',
    );
    assert(
      viteConfig.includes('bundle-analysis.html'),
      'Vite config should generate analysis HTML',
    );
  });
});

describe('Package Configuration Validation', () => {
  it('should validate @selfxyz/new-common package configuration', () => {
    const newCommonPackagePath = join(
      __dirname,
      '..',
      '..',
      '..',
      'new-common',
      'package.json',
    );
    assert(
      existsSync(newCommonPackagePath),
      '@selfxyz/new-common package.json should exist',
    );

    const newCommonPackage = JSON.parse(readFileSync(newCommonPackagePath, 'utf8'));

    assert(newCommonPackage.type === 'module', 'Should use ESM modules');
    assert(newCommonPackage.sideEffects === false, 'Should have sideEffects: false for tree shaking');
    assert(newCommonPackage.exports, 'Should have exports defined');

    // Check root and sub-path exports
    const exports = newCommonPackage.exports;
    assert(exports['.'], 'Should export root barrel "."');
    assert(exports['./src/*'], 'Should export sub-path "./src/*"');

    // Verify types condition comes first in root export
    const rootExport = exports['.'];
    const rootKeys = Object.keys(rootExport);
    assert(rootKeys[0] === 'types', 'Root export "types" condition should come first for TypeScript resolution');
  });
});
