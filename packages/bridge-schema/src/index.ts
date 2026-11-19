// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export { SCHEMA_DIALECT, type SchemaDocument } from './schemaDocument';

/** Version of the bridge contract defined by this package. `0.0.0` while the contract is incomplete. */
export const BRIDGE_SCHEMA_VERSION = '0.0.0';

/** The `$id` of each schema file in `schema/` that a consumer validates against. */
export const SCHEMA_IDS = {
  cancel: 'bridge/cancel',
  domain: 'bridge/domain',
  error: 'bridge/error',
  errorCode: 'bridge/error-code',
  event: 'bridge/event',
  request: 'bridge/request',
  response: 'bridge/response',
} as const;
