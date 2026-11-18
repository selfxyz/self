// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Ajv2020 } from 'ajv/dist/2020.js';

import type { SchemaDocument } from './schemaDocument';

export interface ValidationIssue {
  readonly instancePath: string;
  readonly message: string;
}

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly issues: readonly ValidationIssue[] };

export interface SchemaValidator {
  readonly schemaIds: readonly string[];
  validate(schemaId: string, value: unknown): ValidationResult;
}

/**
 * Compiles every schema up front, so an invalid schema, an unknown keyword, a duplicate `$id`
 * or an unresolved `$ref` throws here and not at the first `validate` call.
 */
export function createSchemaValidator(
  schemas: readonly SchemaDocument[],
): SchemaValidator {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  for (const schema of schemas) {
    ajv.addSchema(schema);
  }
  const schemaIds = schemas.map(schema => schema.$id);
  for (const schemaId of schemaIds) {
    ajv.getSchema(schemaId);
  }

  return {
    schemaIds,
    validate(schemaId, value) {
      const compiled = ajv.getSchema(schemaId);
      if (!compiled) {
        throw new Error(`Unknown schema id: ${schemaId}`);
      }
      if (compiled(value)) {
        return { valid: true };
      }
      return {
        valid: false,
        issues: (compiled.errors ?? []).map(error => ({
          instancePath: error.instancePath,
          message: error.message ?? error.keyword,
        })),
      };
    },
  };
}
