/**
 * JSON Schema definitions for bridge protocol validation.
 *
 * These schemas can be used by both TypeScript and Kotlin sides to validate
 * messages at the boundary, ensuring the contract is maintained.
 */

import type { BridgeMessage } from './types';

/** JSON Schema for BridgeRequest validation. */
export const BridgeRequestSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['type', 'version', 'id', 'domain', 'method', 'params', 'timestamp'],
  properties: {
    type: { const: 'request' },
    version: { type: 'integer', minimum: 1 },
    id: { type: 'string', format: 'uuid' },
    domain: {
      type: 'string',
      enum: [
        'nfc',
        'biometrics',
        'secureStorage',
        'camera',
        'crypto',
        'haptic',
        'analytics',
        'lifecycle',
        'documents',
        'navigation',
      ],
    },
    method: { type: 'string', minLength: 1 },
    params: { type: 'object' },
    timestamp: { type: 'integer', minimum: 0 },
  },
  additionalProperties: false,
} as const;

/** JSON Schema for BridgeResponse validation. */
export const BridgeResponseSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['type', 'version', 'id', 'domain', 'requestId', 'success', 'timestamp'],
  properties: {
    type: { const: 'response' },
    version: { type: 'integer', minimum: 1 },
    id: { type: 'string', format: 'uuid' },
    domain: {
      type: 'string',
      enum: [
        'nfc',
        'biometrics',
        'secureStorage',
        'camera',
        'crypto',
        'haptic',
        'analytics',
        'lifecycle',
        'documents',
        'navigation',
      ],
    },
    requestId: { type: 'string', format: 'uuid' },
    success: { type: 'boolean' },
    data: {},
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'object' },
      },
      required: ['code', 'message'],
    },
    timestamp: { type: 'integer', minimum: 0 },
  },
  additionalProperties: false,
} as const;

/** JSON Schema for BridgeEvent validation. */
export const BridgeEventSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['type', 'version', 'id', 'domain', 'event', 'data', 'timestamp'],
  properties: {
    type: { const: 'event' },
    version: { type: 'integer', minimum: 1 },
    id: { type: 'string', format: 'uuid' },
    domain: {
      type: 'string',
      enum: [
        'nfc',
        'biometrics',
        'secureStorage',
        'camera',
        'crypto',
        'haptic',
        'analytics',
        'lifecycle',
        'documents',
        'navigation',
      ],
    },
    event: { type: 'string', minLength: 1 },
    data: {},
    timestamp: { type: 'integer', minimum: 0 },
  },
  additionalProperties: false,
} as const;

/**
 * Validates a message against the bridge protocol.
 * Returns null if valid, or an error string if invalid.
 */
export function validateBridgeMessage(message: unknown): string | null {
  if (!message || typeof message !== 'object') {
    return 'Message must be a non-null object';
  }

  const msg = message as Record<string, unknown>;

  // Check common required fields
  if (typeof msg.type !== 'string') return 'Missing or invalid "type" field';
  if (typeof msg.version !== 'number' || msg.version < 1) return 'Missing or invalid "version" field';
  if (typeof msg.id !== 'string' || msg.id.length === 0) return 'Missing or invalid "id" field';
  if (typeof msg.domain !== 'string') return 'Missing or invalid "domain" field';
  if (typeof msg.timestamp !== 'number' || msg.timestamp < 0) return 'Missing or invalid "timestamp" field';

  const validDomains = [
    'nfc', 'biometrics', 'secureStorage', 'camera', 'crypto',
    'haptic', 'analytics', 'lifecycle', 'documents', 'navigation',
  ];
  if (!validDomains.includes(msg.domain as string)) {
    return `Invalid domain: "${msg.domain}"`;
  }

  switch (msg.type) {
    case 'request':
      if (typeof msg.method !== 'string' || msg.method.length === 0) {
        return 'Request: missing or invalid "method" field';
      }
      if (!msg.params || typeof msg.params !== 'object') {
        return 'Request: missing or invalid "params" field';
      }
      break;

    case 'response':
      if (typeof msg.requestId !== 'string' || msg.requestId.length === 0) {
        return 'Response: missing or invalid "requestId" field';
      }
      if (typeof msg.success !== 'boolean') {
        return 'Response: missing or invalid "success" field';
      }
      if (!msg.success && msg.error) {
        const err = msg.error as Record<string, unknown>;
        if (typeof err.code !== 'string') return 'Response error: missing "code"';
        if (typeof err.message !== 'string') return 'Response error: missing "message"';
      }
      break;

    case 'event':
      if (typeof msg.event !== 'string' || msg.event.length === 0) {
        return 'Event: missing or invalid "event" field';
      }
      if (msg.data === undefined) {
        return 'Event: missing "data" field';
      }
      break;

    default:
      return `Unknown message type: "${msg.type}"`;
  }

  return null;
}

/**
 * Type guard that validates and narrows a message to BridgeMessage.
 */
export function isBridgeMessage(message: unknown): message is BridgeMessage {
  return validateBridgeMessage(message) === null;
}
