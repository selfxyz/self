// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type FixtureJson = Record<string, unknown>;

/** What the fake hardware does for one method. No key for "succeed with a value" is defined yet. */
export interface FixtureProviderSetup {
  /** The fake fails with this named cause. */
  readonly fail?: string;
  /** The fake emits one progress event per entry, in order. */
  readonly progress?: readonly FixtureJson[];
  /** The fake never finishes. */
  readonly pending?: true;
}

export interface FixtureGiven {
  /** A named device setup, for example `full`. */
  readonly capabilities: string;
  /** Fake hardware behaviour, keyed by `<domain>.<method>`. */
  readonly provider?: Readonly<Record<string, FixtureProviderSetup>>;
  /**
   * What the fake host and device give native for this launch: the handshake response fields
   * other than `protocolVersion`, `protocolMinor` and `capabilities`.
   */
  readonly launch?: FixtureJson;
}

/** A message from web to native. A string is a raw body, for input that is not a JSON object. */
export interface FixtureSendStep {
  readonly send: FixtureJson | string;
}

/** A message from native to web. */
export interface FixtureExpectStep {
  readonly expect: FixtureJson;
}

/** A named action that native starts with no message from the web. */
export interface FixtureNativeStep {
  readonly native: string;
}

/** Moves the runner's fake clock forward by this many milliseconds. */
export interface FixtureAdvanceStep {
  readonly advance: number;
}

export type FixtureStep =
  | FixtureSendStep
  | FixtureExpectStep
  | FixtureNativeStep
  | FixtureAdvanceStep;

export type FixtureStepKind = (typeof FIXTURE_STEP_KINDS)[number];

export interface Fixture {
  /** `<group>/<case>`, equal to the file path under `fixtures/` without `.json`. */
  readonly name: string;
  readonly given: FixtureGiven;
  readonly steps: readonly FixtureStep[];
}

export interface PlaceholderValues {
  /** The real id for a label. It must return the same id each time it gets the same label. */
  idFor(label: string): string;
  /** Replaces `"timestamp": 0` on a `send`. */
  readonly timestamp: number;
}

export interface ExpectFill {
  readonly id: string;
  readonly timestamp: number;
  readonly errorMessage: string;
}

export const FIXTURE_STEP_KINDS = [
  'send',
  'expect',
  'native',
  'advance',
] as const;

const FIXTURE_KEYS = ['name', 'given', 'steps'];
const GIVEN_KEYS = ['capabilities', 'provider', 'launch'];
const LAUNCH_KEYS_NATIVE_OWNS = [
  'protocolVersion',
  'protocolMinor',
  'capabilities',
];
const PROVIDER_KEYS = ['fail', 'progress', 'pending'];
const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;
const PROVIDER_METHOD_PATTERN = /^[A-Za-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*$/;

function isObject(value: unknown): value is FixtureJson {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseError(source: string, at: string, problem: string): Error {
  return new Error(`${source}: ${at} ${problem}`);
}

function rejectUnknownKeys(
  value: FixtureJson,
  allowed: readonly string[],
  source: string,
  at: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw parseError(source, at, `has the unknown key "${key}"`);
    }
  }
}

function checkProvider(provider: unknown, source: string): void {
  if (!isObject(provider)) {
    throw parseError(source, 'given.provider', 'must be an object');
  }
  for (const [method, setup] of Object.entries(provider)) {
    const at = `given.provider["${method}"]`;
    if (!PROVIDER_METHOD_PATTERN.test(method)) {
      throw parseError(source, at, 'must be keyed by "<domain>.<method>"');
    }
    if (!isObject(setup)) {
      throw parseError(source, at, 'must be an object');
    }
    rejectUnknownKeys(setup, PROVIDER_KEYS, source, at);
    if (Object.keys(setup).length === 0) {
      throw parseError(source, at, 'must say what the fake does');
    }
    if (setup.fail !== undefined && !isNonEmptyString(setup.fail)) {
      throw parseError(source, `${at}.fail`, 'must be a non-empty string');
    }
    if (
      setup.progress !== undefined &&
      !(Array.isArray(setup.progress) && setup.progress.every(isObject))
    ) {
      throw parseError(source, `${at}.progress`, 'must be a list of objects');
    }
    if (setup.pending !== undefined && setup.pending !== true) {
      throw parseError(source, `${at}.pending`, 'must be true when present');
    }
    if (setup.pending === true && setup.fail !== undefined) {
      throw parseError(source, at, 'cannot both fail and never finish');
    }
  }
}

function checkLaunch(launch: unknown, source: string): void {
  if (!isObject(launch)) {
    throw parseError(source, 'given.launch', 'must be an object');
  }
  for (const key of LAUNCH_KEYS_NATIVE_OWNS) {
    if (key in launch) {
      throw parseError(
        source,
        'given.launch',
        `cannot set "${key}": it comes from the build and given.capabilities`,
      );
    }
  }
}

function checkGiven(given: unknown, source: string): void {
  if (!isObject(given)) {
    throw parseError(source, 'given', 'must be an object');
  }
  rejectUnknownKeys(given, GIVEN_KEYS, source, 'given');
  if (!isNonEmptyString(given.capabilities)) {
    throw parseError(
      source,
      'given.capabilities',
      'must be a non-empty string',
    );
  }
  if (given.provider !== undefined) {
    checkProvider(given.provider, source);
  }
  if (given.launch !== undefined) {
    checkLaunch(given.launch, source);
  }
}

function checkStep(step: unknown, source: string, index: number): void {
  const at = `steps[${index}]`;
  if (!isObject(step)) {
    throw parseError(source, at, 'must be an object');
  }
  const keys = Object.keys(step);
  const kind = keys[0] as FixtureStepKind;
  if (keys.length !== 1 || !FIXTURE_STEP_KINDS.includes(kind)) {
    throw parseError(
      source,
      at,
      `must hold exactly one of ${FIXTURE_STEP_KINDS.join(', ')}`,
    );
  }
  const value = step[kind];
  switch (kind) {
    case 'send':
      if (!isObject(value) && typeof value !== 'string') {
        throw parseError(source, `${at}.send`, 'must be an object or a string');
      }
      return;
    case 'expect':
      if (!isObject(value)) {
        throw parseError(source, `${at}.expect`, 'must be an object');
      }
      return;
    case 'native':
      if (!isNonEmptyString(value)) {
        throw parseError(source, `${at}.native`, 'must be a non-empty string');
      }
      return;
    case 'advance':
      if (!Number.isSafeInteger(value) || (value as number) < 1) {
        throw parseError(
          source,
          `${at}.advance`,
          'must be an integer number of milliseconds, 1 or more',
        );
      }
  }
}

/**
 * Checks that a parsed JSON value has the fixture shape and returns it unchanged. `source` names
 * the fixture in error messages. The messages inside `send` and `expect` are not checked here.
 */
export function parseFixture(value: unknown, source: string): Fixture {
  if (!isObject(value)) {
    throw parseError(source, 'a fixture', 'must be a JSON object');
  }
  rejectUnknownKeys(value, FIXTURE_KEYS, source, 'the fixture');
  if (typeof value.name !== 'string' || !NAME_PATTERN.test(value.name)) {
    throw parseError(source, 'name', 'must be "<group>/<case>"');
  }
  checkGiven(value.given, source);
  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    throw parseError(source, 'steps', 'must be a non-empty list');
  }
  value.steps.forEach((step, index) => checkStep(step, source, index));
  return value as unknown as Fixture;
}

export function fixtureGroup(fixture: Fixture): string {
  return fixture.name.slice(0, fixture.name.indexOf('/'));
}

export function stepKind(step: FixtureStep): FixtureStepKind {
  return Object.keys(step)[0] as FixtureStepKind;
}

function labelsOf(step: FixtureStep): string[] {
  const fields: unknown[] = [];
  if ('send' in step && isObject(step.send)) {
    fields.push(step.send.id, step.send.requestId);
  } else if ('expect' in step) {
    fields.push(step.expect.requestId);
  }
  return fields.filter(field => typeof field === 'string');
}

/** Every id label of a fixture, in the order of first use. */
export function fixtureLabels(fixture: Fixture): string[] {
  return [...new Set(fixture.steps.flatMap(labelsOf))];
}

/** Binds each label to one id from `createId`, made the first time the label is seen. */
export function createLabelBinder(
  createId: () => string,
): (label: string) => string {
  const ids = new Map<string, string>();
  return label => {
    const id = ids.get(label) ?? createId();
    ids.set(label, id);
    return id;
  };
}

function swapLabel(
  message: FixtureJson,
  field: string,
  values: PlaceholderValues,
): FixtureJson {
  const label = message[field];
  return typeof label === 'string' ? { [field]: values.idFor(label) } : {};
}

/**
 * Replaces the placeholders of BC 11.1. On a `send` object: a string `id` or `requestId` and
 * `"timestamp": 0`. On an `expect`: a string `requestId`. It adds no field and leaves a field of
 * any other type as it is, so invalid input stays invalid.
 */
export function fillPlaceholders(
  steps: readonly FixtureStep[],
  values: PlaceholderValues,
): FixtureStep[] {
  return steps.map(step => {
    if ('send' in step && isObject(step.send)) {
      return {
        send: {
          ...step.send,
          ...swapLabel(step.send, 'id', values),
          ...swapLabel(step.send, 'requestId', values),
          ...(step.send.timestamp === 0 ? { timestamp: values.timestamp } : {}),
        },
      };
    }
    if ('expect' in step) {
      return {
        expect: {
          ...step.expect,
          ...swapLabel(step.expect, 'requestId', values),
        },
      };
    }
    return step;
  });
}

/**
 * Adds the three fields an `expect` leaves out because no runner compares them: the message's own
 * `id` and `timestamp`, and `error.message`. A field the `expect` already holds is kept.
 */
export function completeExpect(
  expected: FixtureJson,
  fill: ExpectFill,
): FixtureJson {
  const { error } = expected;
  return {
    id: fill.id,
    timestamp: fill.timestamp,
    ...expected,
    ...(isObject(error)
      ? { error: { message: fill.errorMessage, ...error } }
      : {}),
  };
}
