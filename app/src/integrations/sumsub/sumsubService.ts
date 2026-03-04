// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { SUMSUB_TEE_URL } from '@env';
import SNSMobileSDK from '@sumsub/react-native-mobilesdk-module';

import { alpha2ToAlpha3 } from '@selfxyz/new-common';

import type {
  AccessTokenResponse,
  SumsubResult,
} from '@/integrations/sumsub/types';

// Maps Self document type codes to Sumsub document types
type SelfDocumentType = 'p' | 'i';
type SumsubDocumentType = 'PASSPORT' | 'ID_CARD';

const DOCUMENT_TYPE_MAP: Record<SelfDocumentType, SumsubDocumentType> = {
  p: 'PASSPORT',
  i: 'ID_CARD',
};

export interface SumsubConfig {
  accessToken: string;
  locale?: string;
  debug?: boolean;
  /** Self document type code ('p' for passport, 'i' for ID card) */
  documentType?: SelfDocumentType;
  /** ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB') */
  countryCode?: string;
  onStatusChanged?: (prevStatus: string, newStatus: string) => void;
  onEvent?: (eventType: string, payload: unknown) => void;
}

const FETCH_TIMEOUT_MS = 30000; // 30 seconds

export const fetchAccessToken = async (): Promise<AccessTokenResponse> => {
  const apiUrl = SUMSUB_TEE_URL;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiUrl}/access-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
  let sdk = SNSMobileSDK.init(config.accessToken, async () => {
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
    // Platform configuration:
    // - Device Intelligence (Fisherman): Enabled on both iOS and Android
    //   * iOS: Configured via IDENSIC_WITH_FISHERMAN in Podfile
    //   * Android: Configured via idensic-mobile-sdk-fisherman in patch file
    //   * Privacy: iOS declares device ID collection in PrivacyInfo.xcprivacy
    //   * Privacy: Android should declare device fingerprinting in Google Play Data Safety
    // - VideoIdent (live video calls): Disabled on both platforms for current release
    //   * iOS: Disabled in Podfile (avoids microphone permission requirements)
    //   * Android: Disabled in patch file (avoids FOREGROUND_SERVICE_MICROPHONE permission)
    //   * Note: VideoIdent will be re-enabled on both platforms in future release for liveness checks
    .withAnalyticsEnabled(true); // Required for Device Intelligence to function

  // Pre-select document type and country if provided
  // This skips the document selection step in Sumsub
  if (config.documentType && config.countryCode) {
    const sumsubDocType = DOCUMENT_TYPE_MAP[config.documentType];
    // Handle both 2-letter (US) and 3-letter (USA) country codes
    // alpha2ToAlpha3 returns undefined for 3-letter codes, so use the original if conversion fails
    const alpha3Country =
      alpha2ToAlpha3(config.countryCode) ?? config.countryCode;

    if (sumsubDocType && alpha3Country) {
      console.log(
        `[Sumsub] Pre-selecting document: ${sumsubDocType} from ${alpha3Country}`,
      );
      sdk = sdk.withPreferredDocumentDefinitions({
        IDENTITY: {
          idDocType: sumsubDocType,
          country: alpha3Country,
        },
      });
    }
  }

  return sdk.build().launch();
};
