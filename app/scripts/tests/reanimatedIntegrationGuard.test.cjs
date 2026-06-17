#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Reanimated integration guard.
//
// react-native-reanimated (v4, New Architecture) is the animation engine that
// react-native-screens (native-stack transitions) and
// react-native-gesture-handler depend on at the NATIVE level
// (RNGestureHandlerManager.sendEventForReanimated -> ReanimatedModule).
//
// A previous build tried to shim Reanimated out in JS via a Metro resolver
// route. That made gesture-handler detect Reanimated as "present" (its JS
// imports resolved) while the native pod was absent, crashing at runtime with
// "Unable to find module for ReanimatedModule". The app now adopts Reanimated
// properly. This guard asserts the integration is COMPLETE and CONSISTENT, so
// it can never regress to that half-wired state:
//   - reanimated + its mandatory worklets companion are first-class deps
//   - their versions stay mutually compatible (peer ranges) as they're bumped
//   - the JS shim stays gone (Reanimated resolves as a real package)
//   - babel-preset-expo is allowed to inject the Worklets plugin

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..', '..');
const workspaceRoot = path.resolve(appRoot, '..');
const resolvePaths = [appRoot, workspaceRoot];

const appPackageJson = JSON.parse(
  readFileSync(path.join(appRoot, 'package.json'), 'utf8'),
);

const semver = require(require.resolve('semver', { paths: resolvePaths }));

function installedPackageJson(name) {
  return require(
    require.resolve(`${name}/package.json`, { paths: resolvePaths }),
  );
}

describe('reanimated integration guard', () => {
  it('declares react-native-reanimated as a real dependency', () => {
    assert.ok(
      'react-native-reanimated' in appPackageJson.dependencies,
      'react-native-reanimated must be a declared dependency (not extraneous/' +
        'transitive) so native screens/gesture-handler resolve the real module',
    );
  });

  it('declares react-native-worklets — Reanimated 4 requires it', () => {
    assert.ok(
      'react-native-worklets' in appPackageJson.dependencies,
      'react-native-worklets is the mandatory companion for ' +
        'react-native-reanimated@>=4; without it the Worklets Babel plugin and ' +
        'native runtime are missing',
    );
  });

  it('keeps the installed worklets version inside the reanimated peer range', () => {
    const reanimated = installedPackageJson('react-native-reanimated');
    const worklets = installedPackageJson('react-native-worklets');
    const peerRange = (reanimated.peerDependencies || {})[
      'react-native-worklets'
    ];
    assert.ok(
      peerRange,
      'react-native-reanimated should declare a react-native-worklets peer range',
    );
    assert.ok(
      semver.satisfies(worklets.version, peerRange, {
        includePrerelease: true,
      }),
      `react-native-worklets@${worklets.version} does not satisfy ` +
        `react-native-reanimated@${reanimated.version} peer range ` +
        `"${peerRange}". Bump them together.`,
    );
  });

  it('keeps react-native within the reanimated peer range', () => {
    const reanimated = installedPackageJson('react-native-reanimated');
    const rn = installedPackageJson('react-native');
    const peerRange = (reanimated.peerDependencies || {})['react-native'];
    if (!peerRange) return; // not every release pins react-native
    assert.ok(
      semver.satisfies(rn.version, peerRange, { includePrerelease: true }),
      `react-native@${rn.version} does not satisfy ` +
        `react-native-reanimated@${reanimated.version} peer range "${peerRange}"`,
    );
  });

  it('has fully removed the Metro Reanimated shim', () => {
    assert.ok(
      !existsSync(path.join(appRoot, 'src/shims/react-native-reanimated.js')),
      'the react-native-reanimated shim must stay deleted — Reanimated now ' +
        'resolves as a real package',
    );
    const metroConfig = readFileSync(
      path.join(appRoot, 'metro.config.cjs'),
      'utf8',
    );
    assert.doesNotMatch(
      metroConfig,
      /shims[\\/]react-native-reanimated/,
      'metro.config.cjs must not route react-native-reanimated to a shim',
    );
  });

  it('lets babel-preset-expo inject the Worklets plugin (does not disable it)', () => {
    // babel-preset-expo auto-adds react-native-worklets/plugin when
    // react-native-worklets is installed, UNLESS worklets/reanimated are turned
    // off via preset options. We rely on that auto-injection, so the only way to
    // break it from here is to disable it — assert we don't.
    const babelConfig = require(path.join(appRoot, 'babel.config.cjs'));
    const presets = babelConfig.presets || [];
    const expoPreset = presets.find(
      preset =>
        preset === 'babel-preset-expo' ||
        (Array.isArray(preset) && preset[0] === 'babel-preset-expo'),
    );
    assert.ok(expoPreset, 'babel.config.cjs must use babel-preset-expo');
    const options = Array.isArray(expoPreset) ? expoPreset[1] || {} : {};
    assert.notStrictEqual(
      options.worklets,
      false,
      'must not pass { worklets: false } to babel-preset-expo',
    );
    assert.notStrictEqual(
      options.reanimated,
      false,
      'must not pass { reanimated: false } to babel-preset-expo',
    );
  });

  it('keeps Tamagui on the non-Reanimated animation driver', () => {
    const tamaguiConfig = readFileSync(
      path.join(appRoot, 'tamagui.config.ts'),
      'utf8',
    );
    assert.match(
      tamaguiConfig,
      /@tamagui\/config\/v3/,
      'the app should use Tamagui v3 config (animations-react-native driver)',
    );
    assert.doesNotMatch(
      tamaguiConfig,
      /reanimated|moti/,
      'Tamagui should keep the react-native driver, not switch to Reanimated/Moti',
    );
  });
});
