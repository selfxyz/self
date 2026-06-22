#!/usr/bin/env node
'use strict';

// @types/react-native-web declares `"react-native": "*"`. Left unconstrained,
// that wildcard resolves to the latest published react-native, installing a
// second copy that diverges from the app's pinned version (Haste collisions,
// type drift). Under pnpm the global `react-native` override in
// pnpm-workspace.yaml rewrites every react-native spec — including that `*` —
// to the app's exact version, so the two dedupe onto a single copy. This guard
// keeps that override honest: bump RN in app/package.json and the override must
// move with it, or CI fails here.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

const appPkg = readJson('app/package.json');
const workspaceYaml = fs.readFileSync(
  path.join(root, 'pnpm-workspace.yaml'),
  'utf8',
);

// Match the `react-native:` override line, not react-native-* siblings.
const overrideMatch = workspaceYaml.match(/^\s+react-native:\s*(\S+)\s*$/m);
const pinned = overrideMatch?.[1];
const appRN =
  appPkg.dependencies?.['react-native'] ??
  appPkg.devDependencies?.['react-native'];

const fail = msg => {
  console.error(`❌ rn-types pin check failed:\n  ${msg}\n`);
  process.exit(1);
};

if (!appRN) {
  fail('Could not find react-native in app/package.json dependencies.');
}

if (!pinned) {
  fail(
    `Missing "react-native" override in pnpm-workspace.yaml.\n` +
      `  Add "react-native: ${appRN}" under overrides so @types/react-native-web\n` +
      `  does not pull a second, latest react-native via its "*" dependency.`,
  );
}

if (pinned !== appRN) {
  fail(
    `pnpm-workspace.yaml override "react-native: ${pinned}" but app/package.json declares react-native "${appRN}".\n` +
      `  Update the override in pnpm-workspace.yaml to "${appRN}".`,
  );
}

console.log(
  `✅ rn-types pin check: pnpm-workspace.yaml react-native override matches app react-native (${appRN}).`,
);
