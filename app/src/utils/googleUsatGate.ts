// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfApp } from '@selfxyz/common/utils';
import type { DocumentCategory } from '@selfxyz/common/utils/types';
import {
  getAllDocuments,
  isGoogleUsatProofRequest,
  type SelfClient,
} from '@selfxyz/mobile-sdk-alpha';

export type GoogleUsatGateResult = 'allow' | 'block';
export const FORCE_GOOGLE_USAT_FOR_TESTING = false;
type GoogleUsatEligibleDocumentCategory = 'passport' | 'id_card';
const GOOGLE_USAT_ALLOWED_DOCUMENT_CATEGORIES: ReadonlySet<DocumentCategory> =
  new Set(['passport', 'id_card']);

type DocumentMap = Awaited<ReturnType<typeof getAllDocuments>>;

export function isGoogleUsatForceEnabledForTesting(): boolean {
  return __DEV__ && FORCE_GOOGLE_USAT_FOR_TESTING;
}

export async function evaluateGoogleUsatGate(
  selfClient: SelfClient,
  app: SelfApp,
): Promise<GoogleUsatGateResult> {
  if (!shouldTreatAsGoogleUsat(app)) {
    return 'allow';
  }

  try {
    const catalog = await selfClient.loadDocumentCatalog();
    const selectedDocumentId = catalog.selectedDocumentId;

    if (!selectedDocumentId) {
      return 'allow';
    }

    const docs = await getAllDocuments(selfClient);
    return evaluateGoogleUsatGateForDocument(selfClient, app, selectedDocumentId, docs);
  } catch {
    return 'allow';
  }
}

export async function evaluateGoogleUsatGateForDocument(
  selfClient: SelfClient,
  app: SelfApp,
  documentId: string,
  prefetchedDocs?: DocumentMap,
): Promise<GoogleUsatGateResult> {
  if (!shouldTreatAsGoogleUsat(app)) {
    return 'allow';
  }

  let docs = prefetchedDocs;
  if (!docs) {
    try {
      docs = await getAllDocuments(selfClient);
    } catch {
      return 'allow';
    }
  }

  const documentToEvaluate = docs[documentId];
  if (!documentToEvaluate) {
    return 'block';
  }

  const isEligibleSelectedDoc = isGoogleUsatDocumentEligible(
    documentToEvaluate.data.documentCategory,
    documentToEvaluate.data.mock,
  );

  return isEligibleSelectedDoc ? 'allow' : 'block';
}

export function hasEligibleGoogleUsatAlternativeDocument(
  docs: DocumentMap,
  excludedDocumentId: string,
): boolean {
  return Object.entries(docs).some(([documentId, document]) => {
    if (documentId === excludedDocumentId) {
      return false;
    }

    return isGoogleUsatDocumentEligible(
      document.data.documentCategory,
      document.data.mock,
    );
  });
}

function shouldTreatAsGoogleUsat(app: SelfApp): boolean {
  if (isGoogleUsatForceEnabledForTesting()) {
    return true;
  }
  return isGoogleUsatProofRequest(app);
}

function isGoogleUsatEligibleDocumentCategory(
  category: DocumentCategory,
): category is GoogleUsatEligibleDocumentCategory {
  return GOOGLE_USAT_ALLOWED_DOCUMENT_CATEGORIES.has(category);
}

function isGoogleUsatDocumentEligible(
  category: DocumentCategory,
  isMock: boolean | undefined,
): boolean {
  return isGoogleUsatEligibleDocumentCategory(category) && isMock !== true;
}
