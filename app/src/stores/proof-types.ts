// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import type { EndpointType, UserIdType } from '@selfxyz/common/utils';

export interface ProofDB {
  updateStaleProofs: (
    updateProofStatus: (id: string, status: ProofStatus) => Promise<void>,
  ) => Promise<void>;
  getPendingProofs: () => Promise<ProofDBResult>;
  getHistory: (page?: number) => Promise<ProofDBResult>;
  init: () => Promise<void>;
  insertProof: (
    proof: Omit<ProofHistory, 'id' | 'timestamp'>,
  ) => Promise<{ id: string; timestamp: number; rowsAffected: number }>;
  updateProofStatus: (
    status: ProofStatus,
    errorCode: string | undefined,
    errorReason: string | undefined,
    sessionId: string,
  ) => Promise<void>;
}

export interface ProofDBResult {
  rows: ProofHistory[];
  rowsAffected?: number;
  insertId?: string;
  total_count?: number;
}

export interface ProofHistory {
  id: string;
  appName: string;
  sessionId: string;
  userId: string;
  userIdType: UserIdType;
  endpointType: EndpointType;
  status: ProofStatus;
  errorCode?: string;
  errorReason?: string;
  timestamp: number;
  disclosures: string;
  logoBase64?: string;
}

export enum ProofStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILURE = 'failure',
}
