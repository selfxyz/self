// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SCHEMA_IDS } from '../src';
import { createContractValidator, failingPaths, fixturesDir } from './support';

type Json = Record<string, unknown>;

interface Fixture {
  readonly group: string;
  readonly file: string;
  readonly name: unknown;
  readonly steps: readonly Json[];
}

type SendProblem =
  /** The body is text that is not JSON, or JSON that is not an object. Native drops it. */
  | { readonly raw: 'not-json' | 'not-an-object' }
  /** The request fails the request schema only because this required field is absent. */
  | { readonly missing: string }
  /** The request fails the request schema at exactly these instance paths. */
  | { readonly failsAt: readonly string[] }
  /** The request passes the request schema and its domain is not in the domain list. */
  | { readonly unknownDomain: true }
  /** Every message passes the schema. The fixture is invalid for a reason the schema cannot see. */
  | { readonly schemaValid: true };

const SEND_PROBLEMS: Record<string, SendProblem> = {
  'envelope-invalid/not-json': { raw: 'not-json' },
  'envelope-invalid/not-an-object': { raw: 'not-an-object' },
  'envelope-invalid/missing-id': { missing: 'id' },
  'envelope-invalid/missing-method': { missing: 'method' },
  'envelope-invalid/missing-params': { missing: 'params' },
  'envelope-invalid/method-wrong-type': { failsAt: ['/method'] },
  'envelope-invalid/timestamp-wrong-type': { failsAt: ['/timestamp'] },
  'envelope-invalid/params-array': { failsAt: ['/params'] },
  'envelope-invalid/params-null': { failsAt: ['/params'] },
  'envelope-invalid/unknown-domain': { unknownDomain: true },
  'envelope-invalid/unknown-method': { schemaValid: true },
  'envelope-invalid/duplicate-request-id': { schemaValid: true },
};

const SCHEMA_BY_TYPE: Record<string, string> = {
  request: SCHEMA_IDS.request,
  response: SCHEMA_IDS.response,
  event: SCHEMA_IDS.event,
  cancel: SCHEMA_IDS.cancel,
};

const validator = createContractValidator();

function loadFixtures(): Fixture[] {
  const fixtures: Fixture[] = [];
  for (const group of readdirSync(fixturesDir, { withFileTypes: true })) {
    if (!group.isDirectory()) {
      throw new Error(`fixtures/${group.name}: expected a group directory`);
    }
    for (const file of readdirSync(path.join(fixturesDir, group.name)).sort()) {
      const parsed = JSON.parse(
        readFileSync(path.join(fixturesDir, group.name, file), 'utf8'),
      ) as { name: unknown; steps: Json[] };
      fixtures.push({
        group: group.name,
        file: `${group.name}/${path.basename(file, '.json')}`,
        name: parsed.name,
        steps: parsed.steps,
      });
    }
  }
  return fixtures;
}

/**
 * Fills the placeholders of BC 11.1: an id label becomes a UUID, the same one wherever the label
 * appears, and an `expect` gains the fields a runner does not compare.
 */
function fillPlaceholders(steps: readonly Json[]): Json[] {
  const ids = new Map<string, string>();
  const idFor = (label: string) => {
    const id = ids.get(label) ?? randomUUID();
    ids.set(label, id);
    return id;
  };
  const swapLabel = (message: Json, field: string) =>
    typeof message[field] === 'string'
      ? { [field]: idFor(message[field]) }
      : {};

  return steps.map(step => {
    if (typeof step.send === 'object' && step.send !== null) {
      const send = step.send as Json;
      return {
        send: {
          ...send,
          ...swapLabel(send, 'id'),
          ...swapLabel(send, 'requestId'),
          ...(send.timestamp === 0 ? { timestamp: 1794650000000 } : {}),
        },
      };
    }
    if (step.expect !== undefined) {
      const expected = step.expect as Json;
      const error = expected.error as Json | null | undefined;
      return {
        expect: {
          id: randomUUID(),
          timestamp: 1794650000000,
          ...expected,
          ...swapLabel(expected, 'requestId'),
          ...(error ? { error: { message: 'for logs', ...error } } : {}),
        },
      };
    }
    return step;
  });
}

function messageProblems(message: Json): string[] {
  const schemaId = SCHEMA_BY_TYPE[String(message.type)];
  if (!schemaId) {
    return [`unknown message type ${String(message.type)}`];
  }
  return failingPaths(validator, schemaId, message).map(
    at => `${schemaId} fails at "${at}"`,
  );
}

const inDomainList = (message: Json) =>
  validator.validate(SCHEMA_IDS.domain, message.domain).valid;

const fixtures = loadFixtures();
const inGroup = (group: string) =>
  fixtures
    .filter(fixture => fixture.group === group)
    .map(fixture => [fixture.file, fixture] as const);

describe('fixture files', () => {
  it('fall into the groups this package defines', () => {
    expect([...new Set(fixtures.map(fixture => fixture.group))].sort()).toEqual(
      ['envelope', 'envelope-invalid'],
    );
  });

  it.each(fixtures.map(fixture => [fixture.file, fixture] as const))(
    '%s is named after its path and holds one action per step',
    (file, fixture) => {
      expect(fixture.name).toBe(file);
      expect(fixture.steps.length).toBeGreaterThan(0);
      for (const step of fixture.steps) {
        const keys = Object.keys(step);
        expect(keys).toHaveLength(1);
        expect(['send', 'expect', 'native']).toContain(keys[0]);
      }
    },
  );

  it('every envelope-invalid fixture states what is wrong with its input', () => {
    expect(Object.keys(SEND_PROBLEMS).sort()).toEqual(
      inGroup('envelope-invalid').map(([file]) => file),
    );
  });
});

describe('envelope fixtures', () => {
  it.each(inGroup('envelope'))(
    '%s holds only valid messages',
    (_file, fixture) => {
      for (const step of fillPlaceholders(fixture.steps)) {
        const message = (step.send ?? step.expect) as Json | undefined;
        if (message) {
          expect(messageProblems(message)).toEqual([]);
          expect(inDomainList(message)).toBe(true);
        }
      }
    },
  );

  it('cover the four message kinds', () => {
    const kinds = inGroup('envelope').flatMap(([, fixture]) =>
      fixture.steps.map(step => ((step.send ?? step.expect) as Json)?.type),
    );

    expect(new Set(kinds.filter(Boolean))).toEqual(
      new Set(['request', 'response', 'event', 'cancel']),
    );
  });
});

describe('envelope-invalid fixtures', () => {
  it.each(inGroup('envelope-invalid'))(
    '%s is invalid in the way it states, and native answers with valid messages',
    (file, fixture) => {
      const problem = SEND_PROBLEMS[file];
      const steps = fillPlaceholders(fixture.steps);
      const sends = steps.flatMap(step =>
        step.send === undefined ? [] : [step.send],
      );
      const expects = steps.flatMap(step =>
        step.expect === undefined ? [] : [step.expect as Json],
      );

      for (const expected of expects) {
        expect(messageProblems(expected)).toEqual([]);
      }

      if ('raw' in problem) {
        expect(sends).toHaveLength(1);
        expect(typeof sends[0]).toBe('string');
        let parsed: unknown;
        let parses = true;
        try {
          parsed = JSON.parse(sends[0] as string);
        } catch {
          parses = false;
        }
        expect(parses).toBe(problem.raw === 'not-an-object');
        if (parses) {
          expect(
            typeof parsed !== 'object' ||
              parsed === null ||
              Array.isArray(parsed),
          ).toBe(true);
        }
        expect(expects).toEqual([]);
        return;
      }

      const messages = sends as Json[];
      if ('missing' in problem) {
        expect(messages).toHaveLength(1);
        expect(validator.validate(SCHEMA_IDS.request, messages[0])).toEqual({
          valid: false,
          issues: [
            {
              instancePath: '',
              message: `must have required property '${problem.missing}'`,
            },
          ],
        });
        return;
      }
      if ('failsAt' in problem) {
        expect(messages).toHaveLength(1);
        expect(
          failingPaths(validator, SCHEMA_IDS.request, messages[0]),
        ).toEqual(problem.failsAt);
        return;
      }

      for (const message of messages) {
        expect(messageProblems(message)).toEqual([]);
      }
      expect(messages.every(inDomainList)).toBe(!('unknownDomain' in problem));
    },
  );

  it('the duplicate-request-id fixture sends one id twice', () => {
    const fixture = fixtures.find(
      candidate => candidate.file === 'envelope-invalid/duplicate-request-id',
    );
    const requestIds = (fixture?.steps ?? [])
      .map(step => step.send as Json | undefined)
      .filter(send => send?.type === 'request')
      .map(send => send?.id);

    expect(requestIds).toHaveLength(2);
    expect(new Set(requestIds).size).toBe(1);
  });
});
