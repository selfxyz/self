// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSchemas } from '../src/node';
import { createSchemaValidator, type SchemaValidator } from '../src/validator';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

export const fixturesDir = path.join(packageRoot, 'fixtures');

export function createContractValidator(): SchemaValidator {
  return createSchemaValidator(loadSchemas(path.join(packageRoot, 'schema')));
}

/**
 * The deepest instance paths a value fails at. Empty when the value is valid. A path is left out
 * when a longer failing path starts with it, because `anyOf` and `if` also report their own level.
 */
export function failingPaths(
  validator: SchemaValidator,
  schemaId: string,
  value: unknown,
): string[] {
  const result = validator.validate(schemaId, value);
  if (result.valid) {
    return [];
  }
  const all = [...new Set(result.issues.map(issue => issue.instancePath))];
  return all
    .filter(at => !all.some(other => other.startsWith(`${at}/`)))
    .sort();
}
