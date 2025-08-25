#!/usr/bin/env node

// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/**
 * Script to check and fix license header formatting
 * Ensures there's a newline after license headers
 */

import fs from 'fs';
import path from 'path';

const LICENSE_HEADER =
  '// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11';

function findFiles(
  dir,
  extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

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
  return lines[i] === LICENSE_HEADER ? i : -1;
}

function checkLicenseHeader(filePath, { requireHeader = false } = {}) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const idx = findLicenseHeaderIndex(lines);

  if (idx === -1) {
    if (requireHeader) {
      return {
        file: filePath,
        issue: 'Missing or incorrect license header',
        fixed: false,
      };
    }
    return null;
  }

  // Check if there's a newline after the license header
  if (lines[idx + 1] !== '') {
    return {
      file: filePath,
      issue: 'Missing newline after license header',
      fixed: false,
    };
  }

  return null;
}

function fixLicenseHeader(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const idx = findLicenseHeaderIndex(lines);

  if (idx !== -1 && lines[idx + 1] !== '') {
    // Insert empty line after license header
    lines.splice(idx + 1, 0, '');
    const fixedContent = lines.join('\n');
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    return true;
  }

  return false;
}

function main() {
  const args = process.argv.slice(2);
  const isFix = args.includes('--fix');
  const isCheck = args.includes('--check') || !isFix;
  const requireHeader = args.includes('--require');
  const dirArg = args.find(arg => !arg.startsWith('--'));
  const projectRoot = dirArg ? path.resolve(dirArg) : process.cwd();
  const files = findFiles(projectRoot);

  const issues = [];

  for (const file of files) {
    const issue = checkLicenseHeader(file, { requireHeader });
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
