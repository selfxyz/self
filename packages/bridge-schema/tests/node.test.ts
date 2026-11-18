// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SCHEMA_DIALECT } from '../src';
import {
  type GenerationTarget,
  generate,
  loadSchemas,
  runGenerateCli,
} from '../src/node';

let root: string;
let schemaDir: string;
let outRoot: string;

function writeSchema(relativePath: string, body: unknown): void {
  const filePath = path.join(schemaDir, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    typeof body === 'string' ? body : JSON.stringify(body),
    'utf8',
  );
}

const idList: GenerationTarget = {
  name: 'id-list',
  emit: schemas => [
    {
      path: 'out/ids.txt',
      content: schemas.map(schema => schema.$id).join('\n'),
    },
  ],
};

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'bridge-schema-'));
  schemaDir = path.join(root, 'schema');
  outRoot = path.join(root, 'repo');
  mkdirSync(schemaDir);
  mkdirSync(outRoot);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('loadSchemas', () => {
  it('returns no schema for a directory that holds none', () => {
    writeFileSync(path.join(schemaDir, '.gitkeep'), '');

    expect(loadSchemas(schemaDir)).toEqual([]);
  });

  it('reads nested schema files in path order', () => {
    writeSchema('b.json', { $schema: SCHEMA_DIALECT, $id: 'b' });
    writeSchema('a/z.json', { $schema: SCHEMA_DIALECT, $id: 'a/z' });

    expect(loadSchemas(schemaDir).map(schema => schema.$id)).toEqual([
      'a/z',
      'b',
    ]);
  });

  it.each([
    ['text that is not JSON', '{ "$id": ', /broken\.json: not valid JSON/],
    ['a JSON array', [], /broken\.json: a schema file must hold a JSON object/],
    [
      'another dialect',
      { $schema: 'http://json-schema.org/draft-07/schema#', $id: 'x' },
      /broken\.json: "\$schema" must be/,
    ],
    ['no $id', { $schema: SCHEMA_DIALECT }, /broken\.json: "\$id" must be/],
  ])('throws and names the file for %s', (_case, body, message) => {
    writeSchema('broken.json', body);

    expect(() => loadSchemas(schemaDir)).toThrow(message);
  });
});

describe('generate', () => {
  beforeEach(() => {
    writeSchema('point.json', {
      $schema: SCHEMA_DIALECT,
      $id: 'point',
      type: 'object',
    });
  });

  it('writes each emitted file under the output root', () => {
    const report = generate({
      schemaDir,
      outRoot,
      targets: [idList],
      check: false,
    });

    expect(report).toEqual({
      files: ['out/ids.txt'],
      changed: ['out/ids.txt'],
    });
    expect(readFileSync(path.join(outRoot, 'out/ids.txt'), 'utf8')).toBe(
      'point',
    );
  });

  it('reports no change on a second run', () => {
    generate({ schemaDir, outRoot, targets: [idList], check: false });

    expect(
      generate({ schemaDir, outRoot, targets: [idList], check: false }).changed,
    ).toEqual([]);
  });

  it('reports a missing file under check and does not create it', () => {
    const report = generate({
      schemaDir,
      outRoot,
      targets: [idList],
      check: true,
    });

    expect(report.changed).toEqual(['out/ids.txt']);
    expect(existsSync(path.join(outRoot, 'out/ids.txt'))).toBe(false);
  });

  it('reports a hand-edited file under check and leaves the edit in place', () => {
    generate({ schemaDir, outRoot, targets: [idList], check: false });
    writeFileSync(path.join(outRoot, 'out/ids.txt'), 'edited', 'utf8');

    expect(
      generate({ schemaDir, outRoot, targets: [idList], check: true }).changed,
    ).toEqual(['out/ids.txt']);
    expect(readFileSync(path.join(outRoot, 'out/ids.txt'), 'utf8')).toBe(
      'edited',
    );
  });

  it('refuses a path outside the output root', () => {
    const escaping: GenerationTarget = {
      name: 'escaping',
      emit: () => [{ path: '../outside.txt', content: '' }],
    };

    expect(() =>
      generate({ schemaDir, outRoot, targets: [escaping], check: false }),
    ).toThrow(/escapes the output root/);
    expect(existsSync(path.join(root, 'outside.txt'))).toBe(false);
  });

  it('refuses two targets that emit one path', () => {
    expect(() =>
      generate({ schemaDir, outRoot, targets: [idList, idList], check: false }),
    ).toThrow(/already emits/);
  });

  it('refuses a schema that does not compile, before any target runs', () => {
    writeSchema('bad.json', {
      $schema: SCHEMA_DIALECT,
      $id: 'bad',
      type: 'nothing',
    });

    expect(() =>
      generate({ schemaDir, outRoot, targets: [idList], check: false }),
    ).toThrow();
    expect(existsSync(path.join(outRoot, 'out/ids.txt'))).toBe(false);
  });
});

describe('runGenerateCli', () => {
  let lines: string[];
  const run = (args: string[]) =>
    runGenerateCli(args, {
      schemaDir,
      outRoot,
      targets: [idList],
      log: line => lines.push(line),
    });

  beforeEach(() => {
    lines = [];
    writeSchema('point.json', {
      $schema: SCHEMA_DIALECT,
      $id: 'point',
      type: 'object',
    });
  });

  it('exits 0 after writing, then 0 under --check', () => {
    expect(run([])).toBe(0);
    expect(run(['--check'])).toBe(0);
  });

  it('exits 1 under --check when a schema changed after the last write, and names the stale file', () => {
    run([]);
    writeSchema('line.json', {
      $schema: SCHEMA_DIALECT,
      $id: 'line',
      type: 'object',
    });

    expect(run(['--check'])).toBe(1);
    expect(lines.join('\n')).toContain('out/ids.txt');
  });

  it('exits 2 for an unknown argument and writes nothing', () => {
    expect(run(['--chekc'])).toBe(2);
    expect(existsSync(path.join(outRoot, 'out/ids.txt'))).toBe(false);
  });
});
