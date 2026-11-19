// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { type Fixture, parseFixture } from '../fixture';

function loadFixtureFile(filePath: string, expectedName: string): Fixture {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (cause) {
    throw new Error(`${filePath}: not valid JSON`, { cause });
  }
  const fixture = parseFixture(parsed, filePath);
  if (fixture.name !== expectedName) {
    throw new Error(
      `${filePath}: name must be "${expectedName}", the path of the file`,
    );
  }
  return fixture;
}

/**
 * Reads every fixture under `fixturesDir`, laid out as `<group>/<case>.json`, group by group.
 * Throws on the first file that is misplaced, is not JSON or does not have the fixture shape.
 */
export function loadFixtures(fixturesDir: string): Fixture[] {
  const fixtures: Fixture[] = [];
  const groups = readdirSync(fixturesDir, { withFileTypes: true }).sort(
    (a, b) => (a.name < b.name ? -1 : 1),
  );
  for (const group of groups) {
    const groupDir = path.join(fixturesDir, group.name);
    if (!group.isDirectory()) {
      throw new Error(`${groupDir}: expected a group directory`);
    }
    for (const file of readdirSync(groupDir, { withFileTypes: true }).sort(
      (a, b) => (a.name < b.name ? -1 : 1),
    )) {
      const filePath = path.join(groupDir, file.name);
      if (!file.isFile() || !file.name.endsWith('.json')) {
        throw new Error(`${filePath}: expected a .json fixture file`);
      }
      fixtures.push(
        loadFixtureFile(
          filePath,
          `${group.name}/${path.basename(file.name, '.json')}`,
        ),
      );
    }
  }
  return fixtures;
}
