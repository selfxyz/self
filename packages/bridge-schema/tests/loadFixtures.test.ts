// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadFixtures } from '../src/node';
import { fixturesDir } from './support';

const fixtureNamed = (name: string) => ({
  name,
  given: { capabilities: 'full' },
  steps: [{ advance: 2000 }],
});

describe('loadFixtures', () => {
  let dir: string;
  const write = (relativePath: string, content: unknown) => {
    const filePath = path.join(dir, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(
      filePath,
      typeof content === 'string' ? content : JSON.stringify(content),
    );
  };

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'bridge-fixtures-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('loads every fixture of every group, in a fixed order', () => {
    write('timeout/web-owned.json', fixtureNamed('timeout/web-owned'));
    write('timeout/native-owned.json', fixtureNamed('timeout/native-owned'));
    write('cancel/two-cancels.json', fixtureNamed('cancel/two-cancels'));

    expect(loadFixtures(dir)).toEqual([
      fixtureNamed('cancel/two-cancels'),
      fixtureNamed('timeout/native-owned'),
      fixtureNamed('timeout/web-owned'),
    ]);
  });

  it('rejects a fixture whose name is not its path', () => {
    write('timeout/native-owned.json', fixtureNamed('cancel/native-owned'));

    expect(() => loadFixtures(dir)).toThrowError(
      'native-owned.json: name must be "timeout/native-owned"',
    );
  });

  it('rejects a file beside the group directories', () => {
    write('stray.json', fixtureNamed('timeout/stray'));

    expect(() => loadFixtures(dir)).toThrowError(
      'stray.json: expected a group directory',
    );
  });

  it('rejects a file that is not a .json fixture, and a nested directory', () => {
    write('timeout/notes.md', 'notes');
    expect(() => loadFixtures(dir)).toThrowError(
      'notes.md: expected a .json fixture file',
    );

    rmSync(path.join(dir, 'timeout'), { recursive: true });
    write('timeout/nested/case.json', fixtureNamed('timeout/case'));
    expect(() => loadFixtures(dir)).toThrowError(
      'nested: expected a .json fixture file',
    );
  });

  it('rejects text that is not JSON and names the file', () => {
    write('timeout/native-owned.json', '{ "name": ');

    expect(() => loadFixtures(dir)).toThrowError(
      'native-owned.json: not valid JSON',
    );
  });

  it('rejects a file that does not have the fixture shape and names the file', () => {
    write('timeout/native-owned.json', {
      ...fixtureNamed('timeout/native-owned'),
      steps: [{ wait: 2000 }],
    });

    expect(() => loadFixtures(dir)).toThrowError(
      /native-owned\.json: steps\[0\] must hold exactly one of/,
    );
  });
});

describe('the fixtures of this package', () => {
  const fixtures = loadFixtures(fixturesDir);

  it('all load', () => {
    const files = readdirSync(fixturesDir).flatMap(group =>
      readdirSync(path.join(fixturesDir, group)).map(
        file => `${group}/${path.basename(file, '.json')}`,
      ),
    );

    expect(files.length).toBeGreaterThan(0);
    expect(fixtures.map(fixture => fixture.name).sort()).toEqual(files.sort());
  });

  it.each(fixtures.map(fixture => [fixture.name, fixture] as const))(
    '%s loads as the JSON of its file, with nothing added or removed',
    (name, fixture) => {
      expect(fixture).toEqual(
        JSON.parse(
          readFileSync(path.join(fixturesDir, `${name}.json`), 'utf8'),
        ),
      );
    },
  );
});
