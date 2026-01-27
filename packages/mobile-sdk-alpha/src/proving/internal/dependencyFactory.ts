// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AnyActorRef } from 'xstate';

import type { EndpointType } from '@selfxyz/common/utils';

import type { SelfClient } from '../../types/public';
import type { ProvingState } from '../types';
import type { DocumentProcessorDeps } from './documentProcessor';
import { createProofContext } from './helpers';
import type { ProofContext } from './logging';
import type { PayloadDeps } from './payloadGenerator';
import type { SocketIOListenerDeps } from './socketIOListener';
import { _startSocketIOStatusListener as startSocketIOStatusListener } from './socketIOListener';
import type { WebSocketHandlerDeps } from './websocketHandlers';

type GetStateFn = () => ProvingState;
type SetStateFn = (partial: Partial<ProvingState>) => void;
type GetActorFn = () => AnyActorRef | null;

/**
 * Factory for creating a ProofContext with bound selfClient
 */
const createContextFactory =
  (selfClient: SelfClient) =>
  (stage: string, overrides: Partial<ProofContext> = {}) =>
    createProofContext(selfClient, stage, overrides);

/**
 * Create document processor dependencies
 */
export const createDocumentDeps = (
  selfClient: SelfClient,
  get: GetStateFn,
  set: SetStateFn,
  getActor: GetActorFn,
): DocumentProcessorDeps => ({
  getState: get,
  setState: set,
  getActor,
  createProofContext: (stage: string, overrides: Partial<ProofContext> = {}) =>
    createContextFactory(selfClient)(stage, overrides),
});

/**
 * Create payload generator dependencies
 */
export const createPayloadDeps = (selfClient: SelfClient, get: GetStateFn, set: SetStateFn): PayloadDeps => ({
  getState: get,
  setState: set,
  createProofContext: (stage: string, overrides: Partial<ProofContext> = {}) =>
    createContextFactory(selfClient)(stage, overrides),
});

/**
 * Create Socket.IO listener dependencies
 */
export const createSocketDeps = (
  selfClient: SelfClient,
  get: GetStateFn,
  set: SetStateFn,
  getActor: GetActorFn,
): SocketIOListenerDeps => ({
  getState: get,
  setState: set,
  getActor,
  createProofContext: (stage: string, overrides: Partial<ProofContext> = {}) =>
    createContextFactory(selfClient)(stage, overrides),
});

/**
 * Create WebSocket handler dependencies
 */
export const createWebSocketDeps = (
  selfClient: SelfClient,
  get: GetStateFn,
  set: SetStateFn,
  getActor: GetActorFn,
): WebSocketHandlerDeps => {
  const socketDeps = createSocketDeps(selfClient, get, set, getActor);
  return {
    ...socketDeps,
    getState: get,
    startSocketIOStatusListener: (receivedUuid: string, endpointType: EndpointType, client: SelfClient) =>
      startSocketIOStatusListener(receivedUuid, endpointType, client, socketDeps),
  };
};
