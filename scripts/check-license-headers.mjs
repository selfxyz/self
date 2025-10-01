#!/usr/bin/env node

// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Script to check and fix license header formatting
 * Ensures there's a newline after license headers
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

// Legacy composite format (being phased out)
const LEGACY_HEADER =
  '// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11';

// Canonical multi-line format (preferred)
const CANONICAL_HEADER_LINES = [
  '// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.',
  '// SPDX-License-Identifier: BUSL-1.1',
  '// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.',
];

function findFiles(
  dir,
  extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
) {
  const files = [];

  function traverse(currentDir) {
    const items = readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules, .git, and other common directories
        if (
          ![
            'node_modules',
            '.git',
            'dist',
            'build',
            'coverage',
            'ios',
            'android',
            '.next',
            '.turbo',
            '.tamagui',
          ].includes(item)
        ) {
          traverse(fullPath);
        }
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function findLicenseHeaderIndex(lines) {
  let i = 0;
  // Skip shebang if present
  if (lines[i]?.startsWith('#!')) i++;
  // Skip leading blank lines
  while (i < lines.length && lines[i].trim() === '') i++;

  const currentLine = lines[i];

  // Check for legacy composite format
  if (currentLine === LEGACY_HEADER) {
    return { index: i, type: 'legacy', valid: true, endIndex: i };
  }

  // Check for canonical multi-line format
  if (currentLine === CANONICAL_HEADER_LINES[0]) {
    const hasAllLines =
      lines[i + 1] === CANONICAL_HEADER_LINES[1] &&
      lines[i + 2] === CANONICAL_HEADER_LINES[2];
    return {
      index: i,
      type: 'canonical',
      valid: hasAllLines,
      endIndex: hasAllLines ? i + 2 : i,
    };
  }

  return { index: -1, type: 'none', valid: false };
}

function shouldRequireHeader(filePath, projectRoot) {
  const relativePath = path.relative(projectRoot, filePath);
  // Only require headers in app/ and packages/mobile-sdk-alpha/ directories
  return (
    relativePath.startsWith('app/') ||
    relativePath.startsWith('packages/mobile-sdk-alpha/')
  );
}

function checkLicenseHeader(
  filePath,
  { requireHeader = false, projectRoot = process.cwd() } = {},
) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const headerInfo = findLicenseHeaderIndex(lines);

  const shouldHaveHeader =
    requireHeader || shouldRequireHeader(filePath, projectRoot);

  if (headerInfo.index === -1) {
    if (shouldHaveHeader) {
      return {
        file: filePath,
        issue: 'Missing or incorrect license header',
        fixed: false,
      };
    }
    return null;
  }

  if (!headerInfo.valid) {
    return {
      file: filePath,
      issue: 'Incomplete or malformed license header',
      fixed: false,
    };
  }

  // Check if there's a newline after the license header
  const headerEndIndex = headerInfo.endIndex;
  if (lines[headerEndIndex + 1] !== '') {
    return {
      file: filePath,
      issue: 'Missing newline after license header',
      fixed: false,
    };
  }

  return null;
}

function fixLicenseHeader(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const headerInfo = findLicenseHeaderIndex(lines);

  if (headerInfo.index === -1) {
    // No header exists - add the canonical header
    const newLines = [
      ...CANONICAL_HEADER_LINES,
      '', // Add newline after header
      ...lines,
    ];
    const fixedContent = newLines.join('\n');
    writeFileSync(filePath, fixedContent, 'utf8');
    return true;
  }

  if (headerInfo.valid) {
    const headerEndIndex = headerInfo.endIndex;
    if (lines[headerEndIndex + 1] !== '') {
      // Insert empty line after license header
      lines.splice(headerEndIndex + 1, 0, '');
      const fixedContent = lines.join('\n');
      writeFileSync(filePath, fixedContent, 'utf8');
      return true;
    }
  }

  return false;
}

function main() {
  const args = process.argv.slice(2);
  const isFix = args.includes('--fix');
  const isCheck = args.includes('--check') || !isFix;
  const requireHeader = args.includes('--require');

  // Get all directory arguments (non-flag arguments)
  const dirArgs = args.filter(arg => !arg.startsWith('--'));
  const projectRoots =
    dirArgs.length > 0
      ? dirArgs.map(dir => path.resolve(dir))
      : [process.cwd()];

  // Collect files from all directories
  const files = [];
  for (const projectRoot of projectRoots) {
    files.push(...findFiles(projectRoot));
  }

  const issues = [];

  for (const file of files) {
    const issue = checkLicenseHeader(file, {
      requireHeader,
      projectRoot: process.cwd(),
    });
    if (issue) {
      issues.push(issue);

      if (isFix) {
        const fixed = fixLicenseHeader(file);
        if (fixed) {
          issue.fixed = true;
          console.log(`✅ Fixed: ${file}`);
        }
      }
    }
  }

  if (isCheck) {
    // Show which directories require headers
    const requiredDirs = ['app/', 'packages/mobile-sdk-alpha/'];
    console.log(`📋 License headers required in: ${requiredDirs.join(', ')}`);

    if (issues.length === 0) {
      console.log('✅ All license headers are properly formatted');
    } else {
      console.log(
        `❌ Found ${issues.length} files with license header issues:`,
      );
      for (const issue of issues) {
        console.log(`  - ${issue.file}: ${issue.issue}`);
      }
      console.log('\nRun with --fix to automatically fix these issues');
      process.exit(1);
    }
  } else if (isFix) {
    const fixedCount = issues.filter(issue => issue.fixed).length;
    console.log(`\n✅ Fixed ${fixedCount} files`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
