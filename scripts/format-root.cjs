#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const prettierBin = path.join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs');

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('format markdown');
runNode([prettierBin, '--write', '*.md', 'docs/**/*.md', 'specs/**/*.md']);

console.log('format yaml');
runNode([prettierBin, '--write', '.*.yml', '.*.yaml', '--single-quote', 'false']);

runNode([prettierBin, '--write', '--no-error-on-unmatched-pattern', 'scripts/**/*.{js,mjs,ts}']);
runNode([prettierBin, '--write', '--no-error-on-unmatched-pattern', 'scripts/**/*.json']);
