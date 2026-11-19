// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { type Fixture, fixtureGroup, type FixtureJson as Json } from '../src';
import { loadFixtures } from '../src/node';
import {
  createContractValidator,
  filledSteps,
  fixturesDir,
  messageProblems,
  packageRoot,
} from './support';

/** The `fail` causes that are not a `details.reason` value. See the README. */
const FAIL_CAUSES: Record<string, string> = {
  user_cancelled: 'USER_CANCELLED',
  permission_denied: 'PERMISSION_DENIED',
  unexpected_exception: 'INTERNAL_ERROR',
};

/** The handshake fixture that defines each capability setup. */
const SETUPS: Record<string, string> = {
  full: 'handshake/full',
  no_passport_module: 'handshake/no-passport-module',
  no_nfc_hardware: 'handshake/no-nfc-hardware',
  no_device_credential: 'handshake/no-device-credential',
};

const schema = (file: string) =>
  JSON.parse(
    readFileSync(path.join(packageRoot, 'schema', file), 'utf8'),
  ) as Json;
const errorDefs = (schema('error.json') as { $defs: Record<string, Json> })
  .$defs;
const REASONS: Record<string, string[]> = {
  UNSUPPORTED: errorDefs.unsupportedReason.enum as string[],
  UNAVAILABLE: errorDefs.unavailableReason.enum as string[],
  FAILED: errorDefs.failedReason.enum as string[],
};
const CODES = schema('error-code.json').enum as string[];
const codeOfReason = (reason: string) =>
  Object.keys(REASONS).find(code => REASONS[code].includes(reason));

const validator = createContractValidator();
const fixtures = loadFixtures(fixturesDir);
const byName = (name: string) => {
  const fixture = fixtures.find(candidate => candidate.name === name);
  if (!fixture) {
    throw new Error(`no fixture ${name}`);
  }
  return fixture;
};
const GROUPS = ['cancel', 'timeout', 'errors'];
const routerFixtures = fixtures
  .filter(fixture => GROUPS.includes(fixtureGroup(fixture)))
  .map(fixture => [fixture.name, fixture] as const);

const messagesOf = (fixture: Fixture) =>
  filledSteps(fixture).flatMap(step =>
    'send' in step
      ? [step.send as Json]
      : 'expect' in step
        ? [step.expect]
        : [],
  );

const capabilitiesOf = (setup: string) => {
  const answer = messagesOf(byName(SETUPS[setup])).find(
    message => message.type === 'response' && message.success === true,
  );
  return (answer?.data as Json).capabilities as Record<string, Json>;
};

const expectsOf = (fixture: Fixture) =>
  fixture.steps.flatMap(step => ('expect' in step ? [step.expect] : []));

describe.each(GROUPS)('%s group', group => {
  it('exists', () => {
    expect(routerFixtures.some(([name]) => name.startsWith(`${group}/`))).toBe(
      true,
    );
  });
});

describe('cancel, timeout and errors fixtures', () => {
  it.each(routerFixtures)('%s holds only valid messages', (_name, fixture) => {
    for (const message of messagesOf(fixture)) {
      expect(messageProblems(validator, message)).toEqual([]);
    }
  });

  it.each(routerFixtures)(
    '%s answers each request exactly once',
    (_name, fixture) => {
      const messages = messagesOf(fixture);
      for (const request of messages.filter(m => m.type === 'request')) {
        const answers = messages.filter(
          m => m.type === 'response' && m.requestId === request.id,
        );
        expect(answers).toHaveLength(1);
      }
    },
  );

  it.each(routerFixtures)(
    '%s names a known setup, and fakes only methods that setup lists',
    (_name, fixture) => {
      const capabilities = capabilitiesOf(fixture.given.capabilities);
      expect(capabilities).toBeDefined();
      for (const key of Object.keys(fixture.given.provider ?? {})) {
        const [domain, method] = key.split('.');
        expect(capabilities[domain]?.methods).toContain(method);
      }
    },
  );

  it.each(routerFixtures)(
    '%s fails a fake with a reason value or a listed cause',
    (_name, fixture) => {
      for (const setup of Object.values(fixture.given.provider ?? {})) {
        if (setup.fail !== undefined) {
          expect(
            codeOfReason(setup.fail) ?? FAIL_CAUSES[setup.fail],
          ).toBeDefined();
        }
      }
    },
  );

  it.each(routerFixtures)(
    '%s expects the code that the cause of each failing fake maps to',
    (_name, fixture) => {
      const codes = expectsOf(fixture).map(
        expected => (expected.error as Json | undefined)?.code,
      );
      for (const setup of Object.values(fixture.given.provider ?? {})) {
        if (setup.fail !== undefined) {
          expect(codes).toContain(
            codeOfReason(setup.fail) ?? FAIL_CAUSES[setup.fail],
          );
        }
      }
    },
  );
});

describe('errors group', () => {
  const errors = routerFixtures
    .filter(([name]) => name.startsWith('errors/'))
    .flatMap(([, fixture]) => expectsOf(fixture))
    .map(expected => expected.error as Json | undefined)
    .filter((error): error is Json => error !== undefined);

  it('has a fixture for each error code', () => {
    expect([...new Set(errors.map(error => error.code))].sort()).toEqual(
      [...CODES].sort(),
    );
  });

  it('has a fixture for each reason value, apart from no_transport of the web bridge', () => {
    const reasons = errors.map(error => (error.details as Json)?.reason);
    const expected = Object.values(REASONS)
      .flat()
      .filter(reason => reason !== 'no_transport');
    for (const reason of expected) {
      expect(reasons).toContain(reason);
    }
    expect(reasons).not.toContain('no_transport');
  });
});

describe('timeout group', () => {
  it('advances the clock and waits in no real time', () => {
    const advances = routerFixtures
      .filter(([name]) => name.startsWith('timeout/'))
      .flatMap(([, fixture]) => fixture.steps)
      .filter(step => 'advance' in step);
    expect(advances.length).toBeGreaterThan(0);
  });
});
