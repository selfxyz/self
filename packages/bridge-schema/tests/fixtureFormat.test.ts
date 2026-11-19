// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import {
  completeExpect,
  createLabelBinder,
  fillPlaceholders,
  type Fixture,
  fixtureGroup,
  fixtureLabels,
  parseFixture,
  stepKind,
} from '../src';

const request = (id: unknown) => ({
  type: 'request',
  version: 2,
  id,
  domain: 'nfc',
  method: 'scanPassport',
  params: {},
  timestamp: 0,
});

const timeoutFixture = () => ({
  name: 'timeout/native-owned',
  given: {
    capabilities: 'full',
    provider: { 'nfc.scanPassport': { pending: true } },
  },
  steps: [
    { send: request('r1') },
    { advance: 120000 },
    {
      expect: {
        type: 'response',
        version: 2,
        domain: 'nfc',
        requestId: 'r1',
        success: false,
        error: { code: 'TIMEOUT' },
      },
    },
  ],
});

const withSteps = (steps: unknown[]) => ({ ...timeoutFixture(), steps });
const withGiven = (given: unknown) => ({ ...timeoutFixture(), given });
const parse = (value: unknown) => parseFixture(value, 'case.json');

describe('parseFixture', () => {
  it('returns a fixture of the BC 11.1 shape unchanged', () => {
    const value = timeoutFixture();

    const fixture = parse(value);

    expect(fixture).toBe(value);
    expect(fixtureGroup(fixture)).toBe('timeout');
    expect(fixture.steps.map(stepKind)).toEqual(['send', 'advance', 'expect']);
  });

  it('accepts a raw send body and a native step', () => {
    const fixture = parse(
      withSteps([{ send: '{"type":' }, { native: 'system_back' }]),
    );

    expect(fixture.steps.map(stepKind)).toEqual(['send', 'native']);
  });

  it('accepts a fixture with no provider', () => {
    expect(
      parse(withGiven({ capabilities: 'no_passport_module' })).given,
    ).toEqual({
      capabilities: 'no_passport_module',
    });
  });

  it.each([
    ['an array', [], 'a fixture must be a JSON object'],
    [
      'a missing name',
      { ...timeoutFixture(), name: undefined },
      'name must be',
    ],
    [
      'a name with no group',
      { ...timeoutFixture(), name: 'scan' },
      'name must be',
    ],
    [
      'an unknown top-level key',
      { ...timeoutFixture(), setup: {} },
      'the fixture has the unknown key "setup"',
    ],
    ['a missing given', withGiven(undefined), 'given must be an object'],
    [
      'a missing capabilities',
      withGiven({ provider: {} }),
      'given.capabilities must be a non-empty string',
    ],
    [
      'an unknown given key',
      withGiven({ capabilities: 'full', clock: 0 }),
      'given has the unknown key "clock"',
    ],
    [
      'a provider key that is not domain.method',
      withGiven({ capabilities: 'full', provider: { nfc: { fail: 'x' } } }),
      'must be keyed by "<domain>.<method>"',
    ],
    [
      'an unknown provider behaviour',
      withGiven({
        capabilities: 'full',
        provider: { 'nfc.scanPassport': { fails: 'tag_lost' } },
      }),
      'has the unknown key "fails"',
    ],
    [
      'an empty provider behaviour',
      withGiven({ capabilities: 'full', provider: { 'nfc.scanPassport': {} } }),
      'must say what the fake does',
    ],
    [
      'a provider that fails and never finishes',
      withGiven({
        capabilities: 'full',
        provider: { 'nfc.scanPassport': { fail: 'tag_lost', pending: true } },
      }),
      'cannot both fail and never finish',
    ],
    [
      'pending that is not true',
      withGiven({
        capabilities: 'full',
        provider: { 'nfc.scanPassport': { pending: false } },
      }),
      'pending must be true when present',
    ],
    [
      'progress that is not a list of objects',
      withGiven({
        capabilities: 'full',
        provider: { 'nfc.scanPassport': { progress: ['connecting'] } },
      }),
      'progress must be a list of objects',
    ],
    ['no steps', withSteps([]), 'steps must be a non-empty list'],
    [
      'a misspelt step key',
      withSteps([{ expects: {} }]),
      'steps[0] must hold exactly one of send, expect, native, advance',
    ],
    [
      'two actions in one step',
      withSteps([{ send: request('r1'), advance: 1 }]),
      'steps[0] must hold exactly one of',
    ],
    ['an empty step', withSteps([{}]), 'steps[0] must hold exactly one of'],
    ['a null send', withSteps([{ send: null }]), 'steps[0].send must be'],
    [
      'a string expect',
      withSteps([{ expect: '{}' }]),
      'steps[0].expect must be',
    ],
    ['an empty native', withSteps([{ native: '' }]), 'steps[0].native must be'],
    ['a zero advance', withSteps([{ advance: 0 }]), 'steps[0].advance must be'],
    [
      'a fraction advance',
      withSteps([{ advance: 1.5 }]),
      'steps[0].advance must be',
    ],
    [
      'a string advance',
      withSteps([{ advance: '2000' }]),
      'steps[0].advance must be',
    ],
  ])('rejects %s and names the file', (_case, value, problem) => {
    expect(() => parse(value)).toThrowError(problem);
    expect(() => parse(value)).toThrowError(/^case\.json: /);
  });
});

describe('id labels', () => {
  const fixture: Fixture = parse(
    withSteps([
      { send: request('r1') },
      { send: request('r2') },
      { send: { type: 'cancel', id: 'c1', requestId: 'r1', timestamp: 0 } },
      { expect: { type: 'response', requestId: 'r1', success: true } },
      { expect: { type: 'event', requestId: null } },
      { send: request(7) },
    ]),
  );

  it('are listed once each, in the order of first use', () => {
    expect(fixtureLabels(fixture)).toEqual(['r1', 'r2', 'c1']);
  });

  it('get one id each from a label binder', () => {
    let next = 0;
    const idFor = createLabelBinder(() => `id-${++next}`);

    expect([idFor('r1'), idFor('c1'), idFor('r1')]).toEqual([
      'id-1',
      'id-2',
      'id-1',
    ]);
  });
});

describe('fillPlaceholders', () => {
  const values = {
    idFor: (label: string) => `id-of-${label}`,
    timestamp: 1794650000000,
  };
  const fill = (steps: unknown[]) =>
    fillPlaceholders(parse(withSteps(steps)).steps, values);

  it('swaps the same label for the same id on a send and on an expect', () => {
    expect(
      fill([
        { send: request('r1') },
        { send: { type: 'cancel', id: 'c1', requestId: 'r1', timestamp: 0 } },
        { expect: { type: 'response', requestId: 'r1', success: true } },
      ]),
    ).toEqual([
      { send: { ...request('id-of-r1'), timestamp: 1794650000000 } },
      {
        send: {
          type: 'cancel',
          id: 'id-of-c1',
          requestId: 'id-of-r1',
          timestamp: 1794650000000,
        },
      },
      { expect: { type: 'response', requestId: 'id-of-r1', success: true } },
    ]);
  });

  it('adds nothing to an expect and does not read its id as a label', () => {
    const steps = [
      { expect: { type: 'event', id: 'e1', requestId: null, timestamp: 0 } },
    ];

    expect(fill(steps)).toEqual(steps);
  });

  it('leaves invalid input invalid', () => {
    const steps = [
      { send: { type: 'request', method: 'ready' } },
      { send: { ...request(7), timestamp: 'now' } },
      { send: { ...request(null), timestamp: 5 } },
      { send: '{"id":"r1","timestamp":0}' },
    ];

    expect(fill(steps)).toEqual(steps);
  });

  it('passes native and advance steps through and does not change its input', () => {
    const steps = [
      { send: request('r1') },
      { native: 'system_back' },
      { advance: 2000 },
    ];
    const before = structuredClone(steps);

    const filled = fill(steps);

    expect(filled.slice(1)).toEqual(steps.slice(1));
    expect(steps).toEqual(before);
  });
});

describe('completeExpect', () => {
  const fill = { id: 'm1', timestamp: 5, errorMessage: 'for logs' };

  it('adds the fields no runner compares', () => {
    expect(
      completeExpect({ type: 'response', error: { code: 'TIMEOUT' } }, fill),
    ).toEqual({
      id: 'm1',
      timestamp: 5,
      type: 'response',
      error: { code: 'TIMEOUT', message: 'for logs' },
    });
  });

  it('keeps a field the expect holds and adds no error', () => {
    expect(completeExpect({ id: 'e1', error: null }, fill)).toEqual({
      id: 'e1',
      timestamp: 5,
      error: null,
    });
    expect(completeExpect({ success: true }, fill)).not.toHaveProperty('error');
  });
});
