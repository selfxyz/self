// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { KycProviderResult } from '../types/kycProvider';

const FETCH_TIMEOUT_MS = 30_000;

const SUMSUB_TEE_URL =
  import.meta.env.VITE_SUMSUB_TEE_URL ?? 'https://sumsub-tee.self.xyz';

export interface SumsubAccessToken {
  token: string;
  userId: string;
}

export async function fetchSumsubAccessToken(
  signal?: AbortSignal,
): Promise<SumsubAccessToken> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetch(`${SUMSUB_TEE_URL}/access-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Failed to get Sumsub access token (HTTP ${response.status})`,
      );
    }

    const body: unknown = await response.json();
    if (typeof body === 'string') {
      return JSON.parse(body) as SumsubAccessToken;
    }
    return body as SumsubAccessToken;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        `Sumsub access token request timed out after ${FETCH_TIMEOUT_MS / 1000}s`,
      );
    }
    if (err instanceof Error) {
      throw new Error(`Failed to get Sumsub access token: ${err.message}`);
    }
    throw new Error('Failed to get Sumsub access token: Unknown error');
  }
}

type SumsubMessageType =
  | 'idCheck.onReady'
  | 'idCheck.onInitialized'
  | 'idCheck.applicantStatus'
  | 'idCheck.onApplicantLoaded'
  | 'idCheck.onApplicantResubmitted'
  | 'idCheck.onApplicantSubmitted'
  | 'idCheck.onActionSubmitted'
  | 'idCheck.applicantReviewComplete'
  | 'idCheck.moduleResultPresented'
  | 'idCheck.onError'
  | 'idCheck.onStepCompleted'
  | 'idCheck.onStepInitiated'
  | string;

interface SumsubMessage {
  type?: string;
  payload?: Record<string, unknown>;
}

interface SumsubApplicantStatus {
  reviewStatus?: string;
  reviewResult?: {
    reviewAnswer?: string;
  };
}

export interface SumsubLaunchConfig {
  accessToken: string;
  containerId: string;
  verificationId: string;
  locale?: string;
  onComplete: (result: KycProviderResult) => void;
  onError: (result: KycProviderResult) => void;
  onMessage?: (type: SumsubMessageType, payload: unknown) => void;
}

function buildProviderResult(
  verificationId: string,
  overrides: Partial<KycProviderResult>,
): KycProviderResult {
  return {
    status: 'error',
    verificationId,
    provider: 'sumsub',
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function normalizeSumsubStatus(
  verificationId: string,
  applicantStatus: SumsubApplicantStatus | undefined,
): KycProviderResult {
  const reviewAnswer = applicantStatus?.reviewResult?.reviewAnswer;
  const reviewStatus = applicantStatus?.reviewStatus;

  if (reviewAnswer === 'GREEN') {
    return buildProviderResult(verificationId, { status: 'success' });
  }

  if (reviewAnswer === 'RED') {
    return buildProviderResult(verificationId, {
      status: 'error',
      error: {
        code: 'provider_rejected',
        message: 'Verification was rejected by the provider',
        retryable: false,
      },
    });
  }

  if (
    reviewStatus === 'pending' ||
    reviewStatus === 'onHold' ||
    reviewStatus === 'queued'
  ) {
    return buildProviderResult(verificationId, { status: 'partial' });
  }

  return buildProviderResult(verificationId, { status: 'partial' });
}

export async function launchSumsubWebSdk(
  config: SumsubLaunchConfig,
): Promise<() => void> {
  const { default: snsWebSdk } = await import('@sumsub/websdk');

  const container = document.getElementById(config.containerId);
  if (!container) {
    throw new Error(`Container element #${config.containerId} not found`);
  }

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

  const snsWebSdkInstance = snsWebSdk
    .init(config.accessToken, () => fetchSumsubAccessToken().then((t) => t.token))
    .withConf({ lang: config.locale ?? 'en' })
    .withOptions({ addViewportTag: false, adaptIframeHeight: true })
    .on('idCheck.onReady', () => {
      config.onMessage?.('idCheck.onReady', {});
    })
    .on('idCheck.onError', (error: unknown) => {
      config.onMessage?.('idCheck.onError', error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Provider error';
      emitOnce(
        buildProviderResult(config.verificationId, {
          status: 'error',
          error: {
            code: 'provider_unknown_error',
            message,
            retryable: true,
          },
        }),
        true,
      );
    })
    .on(
      'idCheck.applicantStatus',
      (status: SumsubApplicantStatus) => {
        config.onMessage?.('idCheck.applicantStatus', status);
      },
    )
    .on('idCheck.onApplicantSubmitted', () => {
      config.onMessage?.('idCheck.onApplicantSubmitted', {});
      emitOnce(
        buildProviderResult(config.verificationId, { status: 'partial' }),
        false,
      );
    })
    .on(
      'idCheck.applicantReviewComplete',
      (status: SumsubApplicantStatus) => {
        config.onMessage?.('idCheck.applicantReviewComplete', status);
        const result = normalizeSumsubStatus(config.verificationId, status);
        const isError = result.status === 'error';
        emitOnce(result, isError);
      },
    )
    .on(
      'idCheck.moduleResultPresented',
      (payload: SumsubMessage) => {
        config.onMessage?.('idCheck.moduleResultPresented', payload);
      },
    )
    .onMessage((type: SumsubMessageType, payload: unknown) => {
      config.onMessage?.(type, payload);
    })
    .build();

  snsWebSdkInstance.launch(container);

  return () => {
    snsWebSdkInstance.destroy();
  };
}
