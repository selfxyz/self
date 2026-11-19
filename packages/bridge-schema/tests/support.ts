// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  completeExpect,
  createLabelBinder,
  fillPlaceholders,
  type Fixture,
  type FixtureJson as Json,
  type FixtureStep,
  SCHEMA_IDS,
} from '../src';
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

const SCHEMA_BY_TYPE: Record<string, string> = {
  request: SCHEMA_IDS.request,
  response: SCHEMA_IDS.response,
  event: SCHEMA_IDS.event,
  cancel: SCHEMA_IDS.cancel,
};

/** The steps of a fixture with every placeholder filled and every `expect` completed. */
export function filledSteps(fixture: Fixture): FixtureStep[] {
  return fillPlaceholders(fixture.steps, {
    idFor: createLabelBinder(randomUUID),
    timestamp: 1794650000000,
  }).map(step =>
    'expect' in step
      ? {
          expect: completeExpect(step.expect, {
            id: randomUUID(),
            timestamp: 1794650000000,
            errorMessage: 'for logs',
          }),
        }
      : step,
  );
}

/** The messages of a fixture as a runner validates them (BC 11.2), split by direction. */
export function filledMessages(fixture: Fixture): {
  sends: (Json | string)[];
  expects: Json[];
} {
  const steps = filledSteps(fixture);
  return {
    sends: steps.flatMap(step => ('send' in step ? [step.send] : [])),
    expects: steps.flatMap(step => ('expect' in step ? [step.expect] : [])),
  };
}

export function messageProblems(
  validator: SchemaValidator,
  message: Json,
): string[] {
  const schemaId = SCHEMA_BY_TYPE[String(message.type)];
  if (!schemaId) {
    return [`unknown message type ${String(message.type)}`];
  }
  return failingPaths(validator, schemaId, message).map(
    at => `${schemaId} fails at "${at}"`,
  );
}
