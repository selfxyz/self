// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export interface StatusHandlerResult {
  shouldDisconnect: boolean;
  stateUpdate?: {
    error_code?: string;
    reason?: string;
    socketConnection?: null;
  };
  actorEvent?: {
    type: 'PROVE_FAILURE' | 'PROVE_SUCCESS';
  };
  analytics?: Array<{
    event: string;
    data?: Record<string, unknown>;
  }>;
}

/**
 * Pure functions for handling Socket.IO status messages
 * These can be tested independently without mocking complex dependencies
 */
export interface StatusMessage {
  status: number;
  error_code?: string;
  reason?: string;
}

/**
 * Determine actions to take based on status code
 */
export function handleStatusCode(data: StatusMessage, circuitType: string): StatusHandlerResult {
  const result: StatusHandlerResult = {
    shouldDisconnect: false,
    analytics: [],
  };

  // Failure statuses (3 or 5)
  if (data.status === 3 || data.status === 5) {
    result.shouldDisconnect = true;
    result.stateUpdate = {
      error_code: data.error_code,
      reason: data.reason,
      socketConnection: null,
    };
    result.actorEvent = { type: 'PROVE_FAILURE' };
    result.analytics = [
      {
        event: 'SOCKETIO_PROOF_FAILURE',
        data: {
          error_code: data.error_code,
          reason: data.reason,
        },
      },
    ];
    return result;
  }

  // Success status (4)
  if (data.status === 4) {
    result.shouldDisconnect = true;
    result.stateUpdate = {
      socketConnection: null,
    };
    result.actorEvent = { type: 'PROVE_SUCCESS' };
    result.analytics = [
      {
        event: 'SOCKETIO_PROOF_SUCCESS',
      },
    ];

    // Additional tracking for register circuit
    if (circuitType === 'register') {
      result.analytics.push({
        event: 'REGISTER_COMPLETED',
      });
    }

    return result;
  }

  // Other statuses - no action needed
  return result;
}

/**
 * Parse incoming socket message into structured data
 */
export function parseStatusMessage(message: unknown): StatusMessage {
  if (typeof message === 'string') {
    try {
      return JSON.parse(message) as StatusMessage;
    } catch {
      throw new Error('Invalid JSON message received');
    }
  }

  if (typeof message === 'object' && message !== null) {
    return message as StatusMessage;
  }

  throw new Error('Invalid message format');
}
