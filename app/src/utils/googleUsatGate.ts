// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfApp } from '@selfxyz/common/utils';
import type { DocumentCatalog, IDDocument } from '@selfxyz/common/utils/types';
import {
  getAllDocuments,
  GOOGLE_USAT_FAUCET_POLICY,
  hasEligibleAlternativeDocumentForPolicy,
  isDocumentEligibleForPolicy,
  isGoogleUsatProofRequest,
  type SelfClient,
} from '@selfxyz/mobile-sdk-alpha';

export type GoogleUsatGateResult = 'allow' | 'block';
export const FORCE_GOOGLE_USAT_FOR_TESTING = false;

// TODO: move to a shared `perkGate` module when a second perk policy lands.
export type IneligibleReason = 'needs_nfc' | 'unsupported_id_type';

export interface GoogleUsatEligibility {
  eligible: boolean;
  reason?: IneligibleReason;
}

/**
 * Sync, pure variant of the gate used to build the picker eligibility map.
 * Does not touch SelfClient or storage — the caller already holds the
 * decrypted document in memory.
 *
 * Returns `{ eligible: true }` when the app is not Google USAT (the gate
 * does not apply); callers skip the perk UI entirely via `activePerkId`
 * before this matters.
 */
export function evaluateGoogleUsatEligibilityForDocument(
  app: SelfApp,
  doc: { data: Pick<IDDocument, 'documentCategory' | 'mock'> },
): GoogleUsatEligibility {
  if (!shouldTreatAsGoogleUsat(app)) {
    return { eligible: true };
  }

  const eligible = isDocumentEligibleForPolicy(
    GOOGLE_USAT_FAUCET_POLICY,
    doc.data.documentCategory,
    doc.data.mock,
  );

  if (eligible) {
    return { eligible: true };
  }

  const reason: IneligibleReason =
    doc.data.documentCategory === 'aadhaar'
      ? 'needs_nfc'
      : 'unsupported_id_type';
  return { eligible: false, reason };
}

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
    // Fail open: this gate is a UX guard, not a security boundary. Faucet
    // eligibility is enforced server-side. A transient local-storage failure
    // must not permanently block the proof session.
    return 'allow';
  }
}

/**
 * Entry-point variant of the gate: blocks ONLY when the selected document is
 * ineligible AND no other registered document is eligible. When an eligible
 * alternative exists it returns 'allow' so the caller proceeds to
 * ProvingScreenRouter, which forces the document selector (see
 * ProvingScreenRouter.tsx alternative-document handling). Unlike
 * evaluateGoogleUsatGate — a selected-doc-only contract ProvingScreenRouter
 * relies on — this is the guard the pre-navigation entry points should use so a
 * user with e.g. a KYC doc selected but an eligible Aadhaar registered is routed
 * to the selector instead of hard-blocked.
 */
export async function evaluateGoogleUsatEntryGate(
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
      // No selection yet — defer to downstream selection checks.
      return 'allow';
    }

    const docs = context.docs ?? (await getAllDocuments(selfClient));
    const selected = await evaluateGoogleUsatGateForDocument(
      selfClient,
      app,
      selectedDocumentId,
      docs,
    );
    if (selected === 'allow') {
      return 'allow';
    }

    // Selected doc is ineligible; only block if there is no eligible alternative.
    return hasEligibleAlternativeDocumentForPolicy(
      GOOGLE_USAT_FAUCET_POLICY,
      docs,
      selectedDocumentId,
    )
      ? 'allow'
      : 'block';
  } catch {
    // Fail open: this gate is a UX guard, not a security boundary. Faucet
    // eligibility is enforced server-side. A transient local-storage failure
    // must not permanently block the proof session.
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
      // Fail open: this gate is a UX guard, not a security boundary. Faucet
      // eligibility is enforced server-side. A transient local-storage failure
      // must not permanently block the proof session.
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
