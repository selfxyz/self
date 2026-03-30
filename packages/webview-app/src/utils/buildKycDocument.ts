// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { KycProviderAttestation } from '../types/kycProvider';

// KYC byte layout constants (matches didit-tee 295-byte format)
const KYC_ID_TYPE_INDEX = 3;
const KYC_ID_TYPE_LENGTH = 27;
function readField(bytes: Uint8Array, offset: number, length: number): string {
  const slice = bytes.slice(offset, offset + length);
  let end = slice.length;
  while (end > 0 && slice[end - 1] === 0) end--;
  return new TextDecoder().decode(slice.slice(0, end));
}

function parseIdType(bytes: Uint8Array): string {
  const nsLen = bytes[KYC_ID_TYPE_INDEX];
  if (nsLen > 0 && nsLen < KYC_ID_TYPE_LENGTH) {
    const start = KYC_ID_TYPE_INDEX + 1 + nsLen;
    return readField(bytes, start, KYC_ID_TYPE_LENGTH - 1 - nsLen);
  }
  return readField(bytes, KYC_ID_TYPE_INDEX, KYC_ID_TYPE_LENGTH);
}

/**
 * Build a KycData-shaped document from a TEE attestation for keychain storage.
 * Returns a plain object matching the KycData interface from @selfxyz/common.
 */
export function buildKycDocument(attestation: KycProviderAttestation) {
  const raw = Uint8Array.from(atob(attestation.serializedApplicantInfo), c => c.charCodeAt(0));
  const idType = parseIdType(raw);

  return {
    documentType: idType,
    documentCategory: 'kyc' as const,
    mock: false,
    signature: attestation.signature,
    pubkey: attestation.pubkey,
    serializedApplicantInfo: attestation.serializedApplicantInfo,
  };
}
