// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import {
  type Fixture,
  fixtureGroup,
  type FixtureJson as Json,
  METHOD_SCHEMAS,
  PROTOCOL_VERSION,
  SCHEMA_IDS,
} from '../src';
import { loadFixtures } from '../src/node';
import {
  createContractValidator,
  failingPaths,
  filledSteps,
  fixturesDir,
  messageProblems,
} from './support';

/** The fields of BC 9.2. */
const VERIFICATION_REQUEST_FIELDS = [
  'userId',
  'scope',
  'userIdType',
  'userDefinedData',
  'selfDefinedData',
  'verificationId',
  'endpointType',
  'disclosures',
  'excludedCountries',
  'proofItems',
  'appName',
  'appEndpoint',
  'environment',
  'resultType',
  'chainID',
  'version',
  'timestamp',
];

interface Exchange {
  readonly request: Json;
  readonly response: Json;
}

const validator = createContractValidator();
const HANDSHAKE = METHOD_SCHEMAS['lifecycle.getConfig'];
const isHandshake = (request: Json) =>
  request.domain === 'lifecycle' && request.method === 'getConfig';

const fixtures = loadFixtures(fixturesDir);
const inGroup = (group: string) =>
  fixtures
    .filter(fixture => fixtureGroup(fixture) === group)
    .map(fixture => [fixture.name, fixture] as const);
const handshakeFixtures = fixtures.filter(fixture =>
  ['handshake', 'version'].includes(fixtureGroup(fixture)),
);
const byName = (name: string) => {
  const fixture = fixtures.find(candidate => candidate.name === name);
  if (!fixture) {
    throw new Error(`no fixture ${name}`);
  }
  return fixture;
};

/** Every message of a fixture, and each request paired with the response that answers it. */
function read(fixture: Fixture): { messages: Json[]; exchanges: Exchange[] } {
  const messages = filledSteps(fixture).flatMap(step =>
    'send' in step
      ? [step.send as Json]
      : 'expect' in step
        ? [step.expect]
        : [],
  );
  const requests = messages.filter(message => message.type === 'request');
  const exchanges = requests.map(request => {
    const answers = messages.filter(
      message =>
        message.type === 'response' && message.requestId === request.id,
    );
    expect(answers).toHaveLength(1);
    return { request, response: answers[0] };
  });
  return { messages, exchanges };
}

/** The data of each successful handshake answer in a fixture. */
const handshakeAnswers = (fixture: Fixture) =>
  read(fixture)
    .exchanges.filter(
      ({ request, response }) => isHandshake(request) && response.success,
    )
    .map(({ response }) => response.data as Json);

const capabilitiesOf = (name: string) =>
  handshakeAnswers(byName(name))[0].capabilities as Record<string, Json>;

describe.each(['handshake', 'version'])('%s fixtures', group => {
  it.each(inGroup(group))(
    '%s holds only valid messages in core domains',
    (_name, fixture) => {
      const { messages, exchanges } = read(fixture);

      for (const message of messages) {
        expect(messageProblems(validator, message)).toEqual([]);
        expect(
          validator.validate(SCHEMA_IDS.domain, message.domain).valid,
        ).toBe(true);
      }
      expect(exchanges.length).toBeGreaterThan(0);
      expect(messages).toHaveLength(exchanges.length * 2);
    },
  );

  it.each(inGroup(group))(
    '%s sends valid handshake params and answers from its launch setup',
    (_name, fixture) => {
      const { exchanges } = read(fixture);

      for (const { request } of exchanges.filter(({ request }) =>
        isHandshake(request),
      )) {
        expect(
          failingPaths(validator, HANDSHAKE.params, request.params),
        ).toEqual([]);
      }
      for (const data of handshakeAnswers(fixture)) {
        expect(failingPaths(validator, HANDSHAKE.result, data)).toEqual([]);
        expect(fixture.given.launch).toBeDefined();
        expect(data).toEqual({
          protocolVersion: PROTOCOL_VERSION.major,
          protocolMinor: PROTOCOL_VERSION.minor,
          ...fixture.given.launch,
          capabilities: data.capabilities,
        });
      }
    },
  );

  it.each(inGroup(group))(
    '%s answers a request by its major alone',
    (_name, fixture) => {
      for (const { request, response } of read(fixture).exchanges) {
        const accepted =
          request.version === PROTOCOL_VERSION.major ||
          (request.domain === 'lifecycle' && request.method === 'dismiss');

        expect(response.version).toBe(PROTOCOL_VERSION.major);
        expect(response.domain).toBe(request.domain);
        expect(response.success).toBe(accepted);
        if (!accepted) {
          expect(response.error).toMatchObject({
            code: 'UNSUPPORTED_VERSION',
            details: { supported: [PROTOCOL_VERSION.major] },
          });
        }
      }
    },
  );
});

describe('capability setups', () => {
  it('one name and mode always gives the same entries', () => {
    const seen = new Map<string, unknown>();
    for (const fixture of handshakeFixtures) {
      for (const data of handshakeAnswers(fixture)) {
        const key = `${fixture.given.capabilities} in ${String(data.mode)}`;
        expect(data.capabilities, key).toEqual(
          seen.get(key) ?? data.capabilities,
        );
        seen.set(key, data.capabilities);
      }
    }
    expect([...seen.keys()].sort()).toEqual([
      'full in embed',
      'full in self-app',
      'no_device_credential in embed',
      'no_nfc_hardware in embed',
      'no_passport_module in embed',
    ]);
  });

  it('full has every core domain available', () => {
    const full = capabilitiesOf('handshake/full');

    for (const entry of Object.values(full)) {
      expect(entry.available).toBe(true);
      expect(entry.methods).not.toEqual([]);
    }
    expect(full.lifecycle.methods).toContain('setResult');
    expect(full.lifecycle.events).toEqual(['cancel']);
  });

  it('no_passport_module differs from full in nfc and camera only', () => {
    const missing = {
      available: false,
      reason: 'no_module',
      methods: [],
      events: [],
    };

    expect(capabilitiesOf('handshake/no-passport-module')).toEqual({
      ...capabilitiesOf('handshake/full'),
      nfc: missing,
      camera: missing,
    });
  });

  it('no_nfc_hardware differs from full in nfc only', () => {
    expect(capabilitiesOf('handshake/no-nfc-hardware')).toEqual({
      ...capabilitiesOf('handshake/full'),
      nfc: {
        available: false,
        reason: 'no_hardware',
        methods: [],
        events: [],
      },
    });
  });

  it('no_device_credential differs from full in the user-presence flag only', () => {
    const full = capabilitiesOf('handshake/full');

    expect(capabilitiesOf('handshake/no-device-credential')).toEqual({
      ...full,
      secureStorage: {
        ...full.secureStorage,
        features: { userPresence: 'none' },
      },
    });
  });

  it('no fixture reports camera previewModes, which waits for BC-Q1', () => {
    for (const fixture of handshakeFixtures) {
      for (const data of handshakeAnswers(fixture)) {
        const { camera } = data.capabilities as Record<string, Json>;
        expect(camera.features ?? {}).not.toHaveProperty('previewModes');
      }
    }
  });
});

describe('handshake group', () => {
  const answer = (name: string) => handshakeAnswers(byName(name))[0];

  it('covers the cases of BC 11.3 and the shell answer of SC 4', () => {
    expect(inGroup('handshake').map(([name]) => name)).toEqual([
      'handshake/full',
      'handshake/no-device-credential',
      'handshake/no-nfc-hardware',
      'handshake/no-passport-module',
      'handshake/null-request',
      'handshake/request-every-field',
      'handshake/self-app',
    ]);
  });

  it('null-request launches a modal flow with no request', () => {
    expect(answer('handshake/null-request')).toMatchObject({
      mode: 'embed',
      verificationRequest: null,
    });
  });

  it('request-every-field carries each field of BC 9.2 and no other', () => {
    const request = answer('handshake/request-every-field')
      .verificationRequest as Json;

    expect(Object.keys(request).sort()).toEqual(
      [...VERIFICATION_REQUEST_FIELDS].sort(),
    );
    expect(Object.values(request)).not.toContain(null);
  });

  it('a modal answer has no shell field', () => {
    for (const [, fixture] of inGroup('handshake')) {
      for (const data of handshakeAnswers(fixture)) {
        if (data.mode === 'embed') {
          expect(data).not.toHaveProperty('migration');
          expect(data).not.toHaveProperty('initialIntake');
          expect(data).not.toHaveProperty('pendingIntakeCount');
        }
      }
    }
  });

  it('self-app has the shell fields, no request, and no setResult or cancel', () => {
    const data = answer('handshake/self-app');
    const { lifecycle } = data.capabilities as Record<string, Json>;

    expect(data).toMatchObject({
      mode: 'self-app',
      wrapper: 'none',
      verificationRequest: null,
      migration: { status: 'done' },
      initialIntake: null,
      pendingIntakeCount: 0,
    });
    expect(lifecycle.methods).toEqual(['getConfig', 'ready', 'dismiss']);
    expect(lifecycle.events).toEqual([]);
  });
});

describe('version group', () => {
  const versionsOf = (name: string) =>
    read(byName(name)).exchanges.map(({ request }) => [
      request.version,
      `${String(request.domain)}.${String(request.method)}`,
    ]);

  it('covers a lower and a higher major, another domain, dismiss and the retry', () => {
    expect(versionsOf('version/wrong-major-lower')).toEqual([
      [1, 'lifecycle.getConfig'],
    ]);
    expect(versionsOf('version/wrong-major-higher')).toEqual([
      [3, 'lifecycle.getConfig'],
    ]);
    expect(versionsOf('version/wrong-major-other-domain')).toEqual([
      [3, 'nfc.getStatus'],
    ]);
    expect(versionsOf('version/dismiss-wrong-major')).toEqual([
      [3, 'lifecycle.getConfig'],
      [3, 'lifecycle.dismiss'],
    ]);
    expect(versionsOf('version/retry-with-supported-major')).toEqual([
      [3, 'lifecycle.getConfig'],
      [2, 'lifecycle.getConfig'],
    ]);
    expect(inGroup('version')).toHaveLength(5);
  });

  it('the retry answers the second handshake after it refused the first', () => {
    const { exchanges } = read(byName('version/retry-with-supported-major'));

    expect(exchanges.map(({ response }) => response.success)).toEqual([
      false,
      true,
    ]);
  });
});
