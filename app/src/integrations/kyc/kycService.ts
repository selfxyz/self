// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { startVerification } from '@didit-protocol/sdk-react-native';
import { KYC_TEE_URL } from '@env';

import type {
  KycVerificationResult,
  SessionResponse,
} from '@/integrations/kyc/types';

export interface KycLaunchConfig {
  locale?: string;
  debug?: boolean;
}

const FETCH_TIMEOUT_MS = 30000;

export const createKycSession = async (): Promise<SessionResponse> => {
  const apiUrl = KYC_TEE_URL;
  console.log('[Didit] createSession URL:', apiUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiUrl}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to create KYC session (HTTP ${response.status})`);
    }

    const body = await response.json();

    if (typeof body === 'string') {
      return JSON.parse(body) as SessionResponse;
    }

    return body as SessionResponse;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error(
          `Request to KYC TEE timed out after ${FETCH_TIMEOUT_MS / 1000}s`,
        );
      }
      throw new Error(`Failed to create KYC session: ${err.message}`);
    }

    throw new Error('Failed to create KYC session: Unknown error');
  }
};

export const launchKycVerification = async (
  sessionToken: string,
  config?: KycLaunchConfig,
): Promise<KycVerificationResult> => {
  // Liveness and other verification steps are workflow-controlled on the Didit
  // Console, not configurable here. Do not add SDK-level liveness flags.
  const result = await startVerification(sessionToken, {
    languageCode: config?.locale ?? 'en',
    loggingEnabled: config?.debug ?? __DEV__,
  });

  return result as KycVerificationResult;
};
