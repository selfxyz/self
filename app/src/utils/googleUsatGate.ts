// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfApp } from '@selfxyz/common/utils';
import type { DocumentCatalog } from '@selfxyz/common/utils/types';
import {
  getAllDocuments,
  GOOGLE_USAT_FAUCET_POLICY,
  isDocumentEligibleForPolicy,
  isGoogleUsatProofRequest,
  type SelfClient,
} from '@selfxyz/mobile-sdk-alpha';

export type GoogleUsatGateResult = 'allow' | 'block';
export const FORCE_GOOGLE_USAT_FOR_TESTING = false;

type DocumentMap = Awaited<ReturnType<typeof getAllDocuments>>;

export interface GoogleUsatGateContext {
  catalog?: DocumentCatalog;
  docs?: DocumentMap;
}

export function isGoogleUsatForceEnabledForTesting(): boolean {
  return __DEV__ && FORCE_GOOGLE_USAT_FOR_TESTING;
}

export async function evaluateGoogleUsatGate(
  selfClient: SelfClient,
  app: SelfApp,
  context: GoogleUsatGateContext = {},
): Promise<GoogleUsatGateResult> {
  if (!shouldTreatAsGoogleUsat(app)) {
    return 'allow';
  }

  try {
    const catalog = context.catalog ?? (await selfClient.loadDocumentCatalog());
    const selectedDocumentId = catalog.selectedDocumentId;

    if (!selectedDocumentId) {
      return 'allow';
    }

    const docs = context.docs ?? (await getAllDocuments(selfClient));
    return evaluateGoogleUsatGateForDocument(
      selfClient,
      app,
      selectedDocumentId,
      docs,
    );
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

  const isEligibleSelectedDoc = isDocumentEligibleForPolicy(
    GOOGLE_USAT_FAUCET_POLICY,
    documentToEvaluate.data.documentCategory,
    documentToEvaluate.data.mock,
  );

  return isEligibleSelectedDoc ? 'allow' : 'block';
}

function shouldTreatAsGoogleUsat(app: SelfApp): boolean {
  if (isGoogleUsatForceEnabledForTesting()) {
    return true;
  }
  return isGoogleUsatProofRequest(app);
}
