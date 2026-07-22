// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { IDCardProps } from '@selfxyz/euclid';
import type { BridgeError, VerificationResult } from '@selfxyz/webview-bridge';

export type GenerationStep = 'readingRegistry' | 'generatingProof' | 'awaitingVerification' | 'finishingUp';

// Builds the terminal VerificationResult delivered to the host via
// `lifecycle.setResult`. Shared by DiscloseResultScreen (Continue button) and
// ProofGenerationRouteScreen (terminal store state) so both emit an identical
// payload. Field names mirror `emitVerificationComplete` in provingMachine.ts.
export function buildVerificationResult(params: {
  success: boolean;
  userId?: string;
  verificationId?: string;
  error?: BridgeError;
}): VerificationResult {
  const { success, userId, verificationId, error } = params;
  if (success) {
    return {
      success: true,
      userId,
      verificationId,
      claims: { resultType: 'proofRequested' },
    };
  }
  return {
    success: false,
    userId,
    verificationId,
    claims: { resultType: 'proofRequested' },
    error: error ?? {
      code: 'proof_generation_failed',
      message: 'The proof request could not be completed.',
    },
  };
}

export function getFailureState(
  currentState: string,
  code: string | null,
  reason: string | null,
): { code: string; message: string } {
  return {
    code: code ?? currentState ?? 'proof_generation_failed',
    message: reason ?? 'The proof request could not be completed.',
  };
}

export function getGenerationStep(currentState: string): GenerationStep {
  switch (currentState) {
    case 'parsing_id_document':
    case 'fetching_data':
      return 'readingRegistry';
    case 'validating_document':
    case 'init_tee_connexion':
    case 'ready_to_prove':
    case 'proving':
      return 'generatingProof';
    case 'listening_for_status':
      return 'awaitingVerification';
    case 'post_proving':
      return 'finishingUp';
    default:
      return 'readingRegistry';
  }
}

export function getDiscloseStep(currentState: string | null): GenerationStep {
  if (!currentState) return 'readingRegistry';
  switch (currentState) {
    case 'idle':
    case 'parsing_id_document':
    case 'fetching_data':
    case 'validating_document':
      return 'readingRegistry';
    case 'init_tee_connexion':
    case 'ready_to_prove':
    case 'proving':
      return 'generatingProof';
    case 'post_proving':
      return 'awaitingVerification';
    case 'completed':
      return 'finishingUp';
    default:
      return 'readingRegistry';
  }
}

export function getIdCardProps(documentCategory?: string, mock?: boolean): IDCardProps {
  if (mock && (!documentCategory || documentCategory === 'passport')) {
    // dev-passport variant needs cardMoire: 'dev' for the distinct developer
    // moire visual; without it, the IDCard falls back to a plain dark card
    // indistinguishable from a real passport.
    return {
      variant: 'dev-passport',
      title: 'Mock Passport',
      subtitle: 'Developer test passport',
      cardMoire: 'dev',
    };
  }
  switch (documentCategory) {
    case 'id_card':
      return { variant: 'id-card', title: 'ID Card', subtitle: 'Biometric Identification Card' };
    case 'aadhaar':
      return { variant: 'aadhaar', title: 'Aadhaar', subtitle: 'Verified IN Aadhaar ID' };
    case 'kyc':
      return { variant: 'pending', title: 'KYC Record', subtitle: 'Verification document loaded' };
    case 'passport':
    default:
      return { variant: 'passport', title: 'Passport', subtitle: 'Biometric Passport' };
  }
}

export function normalizeError(error: BridgeError | string | undefined): BridgeError | undefined {
  if (!error) {
    return undefined;
  }
  if (typeof error === 'string') {
    return {
      code: 'proof_generation_failed',
      message: error,
    };
  }
  return error;
}

export function titleCaseDisclosure(disclosure: string): string {
  return disclosure
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, match => match.toUpperCase());
}
