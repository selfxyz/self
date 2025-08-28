#!/usr/bin/env node

// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Script to find improperly formatted import/export types
 *
 * This script identifies TypeScript imports and exports that use inline type syntax
 * (e.g., `import { type X }`) instead of the preferred separate type syntax
 * (e.g., `import type { X }`).
 */

import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { dirname, extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Patterns to match
const PATTERNS = {
  // Inline type imports: import { type X, Y, type Z } from 'module'
  inlineTypeImport:
    /^[^/]*import\s*{\s*[^}]*\btype\s+\w+[^}]*}\s+from\s+['"`][^'"`]+['"`]/gm,

  // Inline type exports: export { type X, Y, type Z } from 'module'
  inlineTypeExport:
    /^[^/]*export\s*{\s*[^}]*\btype\s+\w+[^}]*}\s+from\s+['"`][^'"`]+['"`]/gm,

  // Inline type re-exports: export { type X, Y, type Z }
  inlineTypeReExport: /^[^/]*export\s*{\s*[^}]*\btype\s+\w+[^}]*}\s*(?!from)/gm,

  // Inline type destructuring: const { type X, Y, type Z } = require('module')
  inlineTypeDestructuring:
    /^[^/]*const\s*{\s*[^}]*\btype\s+\w+[^}]*}\s*=\s*require\s*\(/gm,
};

// Directories to scan
const SCAN_DIRS = ['src', 'tests/src', 'scripts'];

// File extensions to scan
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

// Directories to ignore
const IGNORE_DIRS = [
  'node_modules',
  'ios',
  'android',
  'deployments',
  'web/dist',
  '.tamagui',
  'tests/e2e',
];

// Files to ignore
const IGNORE_FILES = [
  'scripts/find-type-import-issues.mjs', // Ignore this script itself
];

function shouldIgnoreFile(filePath) {
  return IGNORE_DIRS.some(dir => filePath.includes(`/${dir}/`));
}

function shouldIgnoreFileByName(filePath) {
  return IGNORE_FILES.some(file => filePath.endsWith(file));
}

function shouldScanFile(filePath) {
  const ext = extname(filePath);
  return SCAN_EXTENSIONS.includes(ext);
}

function findIssuesInFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check each pattern
    Object.entries(PATTERNS).forEach(([patternName, pattern]) => {
      if (pattern.test(line)) {
        issues.push({
          line: lineNum,
          content: line.trim(),
          pattern: patternName,
        });
      }
    });
  });

  return issues;
}

function scanDirectory(dirPath) {
  const results = [];

  if (!existsSync(dirPath)) {
    return results;
  }

  const items = readdirSync(dirPath);

  for (const item of items) {
    const fullPath = join(dirPath, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!shouldIgnoreFile(fullPath)) {
        results.push(...scanDirectory(fullPath));
      }
    } else if (
      stat.isFile() &&
      shouldScanFile(fullPath) &&
      !shouldIgnoreFileByName(fullPath)
    ) {
      const issues = findIssuesInFile(fullPath);
      if (issues.length > 0) {
        results.push({
          file: fullPath,
          issues,
        });
      }
    }
  }

  return results;
}

function formatResults(results) {
  if (results.length === 0) {
    console.log('✅ No improperly formatted type imports/exports found!');
    return;
  }

  console.log(
    `\n❌ Found ${results.length} files with improperly formatted type imports/exports:\n`,
  );

  results.forEach(({ file, issues }) => {
    console.log(`📁 ${file}`);
    issues.forEach(({ line, content, pattern }) => {
      console.log(`   Line ${line}: ${pattern}`);
      console.log(`   ${content}`);
      console.log('');
    });
  });

  const totalIssues = results.reduce(
    (sum, { issues }) => sum + issues.length,
    0,
  );
  console.log(
    `\n📊 Summary: ${totalIssues} total issues found in ${results.length} files`,
  );

  console.log('\n💡 To fix these issues, convert:');
  console.log('   ❌ import { type X, Y, type Z } from "module"');
  console.log('   ✅ import type { X, Y, Z } from "module"');
  console.log('');
  console.log('   ❌ export { type X, Y, type Z } from "module"');
  console.log('   ✅ export type { X, Y, Z } from "module"');
}

function main() {
  const projectRoot = resolve(__dirname, '..');
  process.chdir(projectRoot);

  console.log('🔍 Scanning for improperly formatted type imports/exports...\n');

  const allResults = [];

  SCAN_DIRS.forEach(dir => {
    const fullPath = join(projectRoot, dir);
    if (existsSync(fullPath)) {
      const results = scanDirectory(fullPath);
      allResults.push(...results);
    }
  });

  formatResults(allResults);

  if (allResults.length > 0) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
