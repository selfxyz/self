#!/usr/bin/env node
const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { runTest, TEST_CONFIGS } = require('../test-tree-shaking.cjs');

describe('Tree Shaking Tests', () => {
  it('should have all required test configurations', () => {
    assert(Array.isArray(TEST_CONFIGS), 'TEST_CONFIGS should be an array');
    assert(
      TEST_CONFIGS.length >= 5,
      'Should have at least 5 test configurations',
    );

    const requiredConfigs = [
      'full-import',
      'granular-constants',
      'granular-utils',
      'granular-mixed',
    ];
    requiredConfigs.forEach(configName => {
      const config = TEST_CONFIGS.find(c => c.name === configName);
      assert(config, `Configuration '${configName}' should exist`);
      assert(
        config.description,
        `Configuration '${configName}' should have a description`,
      );
      assert(
        config.imports,
        `Configuration '${configName}' should have imports`,
      );
    });
  });

  it('should have test scripts that exist and are executable', () => {
    const scriptsDir = path.join(__dirname, '..');

    const requiredScripts = [
      'test-tree-shaking.cjs',
      'analyze-tree-shaking.cjs',
    ];

    requiredScripts.forEach(script => {
      const scriptPath = path.join(scriptsDir, script);
      assert(fs.existsSync(scriptPath), `Script ${script} should exist`);

      const stats = fs.statSync(scriptPath);
      assert(stats.isFile(), `${script} should be a file`);

      // Check if file is executable (has execute permission)
      const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
      assert(isExecutable, `${script} should be executable`);
    });
  });

  it('should have example files that demonstrate different import patterns', () => {
    const examplesDir = path.join(__dirname, '..', '..', 'docs', 'examples', 'tree-shaking');
    assert(
      fs.existsSync(examplesDir),
      'Tree shaking examples directory should exist',
    );

    const requiredExamples = [
      'full-import-example.ts',
      'mixed-import-example.ts',
      'granular-import-example.ts',
      'optimal-pattern-example.ts',
    ];

    requiredExamples.forEach(example => {
      const examplePath = path.join(examplesDir, example);
      assert(fs.existsSync(examplePath), `Example ${example} should exist`);

      const content = fs.readFileSync(examplePath, 'utf8');
      assert(
        content.includes('@selfxyz/common'),
        `${example} should import from @selfxyz/common`,
      );
      assert(content.includes('export'), `${example} should export something`);
    });
  });

  it('should have different import patterns in examples', () => {
    const examplesDir = path.join(__dirname, '..', '..', 'docs', 'examples', 'tree-shaking');

    // Check full import example
    const fullImport = fs.readFileSync(
      path.join(examplesDir, 'full-import-example.ts'),
      'utf8',
    );
    assert(
      fullImport.includes('import * as'),
      'Full import should use star import',
    );

    // Check granular import example
    const granularImport = fs.readFileSync(
      path.join(examplesDir, 'granular-import-example.ts'),
      'utf8',
    );
    assert(
      granularImport.includes('/constants'),
      'Granular import should use /constants',
    );
    assert(
      granularImport.includes('/utils'),
      'Granular import should use /utils',
    );

    // Check optimal pattern
    const optimal = fs.readFileSync(
      path.join(examplesDir, 'optimal-pattern-example.ts'),
      'utf8',
    );
    assert(
      optimal.includes('/constants'),
      'Optimal pattern should use /constants',
    );
    assert(optimal.includes('/utils'), 'Optimal pattern should use /utils');
    assert(
      optimal.includes('import type'),
      'Optimal pattern should use type imports',
    );
  });

  it('should validate tree shaking configuration format', () => {
    TEST_CONFIGS.forEach(config => {
      assert(
        typeof config.name === 'string',
        `Config ${config.name} should have string name`,
      );
      assert(
        typeof config.description === 'string',
        `Config ${config.name} should have string description`,
      );
      assert(
        typeof config.imports === 'string',
        `Config ${config.name} should have string imports`,
      );

      // Validate import patterns
      if (config.name === 'full-import') {
        assert(
          config.imports.includes('import * as'),
          'Full import should use star imports',
        );
      }

      if (config.name.startsWith('granular')) {
        assert(
          config.imports.includes('/constants') ||
            config.imports.includes('/utils') ||
            config.imports.includes('/types'),
          'Granular imports should use specific paths',
        );
      }
    });
  });

  it('should have proper npm scripts defined', () => {
    const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
    assert(fs.existsSync(packageJsonPath), 'package.json should exist');

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const scripts = packageJson.scripts || {};

    const requiredScripts = [
      'test:tree-shaking',
      'analyze:tree-shaking',
      'analyze:tree-shaking:web',
      'analyze:tree-shaking:android',
      'analyze:tree-shaking:ios',
      'analyze:tree-shaking:imports',
    ];

    requiredScripts.forEach(script => {
      assert(scripts[script], `NPM script '${script}' should be defined`);
      assert(
        scripts[script].includes('scripts/'),
        `Script '${script}' should reference scripts directory`,
      );
    });
  });

  it('should have Vite config with bundle analyzer', () => {
    const viteConfigPath = path.join(__dirname, '..', '..', 'vite.config.ts');
    assert(fs.existsSync(viteConfigPath), 'vite.config.ts should exist');

    const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
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

describe('Tree Shaking Best Practices Validation', () => {
  it('should validate @selfxyz/common package configuration', () => {
    const commonPackagePath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'common',
      'package.json',
    );
    assert(
      fs.existsSync(commonPackagePath),
      '@selfxyz/common package.json should exist',
    );

    const commonPackage = JSON.parse(
      fs.readFileSync(commonPackagePath, 'utf8'),
    );

    // Check tree shaking enablers
    assert(
      commonPackage.sideEffects === false,
      'Should have sideEffects: false for tree shaking',
    );
    assert(commonPackage.type === 'module', 'Should use ESM modules');
    assert(commonPackage.exports, 'Should have granular exports defined');

    // Check granular exports
    const exports = commonPackage.exports;
    assert(exports['./constants'], 'Should export ./constants');
    assert(exports['./utils'], 'Should export ./utils');
    assert(exports['./types'], 'Should export ./types');
  });

  it('should validate tsup configuration for tree shaking', () => {
    const tsupConfigPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'common',
      'tsup.config.ts',
    );
    assert(fs.existsSync(tsupConfigPath), 'tsup.config.ts should exist');

    const tsupConfig = fs.readFileSync(tsupConfigPath, 'utf8');
    assert(
      tsupConfig.includes('splitting: true'),
      'Should enable code splitting',
    );
    assert(
      tsupConfig.includes("format: ['cjs', 'esm']"),
      'Should build both CJS and ESM',
    );
    assert(tsupConfig.includes('entry:'), 'Should have multiple entry points');
  });
});
