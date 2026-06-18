#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('node:child_process');

// Centralizes per-task workspace exclusions for the Turbo-orchestrated root
// scripts. Turbo has no "exclude package from a task" field in turbo.json —
// package selection is CLI-only — so the exclusion lists live here instead of
// inline in package.json, keeping the root scripts thin. Turbo still owns task
// ordering, caching, inputs, and outputs; this only selects which workspaces run.
//
// - Gradle/native packages (kmp-*) are excluded from JS tasks and run via their
//   dedicated kmp:* scripts.
// - build/types exclusions mirror the pre-Turbo `pnpm -r --filter "!..."` scopes.
const EXCLUSIONS = {
  build: [
    '@selfxyz/contracts',
    '@selfxyz/circuits',
    'mobile-sdk-demo',
    '@selfxyz/kmp-sdk',
    '@selfxyz/kmp-sdk-test-app',
  ],
  types: ['@selfxyz/contracts', '@selfxyz/common', '@selfxyz/mobile-app'],
  test: ['@selfxyz/kmp-sdk', '@selfxyz/kmp-sdk-test-app'],
  lint: ['@selfxyz/kmp-sdk', '@selfxyz/kmp-sdk-test-app'],
};

const task = process.argv[2];
if (!task) {
  console.error('usage: turbo-tasks.cjs <task> [extra turbo args]');
  process.exit(1);
}

const filters = (EXCLUSIONS[task] ?? []).flatMap((pkg) => ['--filter', `!${pkg}`]);
const extraArgs = process.argv.slice(3);

// Invoke via `pnpm exec` so turbo resolves whether this runs through a pnpm
// script (which injects node_modules/.bin) or directly as `node scripts/...`.
const result = spawnSync('pnpm', ['exec', 'turbo', 'run', task, ...filters, ...extraArgs], {
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
