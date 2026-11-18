// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export const SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema';

export interface SchemaDocument {
  readonly $schema: typeof SCHEMA_DIALECT;
  readonly $id: string;
  readonly [keyword: string]: unknown;
}
