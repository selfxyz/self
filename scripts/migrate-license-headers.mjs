#!/usr/bin/env node

// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/**
 * Migration tool to convert composite SPDX headers to canonical multi-line format
 */

import fs from 'fs';
import path from 'path';

// Current composite format
const COMPOSITE_HEADER =
  '// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11';

// New canonical format
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
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip common directories
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
            'target',
            'Pods',
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

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let i = 0;
  // Skip shebang if present
  if (lines[i]?.startsWith('#!')) i++;
  // Skip leading blank lines
  while (i < lines.length && lines[i].trim() === '') i++;

  const currentLine = lines[i];

  if (currentLine === COMPOSITE_HEADER) {
    return {
      type: 'composite',
      headerIndex: i,
      needsMigration: true,
    };
  } else if (currentLine === CANONICAL_HEADER_LINES[0]) {
    // Check if it's the full canonical format
    const isCanonical =
      lines[i + 1] === CANONICAL_HEADER_LINES[1] &&
      lines[i + 2] === CANONICAL_HEADER_LINES[2];
    return {
      type: isCanonical ? 'canonical' : 'partial_canonical',
      headerIndex: i,
      needsMigration: !isCanonical,
    };
  } else if (currentLine?.includes('SPDX-License-Identifier')) {
    return {
      type: 'other_spdx',
      headerIndex: i,
      needsMigration: false,
    };
  } else {
    return {
      type: 'no_header',
      headerIndex: -1,
      needsMigration: false,
    };
  }
}

function migrateFile(filePath, dryRun = false) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const analysis = analyzeFile(filePath);

  if (!analysis.needsMigration) {
    return { success: false, reason: 'No migration needed' };
  }

  if (analysis.type === 'composite') {
    // Replace the composite line with canonical lines
    lines.splice(analysis.headerIndex, 1, ...CANONICAL_HEADER_LINES);

    if (!dryRun) {
      const newContent = lines.join('\n');
      fs.writeFileSync(filePath, newContent, 'utf8');
    }

    return { success: true, reason: 'Migrated composite to canonical' };
  }

  return { success: false, reason: 'Unknown migration path' };
}

function generateReport(projectRoot) {
  const files = findFiles(projectRoot);
  const report = {
    composite: [],
    canonical: [],
    partial_canonical: [],
    other_spdx: [],
    no_header: [],
    total: files.length,
  };

  for (const file of files) {
    const analysis = analyzeFile(file);
    report[analysis.type].push({
      file: path.relative(projectRoot, file),
      needsMigration: analysis.needsMigration,
    });
  }

  return report;
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const isDryRun = args.includes('--dry-run');
  const isVerbose = args.includes('--verbose');
  const projectRoot =
    args.find(arg => !arg.startsWith('--') && arg !== command) || process.cwd();

  switch (command) {
    case 'analyze':
    case 'report': {
      const report = generateReport(projectRoot);

      console.log('📊 License Header Migration Analysis\n');
      console.log(`Total files analyzed: ${report.total}\n`);

      console.log(
        `🔶 Composite headers (need migration): ${report.composite.length}`,
      );
      if (report.composite.length > 0 && isVerbose) {
        report.composite
          .slice(0, 10)
          .forEach(item => console.log(`   ${item.file}`));
        if (report.composite.length > 10) {
          console.log(`   ... and ${report.composite.length - 10} more`);
        }
        console.log();
      }

      console.log(`✅ Canonical headers: ${report.canonical.length}`);
      console.log(
        `⚠️  Partial canonical headers: ${report.partial_canonical.length}`,
      );
      console.log(`ℹ️  Other SPDX headers: ${report.other_spdx.length}`);
      console.log(`❌ No headers: ${report.no_header.length}`);

      if (report.composite.length > 0) {
        console.log(
          `\n🚀 Ready to migrate ${report.composite.length} files with composite headers`,
        );
        console.log(
          'Run: node scripts/migrate-license-headers.mjs migrate [--dry-run] to proceed',
        );
      } else {
        console.log(
          '\n✨ No migration needed - all headers are already in canonical format!',
        );
      }

      break;
    }

    case 'migrate': {
      const files = findFiles(projectRoot);
      const results = { migrated: 0, skipped: 0, errors: 0 };

      console.log(
        `🔄 ${isDryRun ? 'DRY RUN: ' : ''}Migrating license headers...\n`,
      );

      for (const file of files) {
        try {
          const result = migrateFile(file, isDryRun);
          if (result.success) {
            results.migrated++;
            console.log(
              `✅ ${isDryRun ? '[DRY RUN] ' : ''}Migrated: ${path.relative(projectRoot, file)}`,
            );
          } else {
            results.skipped++;
            if (isVerbose) {
              console.log(
                `⏭️  Skipped: ${path.relative(projectRoot, file)} (${result.reason})`,
              );
            }
          }
        } catch (error) {
          results.errors++;
          console.error(`❌ Error processing ${file}: ${error.message}`);
        }
      }

      console.log(`\n📊 Migration Summary:`);
      console.log(`   Migrated: ${results.migrated}`);
      console.log(`   Skipped: ${results.skipped}`);
      console.log(`   Errors: ${results.errors}`);

      if (isDryRun && results.migrated > 0) {
        console.log('\n🚀 Run without --dry-run to apply changes');
      }

      break;
    }

    case 'migrate-single': {
      const targetFile = args[1];
      if (!targetFile) {
        console.error('❌ Please specify a file to migrate');
        process.exit(1);
      }

      const fullPath = path.resolve(targetFile);
      const result = migrateFile(fullPath, isDryRun);

      if (result.success) {
        console.log(
          `✅ ${isDryRun ? '[DRY RUN] ' : ''}Migrated: ${targetFile}`,
        );
      } else {
        console.log(`⏭️  ${targetFile}: ${result.reason}`);
      }

      break;
    }

    default:
      console.log(`Usage: node scripts/migrate-license-headers.mjs <command> [options]

Commands:
  analyze, report     Generate analysis report of current header formats
  migrate            Migrate all composite headers to canonical format
  migrate-single     Migrate a single file

Options:
  --dry-run          Show what would be changed without making changes
  --verbose          Show detailed output

Examples:
  node scripts/migrate-license-headers.mjs analyze --verbose
  node scripts/migrate-license-headers.mjs migrate --dry-run
  node scripts/migrate-license-headers.mjs migrate packages/mobile-sdk-alpha
  node scripts/migrate-license-headers.mjs migrate-single src/index.ts --dry-run
`);
      break;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
