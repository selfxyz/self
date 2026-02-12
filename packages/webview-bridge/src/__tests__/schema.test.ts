import { describe, expect, it } from 'vitest';

import { validateBridgeMessage, isBridgeMessage } from '../schema';
import type { BridgeRequest, BridgeResponse, BridgeEvent } from '../types';
import { BRIDGE_PROTOCOL_VERSION } from '../types';

describe('validateBridgeMessage', () => {
  const validRequest: BridgeRequest = {
    type: 'request',
    version: BRIDGE_PROTOCOL_VERSION,
    id: '550e8400-e29b-41d4-a716-446655440000',
    domain: 'nfc',
    method: 'scan',
    params: { passportNumber: 'ABC123' },
    timestamp: Date.now(),
  };

  const validResponse: BridgeResponse = {
    type: 'response',
    version: BRIDGE_PROTOCOL_VERSION,
    id: '550e8400-e29b-41d4-a716-446655440001',
    domain: 'nfc',
    requestId: '550e8400-e29b-41d4-a716-446655440000',
    success: true,
    data: { mrz: 'P<USA...' },
    timestamp: Date.now(),
  };

  const validEvent: BridgeEvent = {
    type: 'event',
    version: BRIDGE_PROTOCOL_VERSION,
    id: '550e8400-e29b-41d4-a716-446655440002',
    domain: 'nfc',
    event: 'scanProgress',
    data: { step: 'bac', percent: 10 },
    timestamp: Date.now(),
  };

  describe('valid messages', () => {
    it('should accept a valid request', () => {
      expect(validateBridgeMessage(validRequest)).toBeNull();
    });

    it('should accept a valid response', () => {
      expect(validateBridgeMessage(validResponse)).toBeNull();
    });

    it('should accept a valid event', () => {
      expect(validateBridgeMessage(validEvent)).toBeNull();
    });

    it('should accept a failure response with error', () => {
      const failResponse: BridgeResponse = {
        ...validResponse,
        success: false,
        data: undefined,
        error: { code: 'NFC_NOT_SUPPORTED', message: 'NFC not available' },
      };
      expect(validateBridgeMessage(failResponse)).toBeNull();
    });
  });

  describe('invalid messages', () => {
    it('should reject null', () => {
      expect(validateBridgeMessage(null)).toBe('Message must be a non-null object');
    });

    it('should reject non-object', () => {
      expect(validateBridgeMessage('hello')).toBe('Message must be a non-null object');
    });

    it('should reject missing type', () => {
      const { type, ...rest } = validRequest;
      expect(validateBridgeMessage(rest)).toBe('Missing or invalid "type" field');
    });

    it('should reject invalid version', () => {
      expect(validateBridgeMessage({ ...validRequest, version: 0 })).toBe(
        'Missing or invalid "version" field',
      );
    });

    it('should reject empty id', () => {
      expect(validateBridgeMessage({ ...validRequest, id: '' })).toBe(
        'Missing or invalid "id" field',
      );
    });

    it('should reject invalid domain', () => {
      expect(validateBridgeMessage({ ...validRequest, domain: 'invalid' })).toBe(
        'Invalid domain: "invalid"',
      );
    });

    it('should reject negative timestamp', () => {
      expect(validateBridgeMessage({ ...validRequest, timestamp: -1 })).toBe(
        'Missing or invalid "timestamp" field',
      );
    });

    it('should reject request without method', () => {
      const { method, ...rest } = validRequest;
      expect(validateBridgeMessage(rest)).toBe(
        'Request: missing or invalid "method" field',
      );
    });

    it('should reject request without params', () => {
      const { params, ...rest } = validRequest;
      expect(validateBridgeMessage(rest)).toBe(
        'Request: missing or invalid "params" field',
      );
    });

    it('should reject response without requestId', () => {
      const { requestId, ...rest } = validResponse;
      expect(validateBridgeMessage(rest)).toBe(
        'Response: missing or invalid "requestId" field',
      );
    });

    it('should reject response without success', () => {
      const { success, ...rest } = validResponse;
      expect(validateBridgeMessage(rest)).toBe(
        'Response: missing or invalid "success" field',
      );
    });

    it('should reject event without event name', () => {
      const { event, ...rest } = validEvent;
      expect(validateBridgeMessage(rest)).toBe(
        'Event: missing or invalid "event" field',
      );
    });

    it('should reject event without data', () => {
      const { data, ...rest } = validEvent;
      expect(validateBridgeMessage(rest)).toBe('Event: missing "data" field');
    });

    it('should reject unknown message type', () => {
      expect(
        validateBridgeMessage({ ...validRequest, type: 'unknown' }),
      ).toBe('Unknown message type: "unknown"');
    });
  });

  describe('all domains', () => {
    const domains = [
      'nfc', 'biometrics', 'secureStorage', 'camera', 'crypto',
      'haptic', 'analytics', 'lifecycle', 'documents', 'navigation',
    ];

    it.each(domains)('should accept domain "%s"', (domain) => {
      expect(
        validateBridgeMessage({ ...validRequest, domain }),
      ).toBeNull();
    });
  });

  describe('isBridgeMessage type guard', () => {
    it('should return true for valid messages', () => {
      expect(isBridgeMessage(validRequest)).toBe(true);
      expect(isBridgeMessage(validResponse)).toBe(true);
      expect(isBridgeMessage(validEvent)).toBe(true);
    });

    it('should return false for invalid messages', () => {
      expect(isBridgeMessage(null)).toBe(false);
      expect(isBridgeMessage({})).toBe(false);
      expect(isBridgeMessage({ type: 'request' })).toBe(false);
    });
  });
});
