// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { METHOD_SCHEMAS, PROTOCOL_VERSION, SCHEMA_IDS } from '../src';
import { createContractValidator, failingPaths } from './support';

const validator = createContractValidator();
const paths = (schemaId: string, value: unknown) =>
  failingPaths(validator, schemaId, value);

const on = (methods: string[], events: string[] = []) => ({
  available: true,
  methods,
  events,
});
const off = (reason: string) => ({
  available: false,
  reason,
  methods: [],
  events: [],
});

const capabilities = {
  lifecycle: on(['getConfig', 'ready', 'setResult', 'dismiss'], ['cancel']),
  secureStorage: {
    ...on(['has', 'get', 'getMany', 'set', 'remove']),
    features: { userPresence: 'biometric' },
  },
  nfc: {
    ...on(['getStatus', 'scanPassport', 'cancelScan'], ['scanProgress']),
    features: { can: false },
  },
  camera: {
    ...on(['isAvailable', 'scanMRZ', 'stopCamera'], ['scanHint']),
    features: { hints: ['state'] },
  },
  biometrics: on(['isAvailable', 'getBiometryType', 'authenticate']),
  haptic: on(['trigger']),
  analytics: on(['trackEvent']),
  navigation: on(['openExternal', 'openSettings'], ['back']),
};

const embed = {
  protocolVersion: 2,
  protocolMinor: 0,
  sdkVersion: '0.1.0',
  platform: 'android',
  wrapper: 'none',
  mode: 'embed',
  debug: false,
  referenceId: '1c9e6f2a-8d4b-4c7e-9a10-3f5b7d9e1a2c',
  verificationRequest: { userId: 'u1', disclosures: ['ofac'] },
  capabilities,
  app: { id: 'com.example.partner', version: '1.4.0', build: '57' },
  device: { osVersion: '15', model: 'Pixel 8' },
  locale: { languageTags: ['en-GB'], region: 'GB', timeZone: 'Europe/London' },
  insets: { top: 24, right: 0, bottom: 16, left: 0 },
  appState: 'active',
};

const shell = {
  ...embed,
  platform: 'ios',
  mode: 'self-app',
  verificationRequest: null,
  migration: { status: 'done' },
  initialIntake: null,
  pendingIntakeCount: 0,
};

const response = (change: object) =>
  paths(SCHEMA_IDS.handshakeResponse, change);
const withCapability = (domain: string, entry: unknown) =>
  response({ ...embed, capabilities: { ...capabilities, [domain]: entry } });

describe('protocol version', () => {
  it('is major 2, minor 0', () => {
    expect(PROTOCOL_VERSION).toEqual({ major: 2, minor: 0 });
  });

  it('binds lifecycle.getConfig to the handshake schemas', () => {
    expect(METHOD_SCHEMAS['lifecycle.getConfig']).toEqual({
      params: 'bridge/handshake-request',
      result: 'bridge/handshake-response',
    });
    expect(validator.schemaIds).toEqual(
      expect.arrayContaining(Object.values(SCHEMA_IDS)),
    );
  });
});

describe('handshake request', () => {
  const params = { protocolMinor: 0, webVersion: '3.1.0+20e152b1f' };

  it('accepts the two params, and an unknown one', () => {
    expect(paths(SCHEMA_IDS.handshakeRequest, params)).toEqual([]);
    expect(
      paths(SCHEMA_IDS.handshakeRequest, { ...params, later: true }),
    ).toEqual([]);
  });

  it.each([
    ['no protocolMinor', { webVersion: 'x' }, ['']],
    ['no webVersion', { protocolMinor: 0 }, ['']],
    ['the empty params the web sends today', {}, ['']],
    ['a null param', { ...params, webVersion: null }, ['/webVersion']],
    [
      'a minor that is a string',
      { ...params, protocolMinor: '0' },
      ['/protocolMinor'],
    ],
    [
      'a minor that is not whole',
      { ...params, protocolMinor: 0.5 },
      ['/protocolMinor'],
    ],
    ['a negative minor', { ...params, protocolMinor: -1 }, ['/protocolMinor']],
  ])('rejects %s', (_name, value, expected) => {
    expect(paths(SCHEMA_IDS.handshakeRequest, value)).toEqual(expected);
  });
});

describe('capability entry', () => {
  const entry = (value: unknown) => paths(SCHEMA_IDS.capability, value);

  it('accepts an available and an unavailable domain', () => {
    expect(entry(on(['trigger']))).toEqual([]);
    expect(entry({ ...on(['trigger']), reason: null, features: null })).toEqual(
      [],
    );
    expect(entry({ ...on([]), features: { later: [1] }, extra: 1 })).toEqual(
      [],
    );
    expect(entry(off('no_module'))).toEqual([]);
    expect(entry(off('no_hardware'))).toEqual([]);
  });

  it.each([
    ['no available', { methods: [], events: [] }, ['']],
    ['no methods', { available: true, events: [] }, ['']],
    ['no events', { available: true, methods: [] }, ['']],
    ['available as a string', { ...on([]), available: 'true' }, ['/available']],
    ['a method that is not a string', on([1 as never]), ['/methods/0']],
    ['events that are not a list', { ...on([]), events: null }, ['/events']],
    ['features that are a list', { ...on([]), features: [] }, ['/features']],
    ['unavailable with no reason', { ...off('x'), reason: undefined }, ['']],
    ['unavailable with a null reason', off(null as never), ['/reason']],
    ['a reason outside the list', off('nfc_disabled'), ['/reason']],
    [
      'unavailable with a method',
      { ...off('no_module'), methods: ['getStatus'] },
      ['/methods'],
    ],
  ])('rejects %s', (_name, value, expected) => {
    expect(entry(value)).toEqual(expected);
  });
});

describe('handshake response', () => {
  it('accepts a modal answer with and without the optional fields', () => {
    expect(response(embed)).toEqual([]);
    expect(
      response({
        ...embed,
        storage: { status: 'items_lost' },
        bundle: { build: 2052, source: 'downloaded', complete: false },
      }),
    ).toEqual([]);
    expect(
      response({
        ...embed,
        storage: null,
        bundle: null,
        migration: null,
        initialIntake: null,
        pendingIntakeCount: null,
        later: {},
      }),
    ).toEqual([]);
  });

  it('accepts a null request, a null region and a host reference id', () => {
    expect(
      response({
        ...embed,
        verificationRequest: null,
        referenceId: 'order-1042',
        locale: { ...embed.locale, region: null },
      }),
    ).toEqual([]);
  });

  it('does not check the fields of the verification request', () => {
    expect(
      response({ ...embed, verificationRequest: { userId: 5, version: '2' } }),
    ).toEqual([]);
  });

  it('accepts a shell answer, with any intake object and any migration status', () => {
    expect(response(shell)).toEqual([]);
    expect(
      response({
        ...shell,
        migration: { status: 'a_later_status', reason: 'legacy_secret_format' },
        initialIntake: { intakeId: 'not checked yet' },
        pendingIntakeCount: 3,
      }),
    ).toEqual([]);
  });

  it.each(['migration', 'initialIntake', 'pendingIntakeCount'])(
    'requires %s in self-app mode',
    field => {
      expect(response({ ...shell, [field]: undefined })).toEqual(['']);
    },
  );

  it.each([
    ['a null migration', { migration: null }, ['/migration']],
    ['a migration with no status', { migration: {} }, ['/migration']],
    [
      'a null intake count',
      { pendingIntakeCount: null },
      ['/pendingIntakeCount'],
    ],
    [
      'a negative intake count',
      { pendingIntakeCount: -1 },
      ['/pendingIntakeCount'],
    ],
    ['an intake that is a string', { initialIntake: 'x' }, ['/initialIntake']],
  ])('rejects a shell answer with %s', (_name, change, expected) => {
    expect(response({ ...shell, ...change })).toEqual(expected);
  });

  it.each(Object.keys(embed))('requires %s', field => {
    expect(response({ ...embed, [field]: undefined })).toEqual(['']);
  });

  it.each([
    ['a null required field', { debug: null }, ['/debug']],
    [
      'an undefined request',
      { verificationRequest: 'none' },
      ['/verificationRequest'],
    ],
    ['a major of 0', { protocolVersion: 0 }, ['/protocolVersion']],
    ['a minor that is not whole', { protocolMinor: 1.5 }, ['/protocolMinor']],
    ['an sdkVersion that is not x.y.z', { sdkVersion: '0.1' }, ['/sdkVersion']],
    ['a platform outside the list', { platform: 'web' }, ['/platform']],
    ['a wrapper outside the list', { wrapper: 'flutter' }, ['/wrapper']],
    ['a mode outside the list', { mode: 'modal' }, ['/mode']],
    ['an empty referenceId', { referenceId: '' }, ['/referenceId']],
    ['an app with no build', { app: { id: 'a', version: '1' } }, ['/app']],
    ['a device with no model', { device: { osVersion: '15' } }, ['/device']],
    [
      'a locale with no region key',
      { locale: { languageTags: [], timeZone: 'UTC' } },
      ['/locale'],
    ],
    [
      'language tags that are one string',
      { locale: { ...embed.locale, languageTags: 'en-GB' } },
      ['/locale/languageTags'],
    ],
    [
      'an inset that is a string',
      { insets: { ...embed.insets, top: '24' } },
      ['/insets/top'],
    ],
    [
      'insets with no left',
      { insets: { top: 0, right: 0, bottom: 0 } },
      ['/insets'],
    ],
    ['an appState outside the list', { appState: 'foreground' }, ['/appState']],
    [
      'a storage status outside the list',
      { storage: { status: 'lost' } },
      ['/storage/status'],
    ],
    ['a storage with no status', { storage: {} }, ['/storage']],
    [
      'a bundle source outside the list',
      { bundle: { build: 1, source: 'remote', complete: true } },
      ['/bundle/source'],
    ],
    [
      'a bundle build that is not whole',
      { bundle: { build: 1.5, source: 'seed', complete: true } },
      ['/bundle/build'],
    ],
    [
      'a bundle with no complete',
      { bundle: { build: 1, source: 'seed' } },
      ['/bundle'],
    ],
  ])('rejects %s', (_name, change, expected) => {
    expect(response({ ...embed, ...change })).toEqual(expected);
  });

  it.each(Object.keys(capabilities))(
    'requires a capability entry for %s',
    domain => {
      expect(withCapability(domain, undefined)).toEqual(['/capabilities']);
    },
  );

  it('accepts an entry for a domain outside the core list, and checks its shape', () => {
    expect(withCapability('intake', on(['ack'], ['received']))).toEqual([]);
    expect(withCapability('intake', null)).toEqual([]);
    expect(withCapability('intake', true)).toEqual(['/capabilities/intake']);
  });

  it('checks the shape of a core entry that also has typed features', () => {
    expect(withCapability('nfc', off('no_hardware'))).toEqual([]);
    expect(withCapability('nfc', { available: false })).toEqual([
      '/capabilities/nfc',
    ]);
  });

  it.each([
    ['secureStorage', { userPresence: 'passcode' }],
    ['secureStorage', { userPresence: 'none' }],
    ['secureStorage', {}],
    ['nfc', { can: true, photo: true }],
    ['camera', { hints: ['state', 'glare', 'blur'] }],
    ['camera', { hints: [], previewModes: ['rect'] }],
  ])('accepts %s features %j', (domain, features) => {
    const entry = capabilities[domain as keyof typeof capabilities];
    expect(withCapability(domain, { ...entry, features })).toEqual([]);
  });

  it.each([
    ['secureStorage', { userPresence: 'faceId' }, 'userPresence'],
    ['secureStorage', { userPresence: true }, 'userPresence'],
    ['nfc', { can: 'no' }, 'can'],
    ['camera', { hints: ['shake'] }, 'hints/0'],
    ['camera', { hints: 'state' }, 'hints'],
  ])('rejects %s features %j', (domain, features, at) => {
    const entry = capabilities[domain as keyof typeof capabilities];
    expect(withCapability(domain, { ...entry, features })).toEqual([
      `/capabilities/${domain}/features/${at}`,
    ]);
  });
});
