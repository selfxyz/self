// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { SCHEMA_DIALECT, type SchemaDocument } from '../src';
import { createSchemaValidator } from '../src/validator';

const point: SchemaDocument = {
  $schema: SCHEMA_DIALECT,
  $id: 'test/point',
  type: 'object',
  required: ['x'],
  properties: { x: { type: 'number' } },
};

const line: SchemaDocument = {
  $schema: SCHEMA_DIALECT,
  $id: 'test/line',
  type: 'object',
  required: ['from'],
  properties: { from: { $ref: 'point' } },
};

describe('createSchemaValidator', () => {
  it('accepts a value that matches the schema', () => {
    expect(
      createSchemaValidator([point]).validate('test/point', { x: 1 }),
    ).toEqual({ valid: true });
  });

  it('rejects a value and reports where it fails', () => {
    const result = createSchemaValidator([point]).validate('test/point', {
      x: 'one',
    });

    expect(result).toEqual({
      valid: false,
      issues: [{ instancePath: '/x', message: 'must be number' }],
    });
  });

  it('resolves a reference to another schema file', () => {
    const validator = createSchemaValidator([line, point]);

    expect(validator.validate('test/line', { from: { x: 1 } }).valid).toBe(
      true,
    );
    expect(validator.validate('test/line', { from: {} }).valid).toBe(false);
  });

  it('throws at creation for a reference that no schema provides', () => {
    expect(() => createSchemaValidator([line])).toThrow(/point/);
  });

  it('throws at creation for an unknown keyword', () => {
    expect(() => createSchemaValidator([{ ...point, typo: true }])).toThrow(
      /typo/,
    );
  });

  it('throws at creation for two schemas with one $id', () => {
    expect(() => createSchemaValidator([point, point])).toThrow(/test\/point/);
  });

  it('throws for a schema id it does not hold', () => {
    expect(() =>
      createSchemaValidator([point]).validate('test/missing', {}),
    ).toThrow('Unknown schema id: test/missing');
  });
});
