// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export interface AccessTokenResponse {
  token: string;
  userId: string;
}

export interface SumsubApplicantInfo {
  id: string;
  createdAt: string;
  key: string;
  clientId: string;
  inspectionId: string;
  externalUserId: string;
  info?: {
    firstName?: string;
    lastName?: string;
    dob?: string;
    country?: string;
    phone?: string;
  };
  email?: string;
  phone?: string;
  review: {
    reviewAnswer: string;
    reviewResult: {
      reviewAnswer: string;
    };
  };
  type: string;
}

export interface SumsubResult {
  success: boolean;
  status: string;
  errorType?: string;
  errorMsg?: string;
}
