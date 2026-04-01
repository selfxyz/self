// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCategory, IDDocument } from '@selfxyz/common';
import { isUserRegisteredWithAlternativeCSCA } from '@selfxyz/common/utils/passports/validate';

import {
  markCurrentDocumentAsRegistered,
  reStorePassportDataWithRightCSCA,
  storePassportData,
  updateDocumentRegistrationState,
} from '../documents/utils';
import { getCommitmentTree } from '../stores';
import type { SelfClient } from '../types/public';

export type RecoveryValidationResult = {
  isRegistered: boolean;
  csca?: string;
};

function getAltCSCA(selfClient: SelfClient, docType: DocumentCategory) {
  if (docType === 'aadhaar' || docType === 'kyc') {
    const publicKeys = selfClient.getProtocolState()[docType].public_keys;
    return publicKeys ? Object.fromEntries(publicKeys.map(key => [key, key])) : {};
  }

  return selfClient.getProtocolState()[docType].alternative_csca;
}

export async function finalizeRecoveredDocumentRegistration(
  selfClient: SelfClient,
  document: IDDocument,
  csca?: string,
): Promise<void> {
  const originalDocument = structuredClone(document);
  const selectedDocumentId = (await selfClient.loadDocumentCatalog()).selectedDocumentId;

  try {
    if (csca) {
      await reStorePassportDataWithRightCSCA(selfClient, document, csca);
    }

    await markCurrentDocumentAsRegistered(selfClient);
  } catch (error) {
    if (csca) {
      await storePassportData(selfClient, originalDocument);
    }

    if (selectedDocumentId) {
      await updateDocumentRegistrationState(selfClient, selectedDocumentId, false);
    }

    throw error;
  }
}

export async function validateRecoverySecretForDocument(
  selfClient: SelfClient,
  document: IDDocument,
  secret: string,
): Promise<RecoveryValidationResult> {
  const { isRegistered, csca } = await isUserRegisteredWithAlternativeCSCA(document, secret, {
    getCommitmentTree: (docCategory: DocumentCategory) => getCommitmentTree(selfClient, docCategory),
    getAltCSCA: (docType: DocumentCategory) => getAltCSCA(selfClient, docType),
  });

  return {
    isRegistered,
    csca: csca ?? undefined,
  };
}
