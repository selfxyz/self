// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { SCHEMA_IDS } from '../src';
import { createContractValidator, failingPaths } from './support';

const validator = createContractValidator();
const paths = (schemaId: string, value: unknown) =>
  failingPaths(validator, schemaId, value);

const ID = '0b6c1d0e-7f1a-4c53-9a55-2f1f2a9f6f01';
const OTHER_ID = '5a0c8f0d-33a1-4a7e-8f55-0c1d2e3f4a5b';

const request = {
  type: 'request',
  version: 2,
  id: ID,
  domain: 'secureStorage',
  method: 'has',
  params: { key: 'self_mnemonic' },
  timestamp: 1794650000000,
};
const response = {
  type: 'response',
  version: 2,
  id: OTHER_ID,
  domain: 'secureStorage',
  requestId: ID,
  success: true,
  timestamp: 1794650000012,
};
const event = {
  type: 'event',
  version: 2,
  id: OTHER_ID,
  domain: 'nfc',
  event: 'scanProgress',
  requestId: ID,
  data: { step: 'reading_data', percent: 40 },
  timestamp: 1794650003500,
};
const cancel = {
  type: 'cancel',
  version: 2,
  id: OTHER_ID,
  domain: 'nfc',
  requestId: ID,
  reason: 'navigation',
  timestamp: 1794650009000,
};
const error = (code: string, details?: unknown) => ({
  code,
  message: 'for logs',
  ...(details === undefined ? {} : { details }),
});

describe('domain list', () => {
  it.each([
    'lifecycle',
    'secureStorage',
    'nfc',
    'camera',
    'biometrics',
    'haptic',
    'analytics',
    'navigation',
  ])('holds the core domain %s', domain => {
    expect(paths(SCHEMA_IDS.domain, domain)).toEqual([]);
  });

  it.each(['crypto', 'documents', 'qr', 'NFC', ''])(
    'does not hold %j',
    domain => {
      expect(paths(SCHEMA_IDS.domain, domain)).toEqual(['']);
    },
  );
});

describe('request', () => {
  it('accepts the BC 4.2 example', () => {
    expect(paths(SCHEMA_IDS.request, request)).toEqual([]);
  });

  it('accepts a major other than 2, so a receiver can answer UNSUPPORTED_VERSION', () => {
    expect(paths(SCHEMA_IDS.request, { ...request, version: 3 })).toEqual([]);
  });

  it('accepts an upper-case UUID', () => {
    expect(
      paths(SCHEMA_IDS.request, { ...request, id: ID.toUpperCase() }),
    ).toEqual([]);
  });

  it('accepts a domain outside the list, so native can answer UNSUPPORTED', () => {
    expect(paths(SCHEMA_IDS.request, { ...request, domain: 'crypto' })).toEqual(
      [],
    );
  });

  it.each([
    ['a fractional version', { version: 2.5 }, '/version'],
    ['a string version', { version: '2' }, '/version'],
    ['an id that is not a UUID', { id: 'r1' }, '/id'],
    [
      'a UUID that is not version 4',
      { id: '0b6c1d0e-7f1a-1c53-9a55-2f1f2a9f6f01' },
      '/id',
    ],
    ['an empty domain', { domain: '' }, '/domain'],
    ['an empty method', { method: '' }, '/method'],
    ['params as an array', { params: [] }, '/params'],
    ['params as null', { params: null }, '/params'],
    ['another message type', { type: 'event' }, '/type'],
  ])('rejects %s', (_case, change, path) => {
    expect(paths(SCHEMA_IDS.request, { ...request, ...change })).toEqual([
      path,
    ]);
  });
});

describe('response', () => {
  it.each([
    ['no data', {}],
    ['null data and null error', { data: null, error: null }],
    ['an object as data', { data: { exists: true } }],
    ['a string as data', { data: 'text' }],
    ['false as data', { data: false }],
    ['an array as data', { data: [1, 2] }],
  ])('accepts a success with %s', (_case, change) => {
    expect(paths(SCHEMA_IDS.response, { ...response, ...change })).toEqual([]);
  });

  it('accepts a failure with an error', () => {
    expect(
      paths(SCHEMA_IDS.response, {
        ...response,
        success: false,
        error: error('UNAVAILABLE', { reason: 'nfc_disabled' }),
      }),
    ).toEqual([]);
  });

  it('accepts a domain outside the list, copied from the request', () => {
    expect(
      paths(SCHEMA_IDS.response, {
        ...response,
        domain: 'crypto',
        success: false,
        error: error('UNSUPPORTED', { reason: 'unknown_domain' }),
      }),
    ).toEqual([]);
  });

  it.each([
    ['success as a string', { success: 'true' }, ['/success']],
    ['a success that carries an error', { error: error('FAILED') }, ['/error']],
    ['a failure with no error', { success: false }, ['']],
    [
      'a failure with a null error',
      { success: false, error: null },
      ['/error'],
    ],
    ['a requestId that is not a UUID', { requestId: 'r1' }, ['/requestId']],
  ])('rejects %s', (_case, change, expected) => {
    expect(paths(SCHEMA_IDS.response, { ...response, ...change })).toEqual(
      expected,
    );
  });
});

describe('event', () => {
  it('accepts the BC 4.4 example', () => {
    expect(paths(SCHEMA_IDS.event, event)).toEqual([]);
  });

  it.each([
    ['absent', undefined],
    ['null', null],
  ])('accepts an event no request caused, with requestId %s', (_case, id) => {
    expect(
      paths(SCHEMA_IDS.event, {
        ...event,
        domain: 'navigation',
        event: 'back',
        requestId: id,
        data: {},
      }),
    ).toEqual([]);
  });

  it.each([
    ['null data', { data: null }, ['/data']],
    ['data as an array', { data: [] }, ['/data']],
    ['a requestId that is not a UUID', { requestId: 'r1' }, ['/requestId']],
    ['an empty event name', { event: '' }, ['/event']],
  ])('rejects %s', (_case, change, expected) => {
    expect(paths(SCHEMA_IDS.event, { ...event, ...change })).toEqual(expected);
  });

  it('rejects an event with no data', () => {
    const { data: _data, ...withoutData } = event;

    expect(paths(SCHEMA_IDS.event, withoutData)).toEqual(['']);
  });
});

describe('cancel', () => {
  it.each(['user', 'timeout', 'navigation', null, undefined])(
    'accepts the reason %j',
    reason => {
      expect(paths(SCHEMA_IDS.cancel, { ...cancel, reason })).toEqual([]);
    },
  );

  it('rejects a reason outside the list', () => {
    expect(paths(SCHEMA_IDS.cancel, { ...cancel, reason: 'host' })).toEqual([
      '/reason',
    ]);
  });

  it('rejects a cancel that names no request', () => {
    const { requestId: _requestId, ...withoutRequestId } = cancel;

    expect(paths(SCHEMA_IDS.cancel, withoutRequestId)).toEqual(['']);
  });
});

describe('unknown fields', () => {
  it.each([
    [SCHEMA_IDS.request, request],
    [SCHEMA_IDS.response, response],
    [SCHEMA_IDS.event, event],
    [SCHEMA_IDS.cancel, cancel],
    [SCHEMA_IDS.error, error('FAILED')],
  ])('%s ignores a field it does not know', (schemaId, message) => {
    expect(paths(schemaId, { ...message, futureField: { a: 1 } })).toEqual([]);
  });
});

describe('error', () => {
  const reasons: Record<string, string[]> = {
    UNSUPPORTED: [
      'unknown_domain',
      'unknown_method',
      'no_module',
      'no_hardware',
      'no_transport',
    ],
    UNAVAILABLE: [
      'nfc_disabled',
      'no_device_credential',
      'not_enrolled',
      'lockout',
      'device_locked',
      'not_active',
    ],
    FAILED: [
      'tag_lost',
      'auth_failed',
      'unsupported_document',
      'read_error',
      'camera_init',
      'storage_error',
      'item_lost',
      'already_exists',
    ],
  };
  const codesWithoutReasons = [
    'USER_CANCELLED',
    'CANCELLED',
    'PERMISSION_DENIED',
    'TIMEOUT',
    'BUSY',
    'INVALID_PARAMS',
    'UNSUPPORTED_VERSION',
    'INTERNAL_ERROR',
  ];
  const codes = [...Object.keys(reasons), ...codesWithoutReasons];

  it('has eleven codes', () => {
    expect(codes).toHaveLength(11);
  });

  it.each(codes)(
    'accepts %s with no details, null details and a null reason',
    code => {
      expect(paths(SCHEMA_IDS.error, error(code))).toEqual([]);
      expect(paths(SCHEMA_IDS.error, error(code, null))).toEqual([]);
      expect(paths(SCHEMA_IDS.error, error(code, { reason: null }))).toEqual(
        [],
      );
    },
  );

  it.each(['METHOD_NOT_FOUND', 'UNKNOWN', 'failed'])(
    'rejects the code %s',
    code => {
      expect(paths(SCHEMA_IDS.error, error(code))).toEqual(['/code']);
    },
  );

  it.each(
    Object.entries(reasons).flatMap(([code, list]) =>
      list.map(reason => [code, reason]),
    ),
  )('accepts %s with the reason %s', (code, reason) => {
    expect(paths(SCHEMA_IDS.error, error(code, { reason }))).toEqual([]);
  });

  it.each([
    ['FAILED', 'nfc_disabled'],
    ['UNAVAILABLE', 'tag_lost'],
    ['UNSUPPORTED', 'lockout'],
    ['FAILED', 'migration_pending'],
    ...codesWithoutReasons.map(code => [code, 'tag_lost']),
  ])('rejects %s with the reason %s', (code, reason) => {
    expect(paths(SCHEMA_IDS.error, error(code, { reason }))).toEqual([
      '/details/reason',
    ]);
  });

  it('rejects an error with no message', () => {
    expect(paths(SCHEMA_IDS.error, { code: 'FAILED' })).toEqual(['']);
  });

  it.each([
    ['INVALID_PARAMS', { field: 'params' }],
    ['UNSUPPORTED_VERSION', { supported: [2] }],
    ['TIMEOUT', { origin: 'native' }],
    ['CANCELLED', { origin: 'web' }],
    ['PERMISSION_DENIED', { permission: 'camera', canAskAgain: false }],
    ['FAILED', { reason: 'item_lost', cause: 'key_invalidated' }],
    ['INTERNAL_ERROR', { nativeCode: -25300 }],
  ])('accepts %s with the details %j', (code, details) => {
    expect(paths(SCHEMA_IDS.error, error(code, details))).toEqual([]);
  });

  it.each([
    ['INVALID_PARAMS', { field: 3 }, '/details/field'],
    ['UNSUPPORTED_VERSION', { supported: ['2'] }, '/details/supported/0'],
    ['UNSUPPORTED_VERSION', { supported: 2 }, '/details/supported'],
    ['TIMEOUT', { origin: 'host' }, '/details/origin'],
    ['PERMISSION_DENIED', { canAskAgain: 'no' }, '/details/canAskAgain'],
    ['FAILED', [], '/details'],
  ])('rejects %s with the details %j', (code, details, path) => {
    expect(paths(SCHEMA_IDS.error, error(code, details))).toEqual([path]);
  });
});
