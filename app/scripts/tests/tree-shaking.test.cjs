#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
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
  it('should validate @selfxyz/common package configuration', () => {
    const commonPackagePath = join(
      __dirname,
      '..',
      '..',
      '..',
      'common',
      'package.json',
    );
    assert(
      existsSync(commonPackagePath),
      '@selfxyz/common package.json should exist',
    );

    const commonPackage = JSON.parse(readFileSync(commonPackagePath, 'utf8'));

    assert(commonPackage.type === 'module', 'Should use ESM modules');
    assert(commonPackage.exports, 'Should have granular exports defined');

    // Check granular exports
    const exports = commonPackage.exports;
    assert(exports['./constants'], 'Should export ./constants');
    assert(exports['./utils'], 'Should export ./utils');
    assert(exports['./types'], 'Should export ./types');
  });
});
