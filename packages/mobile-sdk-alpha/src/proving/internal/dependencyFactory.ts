// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Socket } from 'socket.io-client';
import type { AnyActorRef } from 'xstate';

import type { EndpointType } from '@selfxyz/common/utils';
import type { IDDocument } from '@selfxyz/common/utils/types';

import type { SelfClient } from '../../types/public';
import type { provingMachineCircuitType, ProvingStateType, WsHandlers } from '../types';

export interface ProvingDependencies {
  get: ProvingGetState;
  set: ProvingSetState;
  getActor: ProvingGetActor;
}

export type ProvingGetActor = () => AnyActorRef | null;

export type ProvingGetState = () => ProvingStoreSnapshot;

export type ProvingSetState = (partial: Partial<ProvingStoreSnapshot>) => void;

/**
 * Union of all store methods that internal modules access via deps.get() casts.
 * Centralised here so each module imports one type instead of defining its own subset.
 */
export type ProvingStateWithMethods = ProvingStoreSnapshot & {
  parseIDDocument: (selfClient: SelfClient) => Promise<void>;
  startFetchingData: (selfClient: SelfClient) => Promise<void>;
  validatingDocument: (selfClient: SelfClient) => Promise<void>;
  initTeeConnection: (selfClient: SelfClient) => Promise<boolean>;
  startProving: (selfClient: SelfClient) => Promise<void>;
  postProving: (selfClient: SelfClient) => void;
  _closeConnections: (selfClient: SelfClient) => void;
  _handleWebSocketMessage: (event: MessageEvent, selfClient: SelfClient) => Promise<void>;
  _handleWsOpen: (selfClient: SelfClient) => void;
  _handleWsError: (error: Event, selfClient: SelfClient) => void;
  _handleWsClose: (event: CloseEvent, selfClient: SelfClient) => void;
  _reconnectTeeWebSocket: (selfClient: SelfClient) => Promise<boolean>;
  _startSocketIOStatusListener: (receivedUuid: string, endpointType: any, selfClient: SelfClient) => void;
  _handlePassportNotSupported: (selfClient: SelfClient) => void;
  _handleAccountRecoveryChoice: (selfClient: SelfClient) => void;
  _handleAccountVerifiedSuccess: (selfClient: SelfClient) => void;
  _handlePassportDataNotFound: (selfClient: SelfClient) => void;
};

export interface ProvingStoreSnapshot {
  currentState: ProvingStateType;
  attestation: number[] | null;
  serverPublicKey: string | null;
  sharedKey: Buffer | null;
  wsConnection: WebSocket | null;
  wsHandlers: WsHandlers | null;
  wsReconnectAttempts: number;
  socketConnection: Socket | null;
  uuid: string | null;
  userConfirmed: boolean;
  passportData: IDDocument | null;
  secret: string | null;
  circuitType: provingMachineCircuitType | null;
  error_code: string | null;
  reason: string | null;
  endpointType: EndpointType | null;
  env: 'prod' | 'stg' | null;
}
