// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { SUMSUB_TEE_URL } from '@env';
import SNSMobileSDK from '@sumsub/react-native-mobilesdk-module';

import type { AccessTokenResponse } from './types';

export interface SumsubConfig {
  accessToken: string;
  locale?: string;
  debug?: boolean;
  onStatusChanged?: (prevStatus: string, newStatus: string) => void;
  onEvent?: (eventType: string, payload: unknown) => void;
}

export interface SumsubResult {
  success: boolean;
  status: string;
  errorType?: string;
  errorMsg?: string;
}

export const fetchAccessToken = async (
  phoneNumber: string,
): Promise<AccessTokenResponse> => {
  const apiUrl = SUMSUB_TEE_URL;

  const response = await fetch(`${apiUrl}/access-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone: phoneNumber }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token (${response.status})`);
  }

  const body = await response.json();

  // Handle both string and object responses
  if (typeof body === 'string') {
    return JSON.parse(body) as AccessTokenResponse;
  }

  return body as AccessTokenResponse;
};

export const launchSumsub = async (
  config: SumsubConfig,
): Promise<SumsubResult> => {
  const sdk = SNSMobileSDK.init(config.accessToken, async () => {
    // Token refresh handler - for test flow, just return empty
    // In production, call backend to get new token
    console.warn(
      'Sumsub token expired - refresh not implemented for test flow',
    );
    return '';
  })
    .withHandlers({
      onStatusChanged: event => {
        console.log(`Sumsub status: ${event.prevStatus} => ${event.newStatus}`);
        config.onStatusChanged?.(event.prevStatus, event.newStatus);
      },
      onLog: event => {
        console.log(`[Sumsub] ${event.message}`);
      },
      onEvent: event => {
        console.log(`Sumsub event: ${JSON.stringify(event)}`);
        config.onEvent?.(event.eventType, event.payload);
      },
    })
    .withDebug(config.debug ?? __DEV__)
    .withLocale(config.locale ?? 'en')
    .withAnalyticsEnabled(true) // Device Intelligence requires this
    .build();

  return sdk.launch();
};
