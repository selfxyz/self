#!/usr/bin/env node
'use strict';

// @types/react-native-web declares `"react-native": "*"`. Left unconstrained,
// that wildcard resolves to the latest published react-native, installing a
// second copy that diverges from the app's pinned version (Haste collisions,
// type drift). The root `resolutions` entry pins it to the app's exact RN so
// the two dedupe onto a single copy. This guard keeps that pin honest: bump RN
// in app/package.json and the resolution must move with it, or CI fails here.

const fs = require('fs');
const path = require('path');

const RES_KEY = '@types/react-native-web/react-native';
const root = path.resolve(__dirname, '..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

const rootPkg = readJson('package.json');
const appPkg = readJson('app/package.json');

const pinned = rootPkg.resolutions?.[RES_KEY];
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
    `Missing resolution "${RES_KEY}" in root package.json.\n` +
      `  Add "${RES_KEY}": "${appRN}" so @types/react-native-web does not pull a\n` +
      `  second, latest react-native via its "*" dependency.`,
  );
}

if (pinned !== appRN) {
  fail(
    `Resolution "${RES_KEY}" is "${pinned}" but app/package.json declares react-native "${appRN}".\n` +
      `  Update the resolution in root package.json to "${appRN}".`,
  );
}

console.log(
  `✅ rn-types pin check: "${RES_KEY}" matches app react-native (${appRN}).`,
);
