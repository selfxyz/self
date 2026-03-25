// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type KycProviderErrorCode =
  | 'provider_cancelled'
  | 'provider_timeout'
  | 'provider_rejected'
  | 'provider_missing_attestation'
  | 'provider_unavailable'
  | 'provider_protocol_error'
  | 'provider_unknown_error';

export interface KycProviderError {
  code: KycProviderErrorCode;
  message: string;
  retryable?: boolean;
  providerCode?: string;
}

export interface KycProviderAttestation {
  serializedApplicantInfo: string;
  signature: string;
  pubkey: [string, string];
}

export type KycProviderStatus = 'success' | 'partial' | 'cancel' | 'error';

export interface KycProviderResult {
  status: KycProviderStatus;
  verificationId: string;
  provider: string;
  providerSessionId?: string;
  providerApplicantId?: string;
  completedAt?: string;
  attestation?: KycProviderAttestation;
  error?: KycProviderError;
}
