#!/usr/bin/env node

// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/**
 * Script to check and fix license header formatting
 * Ensures there's a newline after license headers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
          !['node_modules', '.git', 'dist', 'build', 'coverage'].includes(item)
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

function checkLicenseHeader(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Check if first line is license header
  if (lines[0] === LICENSE_HEADER) {
    // Check if second line is empty (has newline after license header)
    if (lines[1] !== '') {
      return {
        file: filePath,
        issue: 'Missing newline after license header',
        fixed: false,
      };
    }
  }

  return null;
}

function fixLicenseHeader(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  if (lines[0] === LICENSE_HEADER && lines[1] !== '') {
    // Insert empty line after license header
    lines.splice(1, 0, '');
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

  const projectRoot = path.resolve(__dirname, '..');
  const files = findFiles(projectRoot);

  const issues = [];

  for (const file of files) {
    const issue = checkLicenseHeader(file);
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
