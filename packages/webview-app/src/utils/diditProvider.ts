// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { KycProviderResult } from '../types/kycProvider';

const FETCH_TIMEOUT_MS = 30_000;

const DIDIT_TEE_URL =
  import.meta.env.VITE_DIDIT_TEE_URL ?? 'https://didit-tee.self.xyz';

export interface DiditSession {
  sessionId: string;
  sessionToken: string;
  url: string;
}

export async function createDiditSession(
  signal?: AbortSignal,
): Promise<DiditSession> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetch(`${DIDIT_TEE_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Failed to create Didit session (HTTP ${response.status})`,
      );
    }

    const body: unknown = await response.json();
    if (typeof body === 'string') {
      return JSON.parse(body) as DiditSession;
    }
    return body as DiditSession;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        `Didit session request timed out after ${FETCH_TIMEOUT_MS / 1000}s`,
      );
    }
    if (err instanceof Error) {
      throw new Error(`Failed to create Didit session: ${err.message}`);
    }
    throw new Error('Failed to create Didit session: Unknown error');
  }
}

function buildProviderResult(
  verificationId: string,
  overrides: Partial<KycProviderResult>,
): KycProviderResult {
  return {
    status: 'error',
    verificationId,
    provider: 'didit',
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}

export interface DiditLaunchConfig {
  url: string;
  containerId: string;
  verificationId: string;
  onComplete: (result: KycProviderResult) => void;
  onError: (result: KycProviderResult) => void;
  onEvent?: (event: string, payload: unknown) => void;
}

export async function launchDiditWebSdk(
  config: DiditLaunchConfig,
): Promise<() => void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { DiditSdk } = (await import('@didit-protocol/sdk-web')) as any;

  let hasCompleted = false;

  const emitOnce = (result: KycProviderResult, isError: boolean) => {
    if (hasCompleted) return;
    hasCompleted = true;
    if (isError) {
      config.onError(result);
    } else {
      config.onComplete(result);
    }
  };

  DiditSdk.shared.onComplete = (sdkResult: {
    type: 'completed' | 'cancelled' | 'failed';
    session?: { status: string; sessionId: string };
    error?: { type: string; message: string };
  }) => {
    if (sdkResult.type === 'completed') {
      const status = sdkResult.session?.status;
      if (status === 'Declined') {
        emitOnce(
          buildProviderResult(config.verificationId, {
            status: 'error',
            providerSessionId: sdkResult.session?.sessionId,
            error: {
              code: 'provider_rejected',
              message: 'Verification was declined by the provider',
              retryable: false,
            },
          }),
          true,
        );
      } else {
        emitOnce(
          buildProviderResult(config.verificationId, {
            status: status === 'Approved' ? 'success' : 'partial',
            providerSessionId: sdkResult.session?.sessionId,
          }),
          false,
        );
      }
    } else if (sdkResult.type === 'cancelled') {
      emitOnce(
        buildProviderResult(config.verificationId, { status: 'cancel' }),
        false,
      );
    } else if (sdkResult.type === 'failed') {
      emitOnce(
        buildProviderResult(config.verificationId, {
          status: 'error',
          error: {
            code: 'provider_unknown_error',
            message: sdkResult.error?.message ?? 'Verification failed',
            retryable: true,
          },
        }),
        true,
      );
    }
  };

  DiditSdk.shared.onEvent = (event: { type?: string }) => {
    config.onEvent?.(event.type ?? 'unknown', event);
  };

  DiditSdk.shared.startVerification({
    url: config.url,
    configuration: {
      embedded: true,
      embeddedContainerId: config.containerId,
    },
  });

  return () => {
    DiditSdk.shared.close();
  };
}
