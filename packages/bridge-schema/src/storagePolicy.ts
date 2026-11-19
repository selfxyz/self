// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type StorageNamespace = 'web' | 'native';

export type StorageProtection = 'none' | 'userPresence';

interface StoragePolicyRowBase {
  readonly item?: string;
  readonly namespace: StorageNamespace;
  readonly pattern: string;
}

export interface StoragePolicyClassRow extends StoragePolicyRowBase {
  readonly minimumProtection: StorageProtection;
  readonly forbidden?: undefined;
}

export interface StoragePolicyForbiddenRow extends StoragePolicyRowBase {
  readonly forbidden: true;
  readonly minimumProtection?: undefined;
}

export type StoragePolicyRow =
  | StoragePolicyClassRow
  | StoragePolicyForbiddenRow;

/** The content of `storage/policy.json`, as `bridge/storage-policy` describes it. */
export interface StoragePolicyTable {
  readonly version: number;
  readonly rows: readonly StoragePolicyRow[];
}

export type StoragePolicyDecision =
  | { readonly kind: 'invalid' }
  | { readonly kind: 'forbidden'; readonly row: StoragePolicyForbiddenRow }
  | {
      readonly kind: 'matched';
      readonly minimumProtection: StorageProtection;
      readonly row: StoragePolicyClassRow;
    }
  | {
      readonly kind: 'unmatched';
      readonly minimumProtection: typeof STORAGE_DEFAULT_PROTECTION;
    };

export interface StoragePolicy {
  /** What the storage layer does with a key: refuse it, or store it at no less than a class. */
  resolve(namespace: StorageNamespace, key: string): StoragePolicyDecision;
  /** The check of the web's storage adapter (SS 5.2): the key matches a web row that is not forbidden. */
  isAllowedWebKey(key: string): boolean;
  /** The key-pattern list: the patterns `isAllowedWebKey` accepts, in table order. */
  readonly webKeyPatterns: readonly string[];
}

/** The class of a key that no row matches (BC 8.2). */
export const STORAGE_DEFAULT_PROTECTION = 'none';

export const STORAGE_KEY_MAX_LENGTH = 128;

export const STORAGE_POLICY_VERSION = 1;

const KEY_CHARACTERS = /^[A-Za-z0-9_.-]+$/;

const PORTABLE_PATTERN =
  /^(?:[A-Za-z0-9_-]|\\\.|\[[A-Za-z0-9_.-]+\](?:\{[0-9]+(?:,[0-9]+)?\})?)+$/;

/** The key rule of SS 5.2. It applies to every key that crosses the bridge. */
export function isValidStorageKey(key: unknown): key is string {
  return (
    typeof key === 'string' &&
    key.length <= STORAGE_KEY_MAX_LENGTH &&
    KEY_CHARACTERS.test(key)
  );
}

/**
 * Compiles a policy table. Throws for a version or a pattern it does not know, so that a
 * reader never applies part of a table.
 */
export function createStoragePolicy(table: StoragePolicyTable): StoragePolicy {
  if (table.version !== STORAGE_POLICY_VERSION) {
    throw new Error(`Unknown storage policy version: ${String(table.version)}`);
  }
  const rows = table.rows.map(row => {
    if (!PORTABLE_PATTERN.test(row.pattern)) {
      throw new Error(`Storage policy pattern not supported: ${row.pattern}`);
    }
    return { row, matches: new RegExp(`^(?:${row.pattern})$`) };
  });

  const resolve = (
    namespace: StorageNamespace,
    key: string,
  ): StoragePolicyDecision => {
    const wellFormed =
      namespace === 'web'
        ? isValidStorageKey(key)
        : typeof key === 'string' && KEY_CHARACTERS.test(key);
    if (!wellFormed) {
      return { kind: 'invalid' };
    }
    const found = rows.find(
      ({ row, matches }) => row.namespace === namespace && matches.test(key),
    )?.row;
    if (!found) {
      return {
        kind: 'unmatched',
        minimumProtection: STORAGE_DEFAULT_PROTECTION,
      };
    }
    return found.forbidden
      ? { kind: 'forbidden', row: found }
      : {
          kind: 'matched',
          minimumProtection: found.minimumProtection,
          row: found,
        };
  };

  return {
    resolve,
    isAllowedWebKey: key => resolve('web', key).kind === 'matched',
    webKeyPatterns: table.rows
      .filter(row => row.namespace === 'web' && !row.forbidden)
      .map(row => row.pattern),
  };
}
