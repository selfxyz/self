// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect } from 'vitest';
import {
  parseMessage,
  ValidationError,
  isRequest,
  isResponse,
  isEvent,
} from '../schema';
import { BRIDGE_PROTOCOL_VERSION } from '../types';

const validRequest = {
  type: 'request',
  version: BRIDGE_PROTOCOL_VERSION,
  id: 'test-id',
  domain: 'nfc',
  method: 'scan',
  params: { passportNumber: '123' },
  timestamp: Date.now(),
};

const validResponse = {
  type: 'response',
  version: BRIDGE_PROTOCOL_VERSION,
  id: 'resp-id',
  domain: 'nfc',
  requestId: 'test-id',
  success: true,
  data: { passportData: {} },
  timestamp: Date.now(),
};

const validEvent = {
  type: 'event',
  version: BRIDGE_PROTOCOL_VERSION,
  id: 'evt-id',
  domain: 'nfc',
  event: 'scanProgress',
  data: { step: 'reading_dg1', percent: 40 },
  timestamp: Date.now(),
};

describe('parseMessage', () => {
  it('should parse a valid request', () => {
    const msg = parseMessage(JSON.stringify(validRequest));
    expect(isRequest(msg)).toBe(true);
    expect(msg.type).toBe('request');
  });

  it('should parse a valid response', () => {
    const msg = parseMessage(JSON.stringify(validResponse));
    expect(isResponse(msg)).toBe(true);
    expect(msg.type).toBe('response');
  });

  it('should parse a valid event', () => {
    const msg = parseMessage(JSON.stringify(validEvent));
    expect(isEvent(msg)).toBe(true);
    expect(msg.type).toBe('event');
  });

  it('should reject invalid JSON', () => {
    expect(() => parseMessage('not json')).toThrow(ValidationError);
  });

  it('should reject non-object', () => {
    expect(() => parseMessage('"string"')).toThrow(ValidationError);
  });

  it('should reject invalid type', () => {
    expect(() =>
      parseMessage(JSON.stringify({ ...validRequest, type: 'invalid' })),
    ).toThrow(ValidationError);
  });

  it('should reject wrong protocol version', () => {
    expect(() =>
      parseMessage(JSON.stringify({ ...validRequest, version: 99 })),
    ).toThrow(ValidationError);
  });

  it('should reject invalid domain', () => {
    expect(() =>
      parseMessage(JSON.stringify({ ...validRequest, domain: 'fake' })),
    ).toThrow(ValidationError);
  });

  it('should reject request with non-object params', () => {
    expect(() =>
      parseMessage(JSON.stringify({ ...validRequest, params: 'string' })),
    ).toThrow(ValidationError);
  });

  it('should reject response without requestId', () => {
    const { requestId: _r, ...noReqId } = validResponse;
    expect(() => parseMessage(JSON.stringify(noReqId))).toThrow(
      ValidationError,
    );
  });

  it('should reject response without success boolean', () => {
    const { success: _s, ...noSuccess } = validResponse;
    expect(() => parseMessage(JSON.stringify(noSuccess))).toThrow(
      ValidationError,
    );
  });

  it('should validate error format on failed response', () => {
    const failedResponse = {
      ...validResponse,
      success: false,
      error: { code: 123, message: 'bad' }, // code should be string
    };
    expect(() => parseMessage(JSON.stringify(failedResponse))).toThrow(
      ValidationError,
    );
  });

  it('should accept failed response with valid error', () => {
    const failedResponse = {
      ...validResponse,
      success: false,
      error: { code: 'ERR', message: 'something went wrong' },
    };
    const msg = parseMessage(JSON.stringify(failedResponse));
    expect(isResponse(msg)).toBe(true);
  });
});
