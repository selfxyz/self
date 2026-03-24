export interface ApplicantInfoSerialized {
  signature: string;
  applicantInfo: string;
  pubkey: Array<string>;
}

export interface DiditVerificationResult {
  type: 'completed' | 'cancelled' | 'failed';
  session?: {
    status: string;
    sessionId: string;
  };
  error?: {
    type: string;
    message: string;
  };
}

// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.
export interface SessionResponse {
  sessionId: string;
  sessionToken: string;
}
