// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfApp } from '@selfxyz/common/utils';
import {
  getAllDocuments,
  isGoogleUsatProofRequest,
  type SelfClient,
} from '@selfxyz/mobile-sdk-alpha';

export type GoogleUsatGateResult = 'allow' | 'block';
export const FORCE_GOOGLE_USAT_FOR_TESTING = false;

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

  let docs: Awaited<ReturnType<typeof getAllDocuments>>;
  try {
    docs = await getAllDocuments(selfClient);
  } catch {
    // Fail open: this gate is a UX guard, not a security boundary. A transient
    // retrieval failure must not permanently block the proof session.
    return 'allow';
  }
  const hasHighSecurityDoc = Object.values(docs).some(
    doc => doc.data.documentCategory !== 'kyc',
  );
  return hasHighSecurityDoc ? 'allow' : 'block';
}

function shouldTreatAsGoogleUsat(app: SelfApp): boolean {
  if (isGoogleUsatForceEnabledForTesting()) {
    return true;
  }
  return isGoogleUsatProofRequest(app);
}
