#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Tree shaking test configurations
const TEST_CONFIGS = [
  {
    name: 'full-import',
    description: 'Import everything from @selfxyz/common (worst case)',
    imports: `import * as common from '@selfxyz/common';
console.log('API_URL:', common.API_URL);
console.log('hash function exists:', typeof common.hash);`,
  },
  {
    name: 'mixed-import',
    description: 'Mixed import pattern (current typical usage)',
    imports: `import { API_URL, hash, buildSMT, generateCommitment } from '@selfxyz/common';
console.log('API_URL:', API_URL);
console.log('hash result:', hash('test'));`,
  },
  {
    name: 'granular-constants',
    description: 'Only constants via granular import (best case)',
    imports: `import { API_URL } from '@selfxyz/common/constants';
console.log('API_URL:', API_URL);`,
  },
  {
    name: 'granular-utils',
    description: 'Only hash utils via granular import',
    imports: `import { hash, customHasher } from '@selfxyz/common/utils';
console.log('hash result:', hash('test'));`,
  },
  {
    name: 'granular-mixed',
    description: 'Mixed granular imports (recommended pattern)',
    imports: `import { API_URL } from '@selfxyz/common/constants';
import { hash } from '@selfxyz/common/utils';
console.log('API_URL:', API_URL);
console.log('hash result:', hash('test'));`,
  },
];

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function createTestApp(config, testDir, commonPackagePath) {
  const appDir = path.join(testDir, config.name);
  fs.mkdirSync(appDir, { recursive: true });

  // Create package.json
  const packageJson = {
    name: `tree-shaking-test-${config.name}`,
    version: '1.0.0',
    private: true,
    type: 'module',
    dependencies: {
      '@selfxyz/common': `file:${commonPackagePath}`,
    },
  };

  fs.writeFileSync(
    path.join(appDir, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );

  // Create test file
  const testContent = `// ${config.description}
${config.imports}
`;

  fs.writeFileSync(path.join(appDir, 'index.js'), testContent);

  return appDir;
}

function createWebpackConfig(appDir) {
  const webpackConfig = `const path = require('path');

module.exports = {
  mode: 'production',
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  resolve: {
    extensions: ['.js', '.ts'],
  },
  optimization: {
    usedExports: true,
    sideEffects: false,
    minimize: true,
  },
  target: 'node',
  externals: {
    // Don't bundle node modules for more accurate size comparison
    ...require('webpack-node-externals')(),
  },
  stats: {
    modules: true,
    reasons: true,
    usedExports: true,
    providedExports: true,
  },
};
`;

  fs.writeFileSync(path.join(appDir, 'webpack.config.cjs'), webpackConfig);
}

function runTest(config, testDir, commonPackagePath) {
  console.log(`\n🧪 Testing: ${config.name}`);
  console.log(`📝 ${config.description}`);

  const appDir = createTestApp(config, testDir, commonPackagePath);

  try {
    // Install dependencies
    console.log('   📦 Installing dependencies...');
    execSync('yarn install', {
      cwd: appDir,
      stdio: 'pipe',
    });

    // Build with webpack for size analysis
    createWebpackConfig(appDir);

    // Install webpack locally for this test
    execSync('yarn add -D webpack webpack-cli webpack-node-externals', {
      cwd: appDir,
      stdio: 'pipe',
      env: { ...process.env, CI: 'true' }, // Set CI environment to prevent interactive prompts
    });

    console.log('   🔨 Building bundle...');
    execSync('yarn webpack --mode=production', {
      cwd: appDir,
      stdio: 'pipe',
      env: { ...process.env, CI: 'true' }, // Set CI environment to prevent interactive prompts
    });

    // Measure bundle size
    const bundlePath = path.join(appDir, 'dist', 'bundle.js');
    if (fs.existsSync(bundlePath)) {
      const bundleSize = fs.statSync(bundlePath).size;
      console.log(`   📊 Bundle size: ${formatBytes(bundleSize)}`);
      return { config: config.name, size: bundleSize };
    } else {
      console.log('   ❌ Bundle not found');
      return { config: config.name, size: -1 };
    }
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    return { config: config.name, size: -1, error: error.message };
  }
}

function generateReport(results) {
  console.log('\n📊 TREE SHAKING EFFECTIVENESS REPORT');
  console.log('=====================================');

  const validResults = results.filter(r => r.size > 0);
  if (validResults.length === 0) {
    console.log('❌ No valid results to compare');
    return;
  }

  // Sort by bundle size
  validResults.sort((a, b) => a.size - b.size);

  const baseline = validResults.find(r => r.config === 'full-import');
  const smallest = validResults[0];

  console.log('\nBundle Sizes (smallest to largest):');
  validResults.forEach((result, index) => {
    const icon =
      index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📦';
    let comparison = '';

    if (baseline && result.config !== 'full-import') {
      const rawDiff = baseline.size - result.size;
      if (rawDiff > 0) {
        const reduction = ((rawDiff / baseline.size) * 100).toFixed(1);
        const savedBytes = formatBytes(rawDiff);
        comparison = ` (${reduction}% smaller, saves ${savedBytes})`;
      }
    }

    console.log(
      `${icon} ${result.config.padEnd(20)} ${formatBytes(result.size)}${comparison}`,
    );
  });

  if (baseline && smallest.config !== 'full-import') {
    const rawMaxDiff = baseline.size - smallest.size;
    if (rawMaxDiff > 0) {
      const maxReduction = ((rawMaxDiff / baseline.size) * 100).toFixed(1);
      const maxSaved = formatBytes(rawMaxDiff);
      console.log(
        `\n🎯 Maximum tree shaking benefit: ${maxReduction}% reduction (${maxSaved} saved)`,
      );
    }
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (validResults.some(r => r.config.startsWith('granular'))) {
    console.log(
      '✅ Use granular imports like "@selfxyz/common/constants" for better tree shaking',
    );
  }
  console.log('✅ Avoid "import * as" patterns when possible');
  console.log('✅ Import only what you need from each module');

  // Check if tree shaking is working
  const hasVariation =
    Math.max(...validResults.map(r => r.size)) -
      Math.min(...validResults.map(r => r.size)) >
    1024;
  if (!hasVariation) {
    console.log(
      '\n⚠️  WARNING: Bundle sizes are very similar - tree shaking may not be working effectively',
    );
    console.log('   Check that "sideEffects": false is set in package.json');
    console.log('   Ensure proper ESM exports are configured');
  } else {
    console.log(
      '\n✅ Tree shaking appears to be working - different import patterns show different bundle sizes',
    );
  }
}

async function main() {
  console.log('🌳 Tree Shaking Effectiveness Test');
  console.log('==================================');

  // Create temporary test directory
  const testDir = path.join(
    os.tmpdir(),
    'tree-shaking-tests',
    Date.now().toString(),
  );
  fs.mkdirSync(testDir, { recursive: true });

  console.log(`📁 Test directory: ${testDir}`);

  try {
    // Ensure @selfxyz/common is built
    console.log('\n🔨 Building @selfxyz/common...');
    const commonDir = path.join(__dirname, '..', '..', 'common');
    execSync('yarn workspace @selfxyz/common build', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..', '..'),
    });

    // Copy the built common package to test directory for file:// reference
    const commonPackagePath = path.join(testDir, 'common-package');
    console.log(`📦 Copying @selfxyz/common to test directory...`);

    // Copy package.json, dist folder, and other necessary files
    fs.mkdirSync(commonPackagePath, { recursive: true });
    fs.copyFileSync(
      path.join(commonDir, 'package.json'),
      path.join(commonPackagePath, 'package.json'),
    );

    // Copy dist directory recursively
    const copyDir = (src, dest) => {
      fs.mkdirSync(dest, { recursive: true });
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          copyDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    copyDir(path.join(commonDir, 'dist'), path.join(commonPackagePath, 'dist'));

    // Run all tests
    const results = [];
    for (const config of TEST_CONFIGS) {
      const result = runTest(config, testDir, commonPackagePath);
      results.push(result);
    }

    // Generate report
    generateReport(results);

    console.log(`\n📁 Test artifacts available at: ${testDir}`);
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { TEST_CONFIGS, runTest, generateReport, createTestApp };
