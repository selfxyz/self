// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

import type {
  BridgeMessage,
  BridgeRequest,
  BridgeResponse,
  BridgeEvent,
  BridgeDomain,
} from './types';
import { BRIDGE_PROTOCOL_VERSION } from './types';

const VALID_DOMAINS: BridgeDomain[] = [
  'nfc', 'biometrics', 'secureStorage', 'camera',
  'crypto', 'haptic', 'analytics', 'lifecycle',
  'documents', 'navigation',
];

const VALID_TYPES = ['request', 'response', 'event'] as const;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertString(obj: Record<string, unknown>, field: string): void {
  if (typeof obj[field] !== 'string') {
    throw new ValidationError(`Missing or invalid field: ${field} (expected string)`);
  }
}

function assertNumber(obj: Record<string, unknown>, field: string): void {
  if (typeof obj[field] !== 'number') {
    throw new ValidationError(`Missing or invalid field: ${field} (expected number)`);
  }
}

export function parseMessage(json: string): BridgeMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  if (!isObject(parsed)) {
    throw new ValidationError('Message must be an object');
  }

  const type = parsed.type;
  if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    throw new ValidationError(`Invalid message type: ${String(type)}`);
  }

  assertNumber(parsed, 'version');
  if (parsed.version !== BRIDGE_PROTOCOL_VERSION) {
    throw new ValidationError(`Unsupported protocol version: ${parsed.version}`);
  }

  assertString(parsed, 'id');
  assertNumber(parsed, 'timestamp');

  const domain = parsed.domain;
  if (!VALID_DOMAINS.includes(domain as BridgeDomain)) {
    throw new ValidationError(`Invalid domain: ${String(domain)}`);
  }

  switch (type) {
    case 'request':
      return validateRequest(parsed);
    case 'response':
      return validateResponse(parsed);
    case 'event':
      return validateEvent(parsed);
    default:
      throw new ValidationError(`Unknown message type: ${String(type)}`);
  }
}

function validateRequest(obj: Record<string, unknown>): BridgeRequest {
  assertString(obj, 'method');
  if (!isObject(obj.params)) {
    throw new ValidationError('Request params must be an object');
  }
  return obj as unknown as BridgeRequest;
}

function validateResponse(obj: Record<string, unknown>): BridgeResponse {
  assertString(obj, 'requestId');
  if (typeof obj.success !== 'boolean') {
    throw new ValidationError('Response success must be a boolean');
  }
  if (!obj.success && obj.error) {
    if (!isObject(obj.error)) {
      throw new ValidationError('Response error must be an object');
    }
    if (typeof obj.error.code !== 'string' || typeof obj.error.message !== 'string') {
      throw new ValidationError('Response error must have code and message strings');
    }
  }
  return obj as unknown as BridgeResponse;
}

function validateEvent(obj: Record<string, unknown>): BridgeEvent {
  assertString(obj, 'event');
  return obj as unknown as BridgeEvent;
}

export function isRequest(msg: BridgeMessage): msg is BridgeRequest {
  return msg.type === 'request';
}

export function isResponse(msg: BridgeMessage): msg is BridgeResponse {
  return msg.type === 'response';
}

export function isEvent(msg: BridgeMessage): msg is BridgeEvent {
  return msg.type === 'event';
}
