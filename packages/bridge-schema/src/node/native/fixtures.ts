// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { GenerationTarget } from '../generate';
import { loadFixtures } from '../loadFixtures';

/**
 * Where the fixture copies go, relative to the repository root. The generator owns each directory.
 * A native test cannot read `packages/bridge-schema/fixtures`: SwiftPM takes test resources from
 * inside its package only.
 */
export const FIXTURE_OUTPUT_DIRS = {
  kotlin: 'packages/native-sdk-android/src/test/resources/bridge-fixtures',
  swift: 'packages/native-sdk-ios/Tests/SelfSdkTests/Fixtures',
} as const;

/** One target per native package. Each copies every fixture file, byte for byte. */
export function createFixtureTargets(fixturesDir: string): GenerationTarget[] {
  const emitTo = (dir: string) => () =>
    // loadFixtures throws for a file that is misplaced or does not have the fixture shape.
    loadFixtures(fixturesDir).map(fixture => ({
      path: `${dir}/${fixture.name}.json`,
      content: readFileSync(
        path.join(fixturesDir, `${fixture.name}.json`),
        'utf8',
      ),
    }));

  return [
    {
      name: 'kotlin-fixtures',
      ownedDirs: [FIXTURE_OUTPUT_DIRS.kotlin],
      emit: emitTo(FIXTURE_OUTPUT_DIRS.kotlin),
    },
    {
      name: 'swift-fixtures',
      ownedDirs: [FIXTURE_OUTPUT_DIRS.swift],
      emit: emitTo(FIXTURE_OUTPUT_DIRS.swift),
    },
  ];
}
