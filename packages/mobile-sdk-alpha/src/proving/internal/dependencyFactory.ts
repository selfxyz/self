// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Socket } from 'socket.io-client';
import type { AnyActorRef } from 'xstate';

import type { EndpointType } from '@selfxyz/common/utils';
import type { IDDocument } from '@selfxyz/common/utils/types';

import type { provingMachineCircuitType, ProvingStateType, WsHandlers } from '../types';

export interface ProvingDependencies {
  get: ProvingGetState;
  set: ProvingSetState;
  getActor: ProvingGetActor;
}
export type ProvingGetActor = () => AnyActorRef | null;

export type ProvingGetState = () => ProvingStoreSnapshot;

export type ProvingSetState = (partial: Partial<ProvingStoreSnapshot>) => void;

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
  [key: string]: unknown;
}
