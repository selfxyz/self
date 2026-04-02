// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { IDCardProps } from '@selfxyz/euclid';
import type { BridgeError } from '@selfxyz/webview-bridge';

import { humanizeError } from './contractErrors';

export type GenerationStep = 'readingRegistry' | 'generatingProof' | 'awaitingVerification' | 'finishingUp';

export function getFailureState(
  currentState: string,
  code: string | null,
  reason: string | null,
): { code: string; message: string } {
  return {
    code: code ?? currentState ?? 'proof_generation_failed',
    message: reason ? humanizeError(reason) : 'The proof request could not be completed.',
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

export function getIdCardProps(documentCategory?: string): IDCardProps {
  switch (documentCategory) {
    case 'id_card':
      return { variant: 'id-card', title: 'ID Card', subtitle: 'Verified ID' };
    case 'aadhaar':
      return { variant: 'aadhaar', title: 'Aadhaar', subtitle: 'Verified IN Aadhaar ID' };
    case 'kyc':
      return { variant: 'pending', title: 'KYC Record', subtitle: 'Verification document loaded' };
    case 'passport':
    default:
      return { variant: 'passport', title: 'Passport', subtitle: 'Verified Passport' };
  }
}

export function normalizeError(error: BridgeError | string | undefined): BridgeError | undefined {
  if (!error) {
    return undefined;
  }
  if (typeof error === 'string') {
    return {
      code: 'proof_generation_failed',
      message: humanizeError(error),
    };
  }
  return {
    ...error,
    message: humanizeError(error.message),
  };
}

export function titleCaseDisclosure(disclosure: string): string {
  return disclosure
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, match => match.toUpperCase());
}
