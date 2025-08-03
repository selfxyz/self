// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { createSegmentClient } from '../Segment';

/**
 * Generic reasons:
 * - network_error: Network connectivity issues
 * - user_cancelled: User cancelled the operation
 * - permission_denied: Permission not granted
 * - invalid_input: Invalid user input
 * - timeout: Operation timed out
 * - unknown_error: Unspecified error
 *
 * Auth specific:
 * - invalid_credentials: Invalid login credentials
 * - biometric_unavailable: Biometric authentication unavailable
 * - invalid_mnemonic: Invalid mnemonic phrase
 *
 * Passport specific:
 * - invalid_format: Invalid passport format
 * - expired_passport: Passport is expired
 * - scan_error: Error during scanning
 * - nfc_error: NFC read error
 *
 * Proof specific:
 * - verification_failed: Proof verification failed
 * - session_expired: Session expired
 * - missing_fields: Required fields missing
 *
 * Backup specific:
 * - backup_not_found: Backup not found
 * - cloud_service_unavailable: Cloud service unavailable
 */

export interface EventParams {
  reason?: string | null;
  duration_seconds?: number;
  attempt_count?: number;
  [key: string]: unknown;
}

const segmentClient = createSegmentClient();

function cleanParams(params: Record<string, unknown>) {
  const newParams: Record<string, unknown> = {};
  for (const key of Object.keys(params)) {
    if (typeof params[key] !== 'function') {
      newParams[key] = params[key];
    }
  }
  return newParams;
}

/**
 * Validates event parameters to ensure they follow standards
 * - Ensures numeric values are properly formatted
 */
function validateParams(
  properties?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!properties) return undefined;

  const validatedProps = { ...properties } as EventParams;

  // Ensure duration is formatted as a number with at most 2 decimal places
  if (validatedProps.duration_seconds !== undefined) {
    const duration = Number(validatedProps.duration_seconds);
    validatedProps.duration_seconds = parseFloat(duration.toFixed(2));
  }

  return cleanParams(validatedProps);
}

/*
  Records analytics events and screen views
  In development mode, events are logged to console instead of being sent to Segment
 */
const analytics = () => {
  function _track(
    type: 'event' | 'screen',
    eventName: string,
    properties?: Record<string, unknown>,
  ) {
    // Validate and clean properties
    const validatedProps = validateParams(properties);

    if (__DEV__) {
      console.log(`[DEV: Analytics ${type.toUpperCase()}]`, {
        name: eventName,
        properties: validatedProps,
      });
      return;
    }

    if (!segmentClient) {
      return;
    }
    const trackMethod = (e: string, p?: Record<string, unknown>) =>
      type === 'screen'
        ? segmentClient.screen(e, p)
        : segmentClient.track(e, p);

    if (!validatedProps) {
      // you may need to remove the catch when debugging
      return trackMethod(eventName).catch(console.info);
    }

    // you may need to remove the catch when debugging
    trackMethod(eventName, validatedProps).catch(console.info);
  }

  return {
    // Using LiteralCheck will allow constants but not plain string literals
    trackEvent: (eventName: string, properties?: EventParams) => {
      _track('event', eventName, properties);
    },
    trackScreenView: (
      screenName: string,
      properties?: Record<string, unknown>,
    ) => {
      _track('screen', screenName, properties);
    },
    flush: () => {
      if (!__DEV__ && segmentClient) {
        segmentClient.flush();
      }
    },
  };
};

export default analytics;
