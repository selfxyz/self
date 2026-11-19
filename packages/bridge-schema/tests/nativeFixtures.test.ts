// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createFixtureTargets,
  FIXTURE_OUTPUT_DIRS,
  generate,
  loadFixtures,
} from '../src/node';
import { fixturesDir, packageRoot } from './support';

const repoRoot = path.resolve(packageRoot, '..', '..');
const schemaDir = path.join(packageRoot, 'schema');

describe('the fixture copies in the native packages', () => {
  it('are the fixture files as they stand, and nothing else', () => {
    const report = generate({
      schemaDir,
      outRoot: repoRoot,
      targets: createFixtureTargets(fixturesDir),
      check: true,
    });

    expect(report.changed).toEqual([]);
    expect(report.files).toHaveLength(loadFixtures(fixturesDir).length * 2);
  });

  it('keep the <group>/<case>.json layout and the bytes of the source', () => {
    const source = readFileSync(
      path.join(fixturesDir, 'envelope', 'unknown-fields.json'),
      'utf8',
    );

    for (const target of createFixtureTargets(fixturesDir)) {
      const dir = target.ownedDirs?.[0];
      const copy = target
        .emit([])
        .find(file => file.path === `${dir}/envelope/unknown-fields.json`);

      expect(copy?.content, target.name).toBe(source);
    }
  });

  it('go to a directory of their own inside each native package', () => {
    expect(FIXTURE_OUTPUT_DIRS.kotlin).toBe(
      'packages/native-sdk-android/src/test/resources/bridge-fixtures',
    );
    expect(FIXTURE_OUTPUT_DIRS.swift).toBe(
      'packages/native-sdk-ios/Tests/SelfSdkTests/Fixtures',
    );
  });
});
