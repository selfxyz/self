import { type EndpointType, UserIdType } from '@selfxyz/common';

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

export interface ProofDBResult {
  rows: ProofHistory[];
  rowsAffected?: number;
  insertId?: string;
  total_count?: number;
}

export interface ProofDB {
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
