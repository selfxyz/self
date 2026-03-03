// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AnyActorRef } from 'xstate';

import type { SelfClient } from '../../types/public';
import type { ProofContext } from './logging';

const getPlatform = (selfClient: SelfClient): string => selfClient?.config?.platform ?? 'unknown';

export function checkActorInitialized(actor: AnyActorRef | null): asserts actor is AnyActorRef {
  if (!actor) {
    throw new Error('State machine not initialized. Call init() first.');
  }
}

export const createProofContext = (
  selfClient: SelfClient,
  stage: string,
  overrides: Partial<ProofContext> = {},
): ProofContext => {
  const selfApp = selfClient.getSelfAppState().selfApp;
  const provingState = selfClient.getProvingState();

  return {
    sessionId: provingState.uuid || 'unknown-session',
    userId: selfApp?.userId,
    circuitType: provingState.circuitType || null,
    currentState: provingState.currentState || 'unknown-state',
    stage,
    platform: getPlatform(selfClient),
    ...overrides,
  };
};
