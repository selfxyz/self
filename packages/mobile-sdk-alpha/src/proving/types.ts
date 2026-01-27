// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Socket } from 'socket.io-client';

import type { EndpointType } from '@selfxyz/common/utils';
import type { IDDocument } from '@selfxyz/common/utils/types';

import type { SelfClient } from '../types/public';

export type ProvingMachineCircuitType = 'register' | 'dsc' | 'disclose';

export interface ProvingState {
  currentState: ProvingStateType;
  attestation: number[] | null;
  serverPublicKey: string | null;
  sharedKey: Buffer | null;
  wsConnection: WebSocket | null;
  wsHandlers: WsHandlers | null;
  socketConnection: Socket | null;
  uuid: string | null;
  userConfirmed: boolean;
  passportData: IDDocument | null;
  secret: string | null;
  circuitType: ProvingMachineCircuitType | null;
  error_code: string | null;
  reason: string | null;
  endpointType: EndpointType | null;
  env: 'prod' | 'stg' | null;
  init: (
    selfClient: SelfClient,
    circuitType: 'dsc' | 'disclose' | 'register',
    userConfirmed?: boolean,
  ) => Promise<void>;
  parseIDDocument: (selfClient: SelfClient) => Promise<void>;
  startFetchingData: (selfClient: SelfClient) => Promise<void>;
  validatingDocument: (selfClient: SelfClient) => Promise<void>;
  initTeeConnection: (selfClient: SelfClient) => Promise<boolean>;
  startProving: (selfClient: SelfClient) => Promise<void>;
  postProving: (selfClient: SelfClient) => void;
  setUserConfirmed: (selfClient: SelfClient) => void;
  _closeConnections: (selfClient: SelfClient) => void;
  _generatePayload: (selfClient: SelfClient) => Promise<{
    jsonrpc: '2.0';
    method: 'openpassport_submit_request';
    id: 2;
    params: {
      uuid: string | null;
      nonce: number[];
      cipher_text: number[];
      auth_tag: number[];
    };
  }>;
  _handleWebSocketMessage: (event: MessageEvent, selfClient: SelfClient) => Promise<void>;
  _handleRegisterErrorOrFailure: (selfClient: SelfClient) => void;
  _startSocketIOStatusListener: (receivedUuid: string, endpointType: EndpointType, selfClient: SelfClient) => void;
  _handleWsOpen: (selfClient: SelfClient) => void;
  _handleWsError: (error: Event, selfClient: SelfClient) => void;
  _handleWsClose: (event: CloseEvent, selfClient: SelfClient) => void;

  _handlePassportNotSupported: (selfClient: SelfClient) => void;
  _handleAccountRecoveryChoice: (selfClient: SelfClient) => void;
  _handleAccountVerifiedSuccess: (selfClient: SelfClient) => void;
  _handlePassportDataNotFound: (selfClient: SelfClient) => void;
}

export type ProvingStateType =
  // Initial states
  | 'idle'
  | undefined
  // Data preparation states
  | 'parsing_id_document'
  | 'fetching_data'
  | 'validating_document'
  // Connection states
  | 'init_tee_connexion'
  | 'listening_for_status'
  // Proving states
  | 'ready_to_prove'
  | 'proving'
  | 'post_proving'
  // Success state
  | 'completed'
  // Error states
  | 'error'
  | 'failure'
  // Special case states
  | 'passport_not_supported'
  | 'account_recovery_choice'
  | 'passport_data_not_found';

export type WsHandlers = {
  message: (event: MessageEvent) => void;
  open: () => void;
  error: (error: Event) => void;
  close: (event: CloseEvent) => void;
};
