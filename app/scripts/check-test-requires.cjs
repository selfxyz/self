// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Check for nested require('react') and require('react-native') in test files
 * These patterns cause out-of-memory errors in CI/CD pipelines
 *
 * Usage: node scripts/check-test-requires.cjs
 * Exit code: 0 if no issues found, 1 if issues found
 */

const fs = require('fs');
const path = require('path');

const TESTS_DIR = path.join(__dirname, '..', 'tests');
const FORBIDDEN_PATTERNS = [
  {
    pattern: /require\(['"]react['"]\)/g,
    name: "require('react')",
    fix: 'Use \'import React from "react"\' at the top of the file instead',
  },
  {
    pattern: /require\(['"]react-native['"]\)/g,
    name: "require('react-native')",
    fix: 'Use \'import { ... } from "react-native"\' at the top of the file instead',
  },
];

/**
 * Recursively find all test files in directory
 */
function findTestFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and other common directories
      if (
        !['node_modules', '.git', 'coverage', 'dist', 'build'].includes(
          entry.name,
        )
      ) {
        findTestFiles(fullPath, files);
      }
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') ||
        entry.name.endsWith('.tsx') ||
        entry.name.endsWith('.js') ||
        entry.name.endsWith('.jsx'))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Check a file for forbidden require patterns
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];

  for (const { pattern, name, fix } of FORBIDDEN_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const lines = content.substring(0, match.index).split('\n');
      const lineNumber = lines.length;
      const columnNumber = lines[lines.length - 1].length + 1;

      issues.push({
        file: path.relative(process.cwd(), filePath),
        line: lineNumber,
        column: columnNumber,
        pattern: name,
        fix: fix,
      });
    }
  }

  return issues;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Checking for nested require() in test files...\n');

  if (!fs.existsSync(TESTS_DIR)) {
    console.error(`❌ Tests directory not found: ${TESTS_DIR}`);
    process.exit(1);
  }

  const testFiles = findTestFiles(TESTS_DIR);
  console.log(`Found ${testFiles.length} test files to check\n`);

  let totalIssues = 0;
  const issuesByFile = new Map();

  for (const file of testFiles) {
    const issues = checkFile(file);
    if (issues.length > 0) {
      issuesByFile.set(file, issues);
      totalIssues += issues.length;
    }
  }

  if (totalIssues === 0) {
    console.log('✅ No nested require() patterns found in test files!');
    process.exit(0);
  }

  // Report issues
  console.error(
    `❌ Found ${totalIssues} nested require() pattern(s) that cause OOM in CI:\n`,
  );

  for (const [file, issues] of issuesByFile.entries()) {
    console.error(`\n${path.relative(process.cwd(), file)}:`);
    for (const issue of issues) {
      console.error(`  Line ${issue.line}:${issue.column} - ${issue.pattern}`);
      console.error(`    Fix: ${issue.fix}`);
    }
  }

  console.error(
    '\n⚠️  These patterns cause out-of-memory errors in CI/CD pipelines.',
  );
  console.error(
    '   Use ES6 imports at the top of files instead of require() calls.',
  );
  console.error(
    '   See .cursor/rules/test-memory-optimization.mdc for details.\n',
  );

  process.exit(1);
}

main();
