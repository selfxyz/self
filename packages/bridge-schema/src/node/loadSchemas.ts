// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { SCHEMA_DIALECT, type SchemaDocument } from '../schemaDocument';

function findJsonFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function parseSchemaFile(filePath: string): SchemaDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (cause) {
    throw new Error(`${filePath}: not valid JSON`, { cause });
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${filePath}: a schema file must hold a JSON object`);
  }
  const { $schema, $id } = parsed as Record<string, unknown>;
  if ($schema !== SCHEMA_DIALECT) {
    throw new Error(`${filePath}: "$schema" must be "${SCHEMA_DIALECT}"`);
  }
  if (typeof $id !== 'string' || $id.length === 0) {
    throw new Error(`${filePath}: "$id" must be a non-empty string`);
  }
  return parsed as SchemaDocument;
}

export function loadSchemas(schemaDir: string): SchemaDocument[] {
  return findJsonFiles(schemaDir).map(parseSchemaFile);
}
