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

    const parsedBody =
      typeof body === 'string' ? (JSON.parse(body) as SessionResponse) : (body as SessionResponse);

    if (!parsedBody?.sessionToken || typeof parsedBody.sessionToken !== 'string') {
      throw new Error('Failed to create KYC session: Missing session token in response');
    }

    return parsedBody;
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
  if (!sessionToken?.trim()) {
    throw new Error('Failed to launch KYC verification: Session token is required');
  }

  const result = await startVerification(sessionToken, {
    languageCode: config?.locale ?? 'en',
    loggingEnabled: config?.debug ?? __DEV__,
  });

  if (!result || typeof result !== 'object') {
    throw new Error('Failed to launch KYC verification: Invalid provider response');
  }

  return result as KycVerificationResult;
};
