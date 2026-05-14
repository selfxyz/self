#!/usr/bin/env node
// circom_tester invokes `circom -l node_modules/...` literally, so the
// includes must resolve under circuits/node_modules. pnpm's hoisted linker
// keeps these packages only in the monorepo-root node_modules, so we link
// them in here before tests run.
const fs = require('fs');
const path = require('path');

const here = path.resolve(__dirname, '..');
const root = path.resolve(here, '..');
const localModules = path.join(here, 'node_modules');

fs.mkdirSync(localModules, { recursive: true });
fs.mkdirSync(path.join(localModules, '@zk-kit'), { recursive: true });

const links = [
  ['circomlib', path.join(root, 'node_modules', 'circomlib')],
  [
    '@openpassport/zk-email-circuits',
    path.join(root, 'node_modules', '@openpassport', 'zk-email-circuits'),
  ],
  ['anon-aadhaar-circuits', path.join(root, 'node_modules', 'anon-aadhaar-circuits')],
  [
    '@zk-kit/binary-merkle-root.circom',
    path.join(root, 'node_modules', '@zk-kit', 'binary-merkle-root.circom'),
  ],
];

for (const [rel, target] of links) {
  const link = path.join(localModules, rel);
  if (!fs.existsSync(target)) {
    console.error(`link-circom-deps: missing source ${target}`);
    process.exit(1);
  }
  try {
    const stat = fs.lstatSync(link);
    if (stat.isSymbolicLink() || stat.isDirectory()) continue;
    fs.rmSync(link, { recursive: true, force: true });
  } catch {
    // not present, fall through to create
  }
  fs.symlinkSync(target, link, 'dir');
}
