#!/usr/bin/env node
import { execSync } from 'node:child_process';

const workspace = process.argv[2];
if (!workspace) {
  console.error('Usage: build-deps-if-changed <workspace>');
  process.exit(1);
}

const baseRef = process.env.GITHUB_BASE_REF
  ? `origin/${process.env.GITHUB_BASE_REF}`
  : 'origin/dev';
let diff;
try {
  diff = execSync(`git diff --name-only ${baseRef}...HEAD`, {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
} catch {
  diff = [];
}

const deps =
  {
    '@selfxyz/mobile-app': [
      ['@selfxyz/common', 'common/'],
      ['@selfxyz/mobile-sdk-alpha', 'packages/mobile-sdk-alpha/'],
    ],
    '@selfxyz/mobile-sdk-alpha': [['@selfxyz/common', 'common/']],
  }[workspace] || [];

for (const [pkg, dir] of deps) {
  const changed = diff.some(f => f.startsWith(dir));
  if (changed) {
    console.log(`Building ${pkg}...`);
    execSync(`yarn workspace ${pkg} build`, { stdio: 'inherit' });
  } else {
    console.log(`Skipping ${pkg}; no changes`);
  }
}
