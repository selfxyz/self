// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createStoragePolicy,
  isValidStorageKey,
  SCHEMA_IDS,
  type StorageNamespace,
  type StoragePolicyRow,
  type StoragePolicyTable,
} from '../src';
import { createContractValidator, failingPaths, packageRoot } from './support';

const table = JSON.parse(
  readFileSync(path.join(packageRoot, 'storage', 'policy.json'), 'utf8'),
) as StoragePolicyTable;
const validator = createContractValidator();
const policy = createStoragePolicy(table);

const HASH = 'a1'.repeat(32);
const LONGEST_KEY = 'k'.repeat(128);

const tablePaths = (value: unknown) =>
  failingPaths(validator, SCHEMA_IDS.storagePolicy, value);

const withRow = (row: Record<string, unknown>) => ({
  version: 1,
  rows: [row],
});

describe('storage key (SS 5.2)', () => {
  it.each([
    'a',
    'self_mnemonic',
    'A-Z.a_z-0.9',
    `self_doc_${HASH}`,
    LONGEST_KEY,
  ])('accepts %s', key => {
    expect(isValidStorageKey(key)).toBe(true);
    expect(failingPaths(validator, SCHEMA_IDS.storageKey, key)).toEqual([]);
  });

  it.each([
    ['the empty string', ''],
    ['129 characters', `${LONGEST_KEY}k`],
    ['a space', 'self mnemonic'],
    ['a slash', 'self/doc'],
    ['a colon', 'self:doc'],
    ['a letter outside ASCII', 'self_döc'],
    ['a trailing newline', 'self_mnemonic\n'],
    ['a number', 7],
    ['null', null],
  ])('rejects %s', (_case, key) => {
    expect(isValidStorageKey(key)).toBe(false);
    expect(failingPaths(validator, SCHEMA_IDS.storageKey, key)).toEqual(['']);
  });
});

describe('storage/policy.json', () => {
  it('has the shape of bridge/storage-policy', () => {
    expect(tablePaths(table)).toEqual([]);
  });

  it('has one row above the default class: the recovery phrase', () => {
    expect(
      table.rows
        .filter(row => !row.forbidden && row.minimumProtection !== 'none')
        .map(({ namespace, pattern, minimumProtection }) => ({
          namespace,
          pattern,
          minimumProtection,
        })),
    ).toEqual([
      {
        namespace: 'web',
        pattern: 'self_mnemonic',
        minimumProtection: 'userPresence',
      },
    ]);
  });

  it('forbids one key name: self_private_key', () => {
    expect(
      table.rows
        .filter(row => row.forbidden)
        .map(row => `${row.namespace}:${row.pattern}`),
    ).toEqual(['web:self_private_key']);
  });

  it('has no two rows with one namespace and pattern', () => {
    const names = table.rows.map(row => `${row.namespace}:${row.pattern}`);

    expect(new Set(names).size).toBe(names.length);
  });

  const KNOWN_ITEMS: [StorageNamespace, string, string][] = [
    ['web', 'self_mnemonic', 'self_mnemonic'],
    ['web', 'self_identity_address', 'self_identity_address'],
    ['web', 'self_backup_state', 'self_backup_state'],
    ['web', 'self_document_catalog', 'self_document_catalog'],
    ['web', `self_doc_${HASH}`, 'self_doc_[0-9a-f]{64}'],
    ['web', 'self_migration_legacy_1', 'self_migration_legacy_[1-4]'],
    ['web', 'self_migration_legacy_4', 'self_migration_legacy_[1-4]'],
    ['web', 'self_setting_theme', 'self_setting_[a-z0-9_]{1,64}'],
    ['native', 'migration.state', 'migration\\.state'],
    ['native', 'storage.meta', 'storage\\.meta'],
    ['native', 'cloud.google.tokens', 'cloud\\.google\\.tokens'],
    [
      'native',
      'presence.web.self_mnemonic',
      'presence\\.web\\.[A-Za-z0-9_.-]{1,128}',
    ],
    [
      'native',
      `presence.web.${LONGEST_KEY}`,
      'presence\\.web\\.[A-Za-z0-9_.-]{1,128}',
    ],
    [
      'native',
      'presence.native.migration.state',
      'presence\\.native\\.[A-Za-z0-9_.-]{1,128}',
    ],
  ];

  it.each(KNOWN_ITEMS)(
    'gives the %s key %s to exactly one row',
    (namespace, key, pattern) => {
      const decision = policy.resolve(namespace, key);
      const matching = table.rows.filter(
        row =>
          row.namespace === namespace &&
          new RegExp(`^(?:${row.pattern})$`).test(key),
      );

      expect(decision.kind).toBe('matched');
      expect(matching.map(row => row.pattern)).toEqual([pattern]);
    },
  );

  it('covers every row with a known item or the forbidden key', () => {
    const covered = new Set(KNOWN_ITEMS.map(([, , pattern]) => pattern));

    expect(
      table.rows
        .filter(row => !row.forbidden)
        .map(row => row.pattern)
        .filter(pattern => !covered.has(pattern)),
    ).toEqual([]);
  });
});

describe('resolve', () => {
  it('forces user presence for the recovery phrase', () => {
    expect(policy.resolve('web', 'self_mnemonic')).toMatchObject({
      kind: 'matched',
      minimumProtection: 'userPresence',
    });
  });

  it('refuses self_private_key', () => {
    expect(policy.resolve('web', 'self_private_key').kind).toBe('forbidden');
  });

  it.each(['self_document_catalog', `self_doc_${HASH}`, 'self_setting_theme'])(
    'stores %s at the device class',
    key => {
      expect(policy.resolve('web', key)).toMatchObject({
        kind: 'matched',
        minimumProtection: 'none',
      });
    },
  );

  it.each([
    'self_keychain_debug',
    'self_doc_passport-X1234567',
    'self_mnemonic_2',
    'self_private_key_2',
    'migration.state',
  ])('gives the default class to the web key %s, which no row matches', key => {
    expect(policy.resolve('web', key)).toEqual({
      kind: 'unmatched',
      minimumProtection: 'none',
    });
  });

  it.each([
    ['empty', ''],
    ['too long', `${LONGEST_KEY}k`],
    ['with a character outside the set', 'self_doc_a/b'],
    ['the phrase key with a trailing newline', 'self_mnemonic\n'],
    ['the forbidden key with a trailing newline', 'self_private_key\n'],
  ])('reports a web key that is %s as invalid', (_case, key) => {
    expect(policy.resolve('web', key)).toEqual({ kind: 'invalid' });
  });

  it('keeps the namespaces apart', () => {
    expect(policy.resolve('native', 'self_mnemonic').kind).toBe('unmatched');
    expect(policy.resolve('native', 'self_private_key').kind).toBe('unmatched');
    expect(policy.resolve('native', 'migration.state').kind).toBe('matched');
  });

  it('does not apply the 128 character limit in the native namespace', () => {
    expect(policy.resolve('native', `presence.web.${LONGEST_KEY}`).kind).toBe(
      'matched',
    );
    expect(policy.resolve('native', 'storage meta')).toEqual({
      kind: 'invalid',
    });
  });

  it('takes the first matching row', () => {
    const ordered = createStoragePolicy({
      version: 1,
      rows: [
        { namespace: 'web', pattern: 'self_secret', forbidden: true },
        {
          namespace: 'web',
          pattern: 'self_[a-z]{1,16}',
          minimumProtection: 'none',
        },
      ],
    });

    expect(ordered.resolve('web', 'self_secret').kind).toBe('forbidden');
    expect(ordered.resolve('web', 'self_other').kind).toBe('matched');
  });
});

describe('key-pattern list (SS 5.2)', () => {
  it('is the web rows that are not forbidden, in table order', () => {
    expect(policy.webKeyPatterns).toEqual([
      'self_mnemonic',
      'self_identity_address',
      'self_backup_state',
      'self_document_catalog',
      'self_doc_[0-9a-f]{64}',
      'self_migration_legacy_[1-4]',
      'self_setting_[a-z0-9_]{1,64}',
    ]);
  });

  it.each([
    'self_mnemonic',
    'self_identity_address',
    'self_backup_state',
    'self_document_catalog',
    `self_doc_${HASH}`,
    'self_migration_legacy_3',
    'self_setting_a',
    `self_setting_${'s'.repeat(64)}`,
  ])('allows %s', key => {
    expect(policy.isAllowedWebKey(key)).toBe(true);
  });

  it.each([
    ['the forbidden key', 'self_private_key'],
    ['a document id with a passport number', 'self_doc_passport-X1234567'],
    ['a document id in upper case', `self_doc_${HASH.toUpperCase()}`],
    ['a document id of 63 digits', `self_doc_${HASH.slice(1)}`],
    ['a document id of 65 digits', `self_doc_${HASH}a`],
    ['a document id that is not hex', `self_doc_${'g'.repeat(64)}`],
    ['a document key with no id', 'self_doc_'],
    ['legacy slot 0', 'self_migration_legacy_0'],
    ['legacy slot 5', 'self_migration_legacy_5'],
    ['legacy slot 10', 'self_migration_legacy_10'],
    ['a setting with no name', 'self_setting_'],
    ['a setting name in upper case', 'self_setting_Theme'],
    ['a setting name of 65 characters', `self_setting_${'s'.repeat(65)}`],
    ['a key with a suffix', 'self_mnemonic.bak'],
    ['a key with a prefix', 'x_self_mnemonic'],
    ['a debug key', 'self_keychain_debug'],
    ['a native key', 'migration.state'],
    ['a key that fails the key rule', 'self_mnemonic\n'],
    ['the empty string', ''],
  ])('does not allow %s', (_case, key) => {
    expect(policy.isAllowedWebKey(key)).toBe(false);
  });

  it('allows only keys that pass the key rule', () => {
    const longest: Record<string, string> = {
      'self_doc_[0-9a-f]{64}': `self_doc_${HASH}`,
      'self_migration_legacy_[1-4]': 'self_migration_legacy_4',
      'self_setting_[a-z0-9_]{1,64}': `self_setting_${'s'.repeat(64)}`,
    };

    for (const pattern of policy.webKeyPatterns) {
      const key = longest[pattern] ?? pattern;

      expect(new RegExp(`^(?:${pattern})$`).test(key)).toBe(true);
      expect(isValidStorageKey(key)).toBe(true);
    }
  });
});

describe('bridge/storage-policy', () => {
  const classRow = {
    namespace: 'web',
    pattern: 'self_x',
    minimumProtection: 'none',
  };

  it.each([
    ['a class row', classRow],
    ['a forbidden row', { namespace: 'web', pattern: 'x', forbidden: true }],
    ['a row with an item text', { ...classRow, item: 'A thing' }],
    ['a native row', { ...classRow, namespace: 'native' }],
    ['an escaped dot', { ...classRow, pattern: 'a\\.b' }],
    ['a counted class', { ...classRow, pattern: 'a_[0-9a-f]{2,4}' }],
  ])('accepts %s', (_case, row) => {
    expect(tablePaths(withRow(row))).toEqual([]);
  });

  it.each([
    ['no class and not forbidden', { namespace: 'web', pattern: 'x' }],
    ['a class and forbidden', { ...classRow, forbidden: true }],
    ['forbidden: false', { namespace: 'web', pattern: 'x', forbidden: false }],
    ['an unknown class', { ...classRow, minimumProtection: 'biometric' }],
    ['an unknown namespace', { ...classRow, namespace: 'host' }],
    ['no namespace', { pattern: 'x', minimumProtection: 'none' }],
    ['an unknown field', { ...classRow, maximumProtection: 'none' }],
    ['an empty pattern', { ...classRow, pattern: '' }],
    ['an anchored pattern', { ...classRow, pattern: '^self_x$' }],
    ['an unescaped dot', { ...classRow, pattern: 'a.b' }],
    ['a shorthand class', { ...classRow, pattern: 'a\\d' }],
    ['an alternation', { ...classRow, pattern: 'a|b' }],
    ['a star', { ...classRow, pattern: '[a-z]*' }],
    ['a count on a literal', { ...classRow, pattern: 'a{2}' }],
  ])('rejects a row with %s', (_case, row) => {
    expect(tablePaths(withRow(row))).not.toEqual([]);
  });

  it.each([
    ['another version', { version: 2, rows: [classRow] }],
    ['no version', { rows: [classRow] }],
    ['no rows', { version: 1, rows: [] }],
    ['an unknown field', { version: 1, rows: [classRow], defaults: {} }],
  ])('rejects a table with %s', (_case, value) => {
    expect(tablePaths(value)).not.toEqual([]);
  });
});

describe('createStoragePolicy', () => {
  it('refuses a version it does not know', () => {
    expect(() => createStoragePolicy({ ...table, version: 2 })).toThrow(
      /Unknown storage policy version: 2/,
    );
  });

  it.each(['^self_x$', 'a.b', 'a\\d', 'a|b', '[a-z]*', '(a)'])(
    'refuses the pattern %s, as the schema does',
    pattern => {
      const row: StoragePolicyRow = {
        namespace: 'web',
        pattern,
        minimumProtection: 'none',
      };

      expect(() => createStoragePolicy({ version: 1, rows: [row] })).toThrow(
        /pattern not supported/,
      );
      expect(tablePaths(withRow({ ...row }))).not.toEqual([]);
    },
  );
});
