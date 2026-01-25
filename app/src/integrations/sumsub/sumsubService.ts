// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { SUMSUB_TEE_URL } from '@env';
import SNSMobileSDK from '@sumsub/react-native-mobilesdk-module';

import type {
  AccessTokenResponse,
  SumsubResult,
} from '@/integrations/sumsub/types';

export interface SumsubConfig {
  accessToken: string;
  locale?: string;
  debug?: boolean;
  onStatusChanged?: (prevStatus: string, newStatus: string) => void;
  onEvent?: (eventType: string, payload: unknown) => void;
}

const FETCH_TIMEOUT_MS = 30000; // 30 seconds

export const fetchAccessToken = async (
  phoneNumber: string,
): Promise<AccessTokenResponse> => {
  const apiUrl = SUMSUB_TEE_URL;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiUrl}/access-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: phoneNumber }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Failed to get Sumsub access token (HTTP ${response.status})`,
      );
    }

    const body = await response.json();

    // Handle both string and object responses
    if (typeof body === 'string') {
      return JSON.parse(body) as AccessTokenResponse;
    }

    return body as AccessTokenResponse;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error(
          `Request to Sumsub TEE timed out after ${FETCH_TIMEOUT_MS / 1000}s`,
        );
      }
      throw new Error(`Failed to get Sumsub access token: ${err.message}`);
    }

    throw new Error('Failed to get Sumsub access token: Unknown error');
  }
};

export const launchSumsub = async (
  config: SumsubConfig,
): Promise<SumsubResult> => {
  const sdk = SNSMobileSDK.init(config.accessToken, async () => {
    // Token refresh not implemented for test flow
    throw new Error(
      'Sumsub token expired - refresh not implemented for test flow',
    );
  })
    .withHandlers({
      onStatusChanged: event => {
        console.log(`Sumsub status: ${event.prevStatus} => ${event.newStatus}`);
        config.onStatusChanged?.(event.prevStatus, event.newStatus);
      },
      onLog: _event => {
        // Log event received but don't log message (may contain PII)
        console.log('[Sumsub] Log event received');
      },
      onEvent: event => {
        // Only log event type, not full payload (may contain PII)
        console.log(`Sumsub event: ${event.eventType}`);
        config.onEvent?.(event.eventType, event.payload);
      },
    })
    .withDebug(config.debug ?? __DEV__)
    .withLocale(config.locale ?? 'en')
    .withAnalyticsEnabled(true) // Device Intelligence requires this
    .build();

  return sdk.launch();
};
