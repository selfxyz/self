// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ContractPlan } from './model';

const HANDSHAKE = 'bridge/handshake-response';
const CAPABILITIES = `${HANDSHAKE}#/properties/capabilities/properties`;

/**
 * The native types and the schema each one is read from. JSON Schema has no name for an inline
 * enum or object, so the names are given here. Values, fields and nullability come from the schema.
 */
export const CONTRACT_PLAN: ContractPlan = {
  files: [
    {
      name: 'BridgeEnvelope',
      types: [
        {
          name: 'BridgeMessageType',
          consts: [
            'bridge/request#/properties/type',
            'bridge/response#/properties/type',
            'bridge/event#/properties/type',
            'bridge/cancel#/properties/type',
          ],
        },
        { name: 'BridgeDomain', at: 'bridge/domain' },
        { name: 'BridgeRequest', at: 'bridge/request' },
        { name: 'BridgeResponse', at: 'bridge/response' },
        { name: 'BridgeEvent', at: 'bridge/event' },
        { name: 'BridgeCancel', at: 'bridge/cancel' },
        { name: 'BridgeCancelReason', at: 'bridge/cancel#/$defs/reason' },
      ],
    },
    {
      name: 'BridgeError',
      types: [
        { name: 'BridgeErrorCode', at: 'bridge/error-code' },
        { name: 'BridgeError', at: 'bridge/error' },
        { name: 'BridgeErrorDetails', at: 'bridge/error#/$defs/details' },
        {
          name: 'BridgeErrorOrigin',
          at: 'bridge/error#/$defs/details/properties/origin',
        },
        {
          name: 'BridgeUnsupportedReason',
          at: 'bridge/error#/$defs/unsupportedReason',
        },
        {
          name: 'BridgeUnavailableReason',
          at: 'bridge/error#/$defs/unavailableReason',
        },
        { name: 'BridgeFailedReason', at: 'bridge/error#/$defs/failedReason' },
      ],
    },
    {
      name: 'BridgeHandshake',
      types: [
        { name: 'BridgeHandshakeRequest', at: 'bridge/handshake-request' },
        {
          name: 'BridgeHandshakeResponse',
          at: HANDSHAKE,
          fields: {
            capabilities: {
              type: {
                kind: 'map',
                value: { kind: 'named', name: 'BridgeCapability' },
                valueNullable: true,
              },
            },
          },
        },
        { name: 'BridgePlatform', at: `${HANDSHAKE}#/properties/platform` },
        { name: 'BridgeWrapper', at: `${HANDSHAKE}#/properties/wrapper` },
        { name: 'BridgeMode', at: `${HANDSHAKE}#/properties/mode` },
        { name: 'BridgeAppState', at: `${HANDSHAKE}#/properties/appState` },
        { name: 'BridgeAppInfo', at: `${HANDSHAKE}#/properties/app` },
        { name: 'BridgeDeviceInfo', at: `${HANDSHAKE}#/properties/device` },
        { name: 'BridgeLocale', at: `${HANDSHAKE}#/properties/locale` },
        { name: 'BridgeInsets', at: `${HANDSHAKE}#/properties/insets` },
        { name: 'BridgeMigration', at: `${HANDSHAKE}#/$defs/migration` },
        { name: 'BridgeStorageCheck', at: `${HANDSHAKE}#/$defs/storage` },
        {
          name: 'BridgeStorageStatus',
          at: `${HANDSHAKE}#/$defs/storage/properties/status`,
        },
        { name: 'BridgeBundleInfo', at: `${HANDSHAKE}#/$defs/bundle` },
        {
          name: 'BridgeBundleSource',
          at: `${HANDSHAKE}#/$defs/bundle/properties/source`,
        },
        { name: 'BridgeCapability', at: 'bridge/capability' },
        {
          name: 'BridgeCapabilityReason',
          at: 'bridge/capability#/properties/reason',
        },
        {
          name: 'BridgeUserPresence',
          at: `${CAPABILITIES}/secureStorage/allOf/1/properties/features/properties/userPresence`,
        },
        {
          name: 'BridgeCameraHint',
          at: `${CAPABILITIES}/camera/allOf/1/properties/features/properties/hints/items`,
        },
      ],
    },
    {
      name: 'BridgeStorage',
      types: [
        {
          name: 'StorageNamespace',
          at: 'bridge/storage-policy#/$defs/namespace',
        },
        {
          name: 'StorageProtection',
          at: 'bridge/storage-policy#/$defs/protection',
        },
      ],
    },
  ],
  reasonLists: {
    errorSchema: 'bridge/error',
    errorCodeEnum: 'BridgeErrorCode',
    lists: [
      {
        code: 'UNSUPPORTED',
        when: 'bridge/error#/$defs/codeIsUnsupported',
        reasons: 'BridgeUnsupportedReason',
      },
      {
        code: 'UNAVAILABLE',
        when: 'bridge/error#/$defs/codeIsUnavailable',
        reasons: 'BridgeUnavailableReason',
      },
      {
        code: 'FAILED',
        when: 'bridge/error#/$defs/codeIsFailed',
        reasons: 'BridgeFailedReason',
      },
    ],
  },
};
