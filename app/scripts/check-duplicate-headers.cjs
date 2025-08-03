#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const LICENSE_HEADER_PATTERN = /SPDX-License-Identifier:/;
const EXTENSIONS = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const headerLines = lines
    .map((line, index) => ({ line, index: index + 1 }))
    .filter(({ line }) => LICENSE_HEADER_PATTERN.test(line));

  if (headerLines.length > 1) {
    console.error(`\n❌ Multiple license headers found in ${filePath}:`);
    headerLines.forEach(({ index }) => {
      console.error(`   Line ${index}`);
    });
    return false;
  }

  return true;
}

function main() {
  let hasErrors = false;

  // Get all relevant files
  const patterns = EXTENSIONS.map(ext => path.join('src', ext));
  patterns.push(...EXTENSIONS.map(ext => path.join('tests', ext)));
  patterns.push('*.ts', '*.tsx', '*.js', '*.jsx');

  for (const pattern of patterns) {
    const files = glob.sync(pattern, {
      ignore: ['node_modules/**', 'dist/**', 'build/**', '**/*.d.ts'],
    });

    for (const file of files) {
      if (!checkFile(file)) {
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    console.error(
      '\n💡 Fix: Remove duplicate license headers. Only keep the one at the top of each file.\n',
    );
    process.exit(1);
  } else {
    console.log('✅ No duplicate license headers found');
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkFile };
