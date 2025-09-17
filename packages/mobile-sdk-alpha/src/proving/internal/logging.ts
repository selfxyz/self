// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export interface BaseContext {
  sessionId: string;
  userId?: string;
  platform: 'ios' | 'android';
  stage: string;
}

export interface NFCScanContext extends BaseContext, Record<string, unknown> {
  scanType: 'mrz' | 'can';
}

export interface ProofContext extends BaseContext, Record<string, unknown> {
  circuitType: 'register' | 'dsc' | 'disclose' | null;
  currentState: string;
}
