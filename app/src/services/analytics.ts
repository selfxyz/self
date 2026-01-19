// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';
import { ENABLE_DEBUG_LOGS, MIXPANEL_NFC_PROJECT_TOKEN } from '@env';
import NetInfo from '@react-native-community/netinfo';
import type { JsonMap, JsonValue } from '@segment/analytics-react-native';

import type { TrackEventParams } from '@selfxyz/mobile-sdk-alpha';

import { createSegmentClient } from '@/config/segment';
import { PassportReader } from '@/integrations/nfc/passportReader';

// ============================================================================
// Constants
// ============================================================================

const MIXPANEL_AUTO_FLUSH_THRESHOLD = 5;
const MAX_EVENT_QUEUE_SIZE = 100;

// ============================================================================
// State Management
// ============================================================================

const segmentClient = createSegmentClient();

let mixpanelConfigured = false;
let eventCount = 0;
let isConnected = true;
let isNfcScanningActive = false; // Track NFC scanning state
const eventQueue: Array<{
  name: string;
  properties?: Record<string, unknown>;
}> = [];

// ============================================================================
// Internal Helpers - JSON Coercion
// ============================================================================

function coerceToJsonValue(
  value: unknown,
  seen = new WeakSet(),
): JsonValue | undefined {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value as JsonValue;
  }
  if (Array.isArray(value)) {
    const arr: JsonValue[] = [];
    for (const item of value) {
      const v = coerceToJsonValue(item, seen);
      if (v === undefined) continue;
      arr.push(v);
    }
    return arr as JsonValue;
  }
  if (typeof value === 'object' && value) {
    // Check for circular references
    if (seen.has(value)) {
      return undefined; // Skip circular references
    }
    seen.add(value);

    const obj: JsonMap = {};
    for (const [k, v] of Object.entries(value)) {
      const coerced = coerceToJsonValue(v, seen);
      if (coerced !== undefined) obj[k] = coerced;
    }
    return obj as JsonValue;
  }
  // drop functions/undefined/symbols
  return undefined;
}

function cleanParams(params: Record<string, unknown>): JsonMap {
  const cleaned: JsonMap = {};
  for (const [key, value] of Object.entries(params)) {
    const v = coerceToJsonValue(value);
    if (v !== undefined) cleaned[key] = v;
  }
  return cleaned;
}

/**
 * Validates event parameters to ensure they follow standards
 * - Ensures numeric values are properly formatted
 */
function validateParams(
  properties?: Record<string, unknown>,
): JsonMap | undefined {
  if (!properties) return undefined;

  const validatedProps = { ...properties };

  // Ensure duration is formatted as a number with at most 2 decimal places
  if (validatedProps.duration_seconds !== undefined) {
    const duration = Number(validatedProps.duration_seconds);
    validatedProps.duration_seconds = parseFloat(duration.toFixed(2));
  }

  return cleanParams(validatedProps);
}

// ============================================================================
// Internal Helpers - Event Tracking
// ============================================================================

/**
 * Internal tracking function used by trackEvent and trackScreenView
 * Records analytics events and screen views
 * In development mode, events are logged to console instead of being sent to Segment
 *
 * NOTE: Screen views are tracked as 'Screen Viewed' events for Mixpanel compatibility
 */
function _track(
  type: 'event' | 'screen',
  eventName: string,
  properties?: Record<string, unknown>,
) {
  // Transform screen events for Mixpanel compatibility
  const finalEventName = type === 'screen' ? `Viewed ${eventName}` : eventName;

  // Validate and clean properties
  const validatedProps = validateParams(properties);

  if (__DEV__) {
    console.log(`[DEV: Analytics ${type.toUpperCase()}]`, {
      name: finalEventName,
      properties: validatedProps,
    });
    return;
  }

  if (!segmentClient) {
    return;
  }

  // Always use track() for both events and screen views (Mixpanel compatibility)
  if (!validatedProps) {
    // you may need to remove the catch when debugging
    return segmentClient.track(finalEventName).catch(console.info);
  }

  // you may need to remove the catch when debugging
  segmentClient.track(finalEventName, validatedProps).catch(console.info);
}

// ============================================================================
// Public API - Segment Analytics
// ============================================================================

/**
 * Cleanup function to clear event queues
 */
export const cleanupAnalytics = () => {
  eventQueue.length = 0;
  eventCount = 0;
};

// ============================================================================
// Public API - Mixpanel NFC Analytics
// ============================================================================
export const configureNfcAnalytics = async () => {
  if (!MIXPANEL_NFC_PROJECT_TOKEN || mixpanelConfigured) return;
  const enableDebugLogs = ENABLE_DEBUG_LOGS;

  // Check if PassportReader and configure method exist (Android doesn't have configure)
  if (PassportReader && typeof PassportReader.configure === 'function') {
    try {
      // iOS configure method only accepts token and enableDebugLogs
      // Android doesn't have this method at all
      await Promise.resolve(
        PassportReader.configure(MIXPANEL_NFC_PROJECT_TOKEN, enableDebugLogs),
      );
    } catch (error) {
      console.warn('Failed to configure NFC analytics:', error);
    }
  }

  setupFlushPolicies();
  mixpanelConfigured = true;
};

/**
 * Flush any pending analytics events immediately
 */
export const flush = () => {
  if (!__DEV__ && segmentClient) {
    segmentClient.flush();
  }
};

/**
 * Consolidated analytics flush function that flushes both Segment and Mixpanel events
 * This should be called when you want to ensure all analytics events are sent immediately
 */
export const flushAllAnalytics = () => {
  // Flush Segment analytics
  flush();

  // Never flush Mixpanel during active NFC scanning to prevent interference
  if (!isNfcScanningActive) {
    flushMixpanelEvents().catch(console.warn);
  }
};

/**
 * Set NFC scanning state to prevent analytics flush interference
 */
export const setNfcScanningActive = (active: boolean) => {
  isNfcScanningActive = active;
  if (__DEV__)
    console.log(
      `[NFC Analytics] Scanning state: ${active ? 'active' : 'inactive'}`,
    );

  // Flush queued events when scanning completes
  if (!active && eventQueue.length > 0) {
    flushMixpanelEvents().catch(console.warn);
  }
};

/**
 * Track an analytics event
 * @param eventName - Name of the event to track
 * @param properties - Optional properties to attach to the event
 */
export const trackEvent = (
  eventName: string,
  properties?: TrackEventParams,
) => {
  _track('event', eventName, properties);
};

export const trackNfcEvent = async (
  name: string,
  properties?: Record<string, unknown>,
) => {
  if (!MIXPANEL_NFC_PROJECT_TOKEN) return;
  if (!mixpanelConfigured) await configureNfcAnalytics();

  if (!isConnected || isNfcScanningActive) {
    if (eventQueue.length >= MAX_EVENT_QUEUE_SIZE) {
      if (__DEV__)
        console.warn('[Mixpanel] Event queue full, dropping oldest event');
      eventQueue.shift();
    }
    eventQueue.push({ name, properties });
    return;
  }

  try {
    if (PassportReader && PassportReader.trackEvent) {
      await Promise.resolve(PassportReader.trackEvent(name, properties));
    }
    eventCount++;
    // Prevent automatic flush during NFC scanning
    if (eventCount >= MIXPANEL_AUTO_FLUSH_THRESHOLD && !isNfcScanningActive) {
      flushMixpanelEvents().catch(console.warn);
    }
  } catch {
    if (eventQueue.length >= MAX_EVENT_QUEUE_SIZE) {
      if (__DEV__)
        console.warn('[Mixpanel] Event queue full, dropping oldest event');
      eventQueue.shift();
    }
    eventQueue.push({ name, properties });
  }
};

const setupFlushPolicies = () => {
  AppState.addEventListener('change', (state: AppStateStatus) => {
    // Never flush during active NFC scanning to prevent interference
    if (
      (state === 'background' || state === 'active') &&
      !isNfcScanningActive
    ) {
      flushMixpanelEvents().catch(console.warn);
    }
  });

  NetInfo.addEventListener(state => {
    isConnected = state.isConnected ?? true;
    // Never flush during active NFC scanning to prevent interference
    if (isConnected && !isNfcScanningActive) {
      flushMixpanelEvents().catch(console.warn);
    }
  });
};

const flushMixpanelEvents = async () => {
  if (!MIXPANEL_NFC_PROJECT_TOKEN) return;
  // Skip flush if NFC scanning is active to prevent interference
  if (isNfcScanningActive) {
    if (__DEV__) console.log('[Mixpanel] flush skipped - NFC scanning active');
    return;
  }

  // Ensure we don't drop events if the native reader isn't available
  if (!PassportReader?.trackEvent) {
    if (__DEV__)
      console.warn('[Mixpanel] flush skipped - NFC module unavailable');
    return;
  }

  try {
    if (__DEV__) console.log('[Mixpanel] flush');
    // Send any queued events before flushing
    while (eventQueue.length > 0) {
      const evt = eventQueue.shift()!;
      try {
        await Promise.resolve(
          PassportReader.trackEvent(evt.name, evt.properties),
        );
      } catch (trackErr) {
        // Put the event back and abort; we'll retry on the next flush
        eventQueue.unshift(evt);
        throw trackErr;
      }
    }
    if (PassportReader.flush) {
      await Promise.resolve(PassportReader.flush());
    }
    // Only reset event count after successful send/flush
    eventCount = 0;
  } catch (err) {
    if (__DEV__) console.warn('Mixpanel flush failed', err);
    // Events have been re-queued on failure, so they're not lost
  }
};

/**
 * Track a screen view
 * @param screenName - Name of the screen to track
 * @param properties - Optional properties to attach to the screen view
 */
export const trackScreenView = (
  screenName: string,
  properties?: Record<string, unknown>,
) => {
  _track('screen', screenName, properties);
};
