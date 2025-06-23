//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

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
  [key: string]: any;
}

const segmentClient = createSegmentClient();

function cleanParams(params: Record<string, any>) {
  const newParams = {};
  for (const key of Object.keys(params)) {
    if (typeof params[key] !== 'function') {
      (newParams as Record<string, any>)[key] = params[key];
    }
  }
  return newParams;
}

/**
 * Validates event parameters to ensure they follow standards
 * - Ensures numeric values are properly formatted
 */
function validateParams(
  properties?: Record<string, any>,
): Record<string, any> | undefined {
  if (!properties) return undefined;

  const validatedProps = { ...properties };

  // Ensure duration is formatted as a number with at most 2 decimal places
  if (validatedProps.duration_seconds !== undefined) {
    if (typeof validatedProps.duration_seconds === 'string') {
      validatedProps.duration_seconds = parseFloat(
        validatedProps.duration_seconds,
      );
    }
    // Format to 2 decimal places
    validatedProps.duration_seconds = parseFloat(
      validatedProps.duration_seconds.toFixed(2),
    );
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
    properties?: Record<string, any>,
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
    const trackMethod = (e: string, p?: Record<string, any>) =>
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
    trackScreenView: (screenName: string, properties?: Record<string, any>) => {
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
