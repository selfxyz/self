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

  let selectedDocumentId: string | undefined;
  try {
    const catalog = await selfClient.loadDocumentCatalog();
    selectedDocumentId = catalog.selectedDocumentId;
  } catch {
    // Fail open to match the same UX-only guard behavior on transient failures.
    return 'allow';
  }

  if (!selectedDocumentId) {
    // Defer document eligibility checks to explicit document selection
    // chokepoints when no stored selection exists yet.
    return 'allow';
  }

  return evaluateGoogleUsatGateForDocument(selfClient, app, selectedDocumentId);
}

export async function evaluateGoogleUsatGateForDocument(
  selfClient: SelfClient,
  app: SelfApp,
  documentId: string,
): Promise<GoogleUsatGateResult> {
  if (!shouldTreatAsGoogleUsat(app)) {
    return 'allow';
  }

  let docs: Awaited<ReturnType<typeof getAllDocuments>>;
  try {
    docs = await getAllDocuments(selfClient);
  } catch {
    return 'allow';
  }

  const documentToEvaluate = docs[documentId];
  if (!documentToEvaluate) {
    return 'block';
  }

  const isEligibleSelectedDoc =
    isGoogleUsatEligibleDocumentCategory(
      documentToEvaluate.data.documentCategory,
    ) && documentToEvaluate.data.mock !== true;

  return isEligibleSelectedDoc ? 'allow' : 'block';
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
