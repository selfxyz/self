// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Unit tests for status handler pure functions
 * These test real business logic without mocking
 */

import { describe, expect, it } from 'vitest';

import type { StatusMessage } from '../../../src/proving/internal/statusHandlers';
import { handleStatusCode, parseStatusMessage } from '../../../src/proving/internal/statusHandlers';

describe('parseStatusMessage', () => {
  it('parses valid JSON string', () => {
    const input = '{"status": 4, "error_code": "E123"}';
    const result = parseStatusMessage(input);

    expect(result).toEqual({
      status: 4,
      error_code: 'E123',
    });
  });

  it('returns object as-is when already parsed', () => {
    const input = { status: 3, reason: 'Failed validation' };
    const result = parseStatusMessage(input);

    expect(result).toBe(input);
  });

  it('throws error for invalid JSON string', () => {
    const input = '{"invalid": json}';

    expect(() => parseStatusMessage(input)).toThrow('Invalid JSON message received');
  });

  it('throws error for non-object, non-string input', () => {
    expect(() => parseStatusMessage(123)).toThrow('Invalid message format');
    expect(() => parseStatusMessage(null)).toThrow('Invalid message format');
    expect(() => parseStatusMessage(undefined)).toThrow('Invalid message format');
  });
});

describe('handleStatusCode', () => {
  describe('failure status (3 or 5)', () => {
    it('handles status 3 with error details', () => {
      const data: StatusMessage = {
        status: 3,
        error_code: 'E001',
        reason: 'Invalid passport data',
      };

      const result = handleStatusCode(data, 'register');

      expect(result).toEqual({
        shouldDisconnect: true,
        stateUpdate: {
          error_code: 'E001',
          reason: 'Invalid passport data',
          socketConnection: null,
        },
        actorEvent: { type: 'PROVE_FAILURE' },
        analytics: [
          {
            event: 'SOCKETIO_PROOF_FAILURE',
            data: {
              error_code: 'E001',
              reason: 'Invalid passport data',
            },
          },
        ],
      });
    });

    it('handles status 5 with minimal data', () => {
      const data: StatusMessage = {
        status: 5,
        error_code: 'E002',
      };

      const result = handleStatusCode(data, 'disclose');

      expect(result.shouldDisconnect).toBe(true);
      expect(result.actorEvent).toEqual({ type: 'PROVE_FAILURE' });
      expect(result.stateUpdate?.error_code).toBe('E002');
      expect(result.stateUpdate?.reason).toBeUndefined();
    });
  });

  describe('success status (4)', () => {
    it('handles success for register circuit', () => {
      const data: StatusMessage = { status: 4 };

      const result = handleStatusCode(data, 'register');

      expect(result).toEqual({
        shouldDisconnect: true,
        stateUpdate: {
          socketConnection: null,
        },
        actorEvent: { type: 'PROVE_SUCCESS' },
        analytics: [
          {
            event: 'SOCKETIO_PROOF_SUCCESS',
          },
          {
            event: 'REGISTER_COMPLETED',
          },
        ],
      });
    });

    it('handles success for non-register circuit', () => {
      const data: StatusMessage = { status: 4 };

      const result = handleStatusCode(data, 'disclose');

      expect(result).toEqual({
        shouldDisconnect: true,
        stateUpdate: {
          socketConnection: null,
        },
        actorEvent: { type: 'PROVE_SUCCESS' },
        analytics: [
          {
            event: 'SOCKETIO_PROOF_SUCCESS',
          },
        ],
      });
    });
  });

  describe('other statuses', () => {
    it('does nothing for status 1 (in progress)', () => {
      const data: StatusMessage = { status: 1 };

      const result = handleStatusCode(data, 'register');

      expect(result).toEqual({
        shouldDisconnect: false,
        analytics: [],
      });
    });

    it('does nothing for status 2 (processing)', () => {
      const data: StatusMessage = { status: 2 };

      const result = handleStatusCode(data, 'disclose');

      expect(result).toEqual({
        shouldDisconnect: false,
        analytics: [],
      });
    });

    it('does nothing for unknown status', () => {
      const data: StatusMessage = { status: 99 };

      const result = handleStatusCode(data, 'register');

      expect(result).toEqual({
        shouldDisconnect: false,
        analytics: [],
      });
    });
  });
});
