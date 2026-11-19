// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export {
  completeExpect,
  createLabelBinder,
  type ExpectFill,
  fillPlaceholders,
  type Fixture,
  FIXTURE_STEP_KINDS,
  type FixtureAdvanceStep,
  type FixtureExpectStep,
  type FixtureGiven,
  fixtureGroup,
  type FixtureJson,
  fixtureLabels,
  type FixtureNativeStep,
  type FixtureProviderSetup,
  type FixtureSendStep,
  type FixtureStep,
  type FixtureStepKind,
  parseFixture,
  type PlaceholderValues,
  stepKind,
} from './fixture';
export { SCHEMA_DIALECT, type SchemaDocument } from './schemaDocument';

/** Version of the bridge contract defined by this package. `0.0.0` while the contract is incomplete. */
export const BRIDGE_SCHEMA_VERSION = '0.0.0';

/** The protocol version this contract defines (BC 5.1). `major` is the `version` of every message. */
export const PROTOCOL_VERSION = { major: 2, minor: 0 } as const;

/** The `$id` of each schema file in `schema/` that a consumer validates against. */
export const SCHEMA_IDS = {
  cancel: 'bridge/cancel',
  capability: 'bridge/capability',
  domain: 'bridge/domain',
  error: 'bridge/error',
  errorCode: 'bridge/error-code',
  event: 'bridge/event',
  handshakeRequest: 'bridge/handshake-request',
  handshakeResponse: 'bridge/handshake-response',
  request: 'bridge/request',
  response: 'bridge/response',
} as const;

/**
 * The schema of a method's `params` and of the `data` of its successful response, keyed by
 * `<domain>.<method>`. The message schemas do not apply these: a response does not name its method.
 */
export const METHOD_SCHEMAS = {
  'lifecycle.getConfig': {
    params: SCHEMA_IDS.handshakeRequest,
    result: SCHEMA_IDS.handshakeResponse,
  },
} as const;
