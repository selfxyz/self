// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { KycData } from '@selfxyz/mobile-sdk-alpha/browser';
import { deserializeApplicantInfo } from '@selfxyz/mobile-sdk-alpha/browser';

import type { KycProviderResult } from '../types/kycProvider';

/**
 * Constructs a KycData document from a provider result's attestation.
 * The returned object is suitable for passing to storeDocumentWithDeduplication().
 */
export function buildKycDocument(result: KycProviderResult): KycData {
  if (!result.attestation) {
    throw new Error('Cannot build KYC document: attestation missing');
  }

  const { serializedApplicantInfo, signature, pubkey } = result.attestation;
  const applicantInfo = deserializeApplicantInfo(serializedApplicantInfo);

  return {
    documentType: applicantInfo.idType as KycData['documentType'],
    documentCategory: 'kyc',
    mock: applicantInfo.idNumber?.startsWith('Mock') ?? false,
    serializedApplicantInfo,
    signature,
    pubkey: [...pubkey],
  };
}
