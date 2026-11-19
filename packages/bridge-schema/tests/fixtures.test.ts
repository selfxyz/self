// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import {
  fixtureGroup,
  type FixtureJson as Json,
  SCHEMA_IDS,
  stepKind,
} from '../src';
import { loadFixtures } from '../src/node';
import {
  createContractValidator,
  failingPaths,
  filledMessages,
  fixturesDir,
  messageProblems as problemsOf,
} from './support';

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

const validator = createContractValidator();
const messageProblems = (message: Json) => problemsOf(validator, message);

const inDomainList = (message: Json) =>
  validator.validate(SCHEMA_IDS.domain, message.domain).valid;

const fixtures = loadFixtures(fixturesDir);
const inGroup = (group: string) =>
  fixtures
    .filter(fixture => fixtureGroup(fixture) === group)
    .map(fixture => [fixture.name, fixture] as const);

describe('fixture files', () => {
  it('fall into the groups this package defines', () => {
    expect([...new Set(fixtures.map(fixtureGroup))].sort()).toEqual([
      'cancel',
      'envelope',
      'envelope-invalid',
      'errors',
      'handshake',
      'timeout',
      'version',
    ]);
  });

  it.each(fixtures.map(fixture => [fixture.name, fixture] as const))(
    '%s uses only the step kinds its group needs',
    (_name, fixture) => {
      const kinds = ['timeout', 'errors'].includes(fixtureGroup(fixture))
        ? ['send', 'expect', 'advance']
        : ['send', 'expect', 'native'];
      for (const step of fixture.steps) {
        expect(kinds).toContain(stepKind(step));
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
      const { sends, expects } = filledMessages(fixture);
      for (const message of [...sends, ...expects] as Json[]) {
        expect(messageProblems(message)).toEqual([]);
        expect(inDomainList(message)).toBe(true);
      }
    },
  );

  it('cover the four message kinds', () => {
    const kinds = inGroup('envelope').flatMap(([, fixture]) =>
      fixture.steps.map(step =>
        'send' in step
          ? (step.send as Json).type
          : 'expect' in step
            ? step.expect.type
            : undefined,
      ),
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
      const { sends, expects } = filledMessages(fixture);

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
      candidate => candidate.name === 'envelope-invalid/duplicate-request-id',
    );
    const requestIds = (fixture?.steps ?? [])
      .flatMap(step => ('send' in step ? [step.send as Json] : []))
      .filter(send => send.type === 'request')
      .map(send => send.id);

    expect(requestIds).toHaveLength(2);
    expect(new Set(requestIds).size).toBe(1);
  });
});
