// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Socket } from 'socket.io-client';
import type { AnyActorRef } from 'xstate';
import { createActor } from 'xstate';
import { create } from 'zustand';

import type { PassportData } from '@selfxyz/common/types';
import type { EndpointType } from '@selfxyz/common/utils';
import type { IDDocument } from '@selfxyz/common/utils/types';

import { PassportEvents, ProofEvents } from '../constants/analytics';
import { loadSelectedDocument } from '../documents/utils';
import { getCommitmentTree } from '../stores';
import { SdkEvents } from '../types/events';
import type { SelfClient } from '../types/public';
import { setupActorSubscriptions } from './internal/actorSubscriptions';
import type { ProvingDependencies } from './internal/dependencyFactory';
import { parseIDDocument, startFetchingData, validatingDocument } from './internal/documentProcessor';
import { checkActorInitialized, createProofContext } from './internal/helpers';
import { generatePayload } from './internal/payloadGenerator';
import { startSocketIOStatusListener } from './internal/socketIOListener';
import { provingMachine } from './internal/stateMachine';
import { initTeeConnection } from './internal/teeConnectionHandler';
import {
  handleRegisterErrorOrFailure,
  handleWebSocketMessage,
  handleWsClose,
  handleWsError,
  handleWsOpen,
  reconnectTeeWebSocket,
} from './internal/websocketHandlers';
import type { provingMachineCircuitType, ProvingStateType, WsHandlers } from './types';

export interface ProvingState {
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
  _reconnectTeeWebSocket: (selfClient: SelfClient) => Promise<boolean>;

  _handlePassportNotSupported: (selfClient: SelfClient) => void;
  _handleAccountRecoveryChoice: (selfClient: SelfClient) => void;
  _handleAccountVerifiedSuccess: (selfClient: SelfClient) => void;
  _handlePassportDataNotFound: (selfClient: SelfClient) => void;
}

export type { ProvingStateType, provingMachineCircuitType } from './types';

export const getPostVerificationRoute = () => {
  return 'AccountVerifiedSuccess';
  // disable for now
  // const { cloudBackupEnabled } = useSettingStore.getState();
  // return cloudBackupEnabled ? 'AccountVerifiedSuccess' : 'SaveRecoveryPhrase';
};

export const useProvingStore = create<ProvingState>((set, get) => {
  let actor: AnyActorRef | null = null;

  const getActor = () => actor;
  const deps = (): ProvingDependencies => ({
    get: get as unknown as ProvingDependencies['get'],
    set: set as unknown as ProvingDependencies['set'],
    getActor,
  });

  return {
    currentState: 'idle',
    attestation: null,
    serverPublicKey: null,
    sharedKey: null,
    wsConnection: null,
    wsHandlers: null,
    wsReconnectAttempts: 0,
    socketConnection: null,
    uuid: null,
    userConfirmed: false,
    passportData: null,
    secret: null,
    circuitType: null,
    env: null,
    error_code: null,
    reason: null,
    endpointType: null,
    _handleWebSocketMessage: async (event: MessageEvent, selfClient: SelfClient) =>
      handleWebSocketMessage(event, selfClient, deps()),
    _handleRegisterErrorOrFailure: async (selfClient: SelfClient) => handleRegisterErrorOrFailure(selfClient),
    _startSocketIOStatusListener: (receivedUuid: string, endpointType: EndpointType, selfClient: SelfClient) =>
      startSocketIOStatusListener(receivedUuid, endpointType, selfClient, deps()),
    _handleWsOpen: (selfClient: SelfClient) => handleWsOpen(selfClient, deps()),
    _handleWsError: (error: Event, selfClient: SelfClient) => handleWsError(error, selfClient, deps()),
    _handleWsClose: (event: CloseEvent, selfClient: SelfClient) => handleWsClose(event, selfClient, deps()),
    _reconnectTeeWebSocket: async (selfClient: SelfClient): Promise<boolean> =>
      reconnectTeeWebSocket(selfClient, deps()),

    init: async (
      selfClient: SelfClient,
      circuitType: 'dsc' | 'disclose' | 'register',
      userConfirmed: boolean = false,
    ) => {
      selfClient.trackEvent(ProofEvents.PROVING_INIT);
      get()._closeConnections(selfClient);

      // Enable keychain error modal for proving flows
      // This ensures users are notified if keychain access fails during critical operations
      selfClient.navigation?.enableKeychainErrorModal?.();

      if (actor) {
        try {
          actor.stop();
        } catch (error) {
          console.error('Error stopping actor:', error);
        }
      }
      set({
        currentState: 'idle',
        attestation: null,
        serverPublicKey: null,
        sharedKey: null,
        wsConnection: null,
        socketConnection: null,
        uuid: null,
        userConfirmed: userConfirmed,
        passportData: null,
        secret: null,
        circuitType,
        endpointType: null,
        env: null,
        error_code: null,
        reason: null,
      });

      actor = createActor(provingMachine);
      setupActorSubscriptions(actor, selfClient, deps());
      actor.start();

      selfClient.trackEvent(ProofEvents.DOCUMENT_LOAD_STARTED);
      const selectedDocument = await loadSelectedDocument(selfClient);
      if (!selectedDocument) {
        console.error('No document found for proving');
        selfClient.trackEvent(PassportEvents.PASSPORT_DATA_NOT_FOUND, {
          stage: 'init',
        });
        console.error('No document found for proving in init');
        actor!.send({ type: 'PASSPORT_DATA_NOT_FOUND' });
        return;
      }

      const { data: passportData } = selectedDocument;
      const secret = await selfClient.getPrivateKey();
      if (!secret) {
        console.error('Could not load secret');
        selfClient.trackEvent(ProofEvents.LOAD_SECRET_FAILED);
        actor!.send({ type: 'ERROR' });
        return;
      }

      // Set environment based on mock property
      const env = passportData.mock ? 'stg' : 'prod';

      set({ passportData, secret, env });
      set({ circuitType });
      // Only skip parsing when passport/id_card DSC data is already usable.
      // Aadhaar and KYC do not require DSC parsing, while the DSC circuit always reparses.
      const needsDscParsing =
        passportData.documentCategory === 'passport' || passportData.documentCategory === 'id_card';
      const hasParsedDsc = needsDscParsing && Boolean(passportData.dsc_parsed?.authorityKeyIdentifier);

      if (circuitType === 'dsc' && !needsDscParsing) {
        console.error(`DSC circuit is not supported for ${passportData.documentCategory} documents`);
        selfClient.trackEvent(ProofEvents.PROOF_FAILED, {
          message: `DSC circuit not supported for ${passportData.documentCategory}`,
        });
        actor.send({ type: 'ERROR' });
        return;
      }

      const shouldParseDocument = circuitType === 'dsc' || (needsDscParsing && !hasParsedDsc);

      if (shouldParseDocument) {
        actor.send({ type: 'PARSE_ID_DOCUMENT' });
        selfClient.trackEvent(ProofEvents.PARSE_ID_DOCUMENT_STARTED);
      } else {
        actor.send({ type: 'FETCH_DATA' });
      }
    },

    parseIDDocument: async (selfClient: SelfClient) => parseIDDocument(selfClient, deps()),

    startFetchingData: async (selfClient: SelfClient) => startFetchingData(selfClient, deps()),

    validatingDocument: async (selfClient: SelfClient) => validatingDocument(selfClient, deps(), getCommitmentTree),

    initTeeConnection: async (selfClient: SelfClient): Promise<boolean> => initTeeConnection(selfClient, deps()),

    startProving: async (selfClient: SelfClient) => {
      checkActorInitialized(actor);
      const startTime = Date.now();
      let { wsConnection } = get();
      const { sharedKey, passportData, secret, uuid } = get();
      const context = createProofContext(selfClient, 'startProving', {
        sessionId: uuid || get().uuid || 'unknown-session',
      });

      if (get().currentState !== 'ready_to_prove') {
        selfClient.logProofEvent('error', 'Not in ready_to_prove state', context, {
          failure: 'PROOF_FAILED_CONNECTION',
        });
        console.error('Cannot start proving: Not in ready_to_prove state.');
        return;
      }

      // Check non-connection prerequisites first
      if (!sharedKey || !passportData || !secret || !uuid) {
        selfClient.logProofEvent('error', 'Missing proving prerequisites', context, {
          failure: 'PROOF_FAILED_CONNECTION',
        });
        console.error('Cannot start proving: Missing sharedKey, passportData, secret, or uuid.');
        actor!.send({ type: 'PROVE_ERROR' });
        return;
      }

      // Attempt reconnection if WebSocket is missing or not open
      if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
        selfClient.logProofEvent('warn', 'WebSocket not ready, attempting reconnection', context, {
          wsConnectionExists: !!wsConnection,
          readyState: wsConnection?.readyState,
        });

        const reconnected = await get()._reconnectTeeWebSocket(selfClient);
        if (!reconnected) {
          selfClient.logProofEvent('error', 'WebSocket reconnection failed', context, {
            failure: 'PROOF_FAILED_CONNECTION',
          });
          actor!.send({ type: 'PROVE_ERROR' });
          return;
        }

        // Get the new connection after reconnection
        wsConnection = get().wsConnection;
        if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
          selfClient.logProofEvent('error', 'Reconnected WebSocket not ready', context, {
            failure: 'PROOF_FAILED_CONNECTION',
          });
          actor!.send({ type: 'PROVE_ERROR' });
          return;
        }
      }

      try {
        selfClient.emit(SdkEvents.PROVING_BEGIN_GENERATION, {
          uuid,
          isMock: passportData?.mock ?? false,
          context,
        });

        selfClient.trackEvent(ProofEvents.PAYLOAD_GEN_STARTED);
        selfClient.logProofEvent('info', 'Payload generation started', context);
        const submitBody = await get()._generatePayload(selfClient);

        const activeWsConnection = get().wsConnection;
        if (!activeWsConnection) {
          throw new Error('WebSocket connection lost during payload generation');
        }
        activeWsConnection.send(JSON.stringify(submitBody));
        selfClient.logProofEvent('info', 'Payload sent over WebSocket', context);
        selfClient.trackEvent(ProofEvents.PAYLOAD_SENT);
        selfClient.trackEvent(ProofEvents.PROVING_PROCESS_STARTED);
        actor!.send({ type: 'START_PROVING' });
        selfClient.logProofEvent('info', 'Proving started', context, {
          duration_ms: Date.now() - startTime,
        });
      } catch (error) {
        selfClient.logProofEvent('error', 'startProving failed', context, {
          failure: 'PROOF_FAILED_PAYLOAD_GEN',
          error: error instanceof Error ? error.message : String(error),
          duration_ms: Date.now() - startTime,
        });
        console.error('Error during startProving preparation/send:', error);
        actor!.send({ type: 'PROVE_ERROR' });
      }
    },

    setUserConfirmed: (selfClient: SelfClient) => {
      set({ userConfirmed: true });
      selfClient.trackEvent(ProofEvents.USER_CONFIRMED);
      if (get().currentState === 'ready_to_prove') {
        get().startProving(selfClient);
      }
    },

    postProving: (selfClient: SelfClient) => {
      checkActorInitialized(actor);
      const { circuitType } = get();
      selfClient.trackEvent(ProofEvents.POST_PROVING_STARTED);
      if (circuitType === 'dsc') {
        setTimeout(() => {
          selfClient.trackEvent(ProofEvents.POST_PROVING_CHAIN_STEP, {
            from: 'dsc',
            to: 'register',
          });
          get().init(selfClient, 'register', true);
        }, 1500);
      } else if (circuitType === 'register') {
        selfClient.trackEvent(ProofEvents.POST_PROVING_COMPLETED);
        actor!.send({ type: 'COMPLETED' });
      } else if (circuitType === 'disclose') {
        selfClient.trackEvent(ProofEvents.POST_PROVING_COMPLETED);
        actor!.send({ type: 'COMPLETED' });
      }
    },

    _closeConnections: (_selfClient: SelfClient) => {
      const { wsConnection: ws, wsHandlers } = get();
      if (ws && wsHandlers) {
        try {
          ws.removeEventListener('message', wsHandlers.message);
          ws.removeEventListener('open', wsHandlers.open);
          ws.removeEventListener('error', wsHandlers.error);
          ws.removeEventListener('close', wsHandlers.close);
          ws.close();
        } catch (error) {
          console.error('Error removing listeners or closing WebSocket:', error);
        }
        set({ wsConnection: null, wsHandlers: null });
      }

      const socket = get().socketConnection;
      if (socket) {
        socket.close();
        set({ socketConnection: null });
      }
      set({
        attestation: null,
        serverPublicKey: null,
        sharedKey: null,
        uuid: null,
        endpointType: null,
      });
    },

    _generatePayload: async (selfClient: SelfClient) => generatePayload(selfClient, deps()),

    _handlePassportNotSupported: (selfClient: SelfClient) => {
      const passportData = get().passportData;

      const countryCode =
        passportData?.documentCategory !== 'aadhaar'
          ? (passportData as PassportData)?.passportMetadata?.countryCode
          : 'IND';
      const documentCategory = passportData?.documentCategory;

      selfClient.emit(SdkEvents.PROVING_PASSPORT_NOT_SUPPORTED, {
        countryCode: countryCode ?? null,
        documentCategory: documentCategory ?? null,
      });
    },

    _handleAccountRecoveryChoice: (selfClient: SelfClient) => {
      selfClient.emit(SdkEvents.PROVING_ACCOUNT_RECOVERY_REQUIRED);
    },

    _handleAccountVerifiedSuccess: (selfClient: SelfClient) => {
      selfClient.emit(SdkEvents.PROVING_ACCOUNT_VERIFIED_SUCCESS);
    },

    _handlePassportDataNotFound: (selfClient: SelfClient) => {
      selfClient.emit(SdkEvents.PROVING_PASSPORT_DATA_NOT_FOUND);
    },
  };
});
