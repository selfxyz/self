// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';
import type { Socket } from 'socket.io-client';
import { getCircuitNameFromPassportData } from '@selfxyz/common/utils';
import type { PassportData } from '@selfxyz/common/types';
import type { AnyActorRef, AnyEventObject, StateFrom } from 'xstate';
import { createActor, createMachine } from 'xstate';
import { create } from 'zustand';

import type { EndpointType } from '@selfxyz/common/utils';
import type { IDDocument } from '@selfxyz/common/utils/types';

import { PassportEvents, ProofEvents } from '../constants/analytics';
import {
  hasAnyValidRegisteredDocument,
  loadSelectedDocument,
  markCurrentDocumentAsRegistered,
} from '../documents/utils';
import { SdkEvents } from '../types/events';
import type { SelfClient } from '../types/public';
import type { DocumentProcessorDeps } from './internal/documentProcessor';
import { parseIDDocument, startFetchingData, validatingDocument } from './internal/documentProcessor';
import type { ProofContext } from './internal/logging';
import type { PayloadDeps } from './internal/payloadGenerator';
import { _generatePayload as generatePayload } from './internal/payloadGenerator';
import type { SocketIOListenerDeps } from './internal/socketIOListener';
import { _startSocketIOStatusListener as startSocketIOStatusListener } from './internal/socketIOListener';
import type { WebSocketHandlerDeps } from './internal/websocketHandlers';
import {
  _handleWebSocketMessage as handleWebSocketMessage,
  _handleWsClose as handleWsClose,
  _handleWsError as handleWsError,
  _handleWsOpen as handleWsOpen,
} from './internal/websocketHandlers';
import { resolveWebSocketUrl } from './internal/websocketUrlResolver';

const getPlatform = (): 'ios' | 'android' => (Platform.OS === 'ios' ? 'ios' : 'android');

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

  _handlePassportNotSupported: (selfClient: SelfClient) => void;
  _handleAccountRecoveryChoice: (selfClient: SelfClient) => void;
  _handleAccountVerifiedSuccess: (selfClient: SelfClient) => void;
  _handlePassportDataNotFound: (selfClient: SelfClient) => void;
}

const provingMachine = createMachine({
  id: 'proving',
  initial: 'idle',
  states: {
    idle: {
      on: {
        PARSE_ID_DOCUMENT: 'parsing_id_document',
        FETCH_DATA: 'fetching_data',
        ERROR: 'error',
        PASSPORT_DATA_NOT_FOUND: 'passport_data_not_found',
      },
    },
    parsing_id_document: {
      on: {
        PARSE_SUCCESS: 'fetching_data',
        PARSE_ERROR: 'error',
      },
    },
    fetching_data: {
      on: {
        FETCH_SUCCESS: 'validating_document',
        FETCH_ERROR: 'error',
      },
    },
    validating_document: {
      on: {
        VALIDATION_SUCCESS: 'init_tee_connexion',
        VALIDATION_ERROR: 'error',
        ALREADY_REGISTERED: 'completed',
        PASSPORT_NOT_SUPPORTED: 'passport_not_supported',
        ACCOUNT_RECOVERY_CHOICE: 'account_recovery_choice',
        PASSPORT_DATA_NOT_FOUND: 'passport_data_not_found',
      },
    },
    init_tee_connexion: {
      on: {
        CONNECT_SUCCESS: 'ready_to_prove',
        CONNECT_ERROR: 'error',
      },
    },
    ready_to_prove: {
      on: {
        START_PROVING: 'proving',
        PROVE_ERROR: 'error',
      },
    },
    proving: {
      on: {
        PROVE_SUCCESS: 'post_proving',
        PROVE_ERROR: 'error',
        PROVE_FAILURE: 'failure',
      },
    },
    post_proving: {
      on: {
        SWITCH_TO_REGISTER: 'fetching_data',
        COMPLETED: 'completed',
      },
    },
    completed: {
      type: 'final',
    },
    error: {
      type: 'final',
    },
    passport_not_supported: {
      type: 'final',
    },
    account_recovery_choice: {
      type: 'final',
    },
    passport_data_not_found: {
      type: 'final',
    },
    failure: {
      type: 'final',
    },
  },
});

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

export type provingMachineCircuitType = 'register' | 'dsc' | 'disclose';

type WsHandlers = {
  message: (event: MessageEvent) => void;
  open: () => void;
  error: (error: Event) => void;
  close: (event: CloseEvent) => void;
};

export const getPostVerificationRoute = () => {
  return 'AccountVerifiedSuccess';
  // disable for now
  // const { cloudBackupEnabled } = useSettingStore.getState();
  // return cloudBackupEnabled ? 'AccountVerifiedSuccess' : 'SaveRecoveryPhrase';
};

export const useProvingStore = create<ProvingState>((set, get) => {
  let actor: AnyActorRef | null = null;

  function setupActorSubscriptions(newActor: AnyActorRef, selfClient: SelfClient) {
    let lastTransition = Date.now();
    let lastEvent: AnyEventObject = { type: 'init' };
    newActor.on('*', (event: AnyEventObject) => {
      lastEvent = event;
    });
    newActor.subscribe((state: StateFrom<typeof provingMachine>) => {
      const now = Date.now();
      const context = createProofContext(selfClient, 'stateTransition', {
        currentState: String(state.value),
      });
      selfClient.emit(SdkEvents.PROOF_EVENT, {
        context,
        level: 'info',
        event: `state transition: ${state.value}`,
        details: {
          event: lastEvent.type,
          duration_ms: now - lastTransition,
        },
      });
      lastTransition = now;
      selfClient.trackEvent(ProofEvents.PROVING_STATE_CHANGE, {
        state: state.value,
      });
      set({ currentState: state.value as ProvingStateType });

      if (state.value === 'parsing_id_document') {
        get().parseIDDocument(selfClient);
      }
      if (state.value === 'fetching_data') {
        get().startFetchingData(selfClient);
      }
      if (state.value === 'validating_document') {
        get().validatingDocument(selfClient);
      }

      if (state.value === 'init_tee_connexion') {
        get().initTeeConnection(selfClient);
      }

      if (state.value === 'ready_to_prove' && get().userConfirmed) {
        get().startProving(selfClient);
      }

      if (state.value === 'post_proving') {
        get().postProving(selfClient);
      }

      if (get().circuitType !== 'disclose' && (state.value === 'error' || state.value === 'failure')) {
        get()._handleRegisterErrorOrFailure(selfClient);
      }

      if (state.value === 'completed') {
        selfClient.trackEvent(ProofEvents.PROOF_COMPLETED, {
          circuitType: get().circuitType,
        });

        // Mark document as registered onChain
        if (get().circuitType === 'register') {
          (async () => {
            try {
              await markCurrentDocumentAsRegistered(selfClient);
            } catch (error) {
              //This will be checked and updated when the app launches the next time
              console.error('Error marking document as registered:', error);
            }
          })();
        }

        if (get().circuitType !== 'disclose') {
          get()._handleAccountVerifiedSuccess(selfClient);
        }

        if (get().circuitType === 'disclose') {
          selfClient.getSelfAppState().handleProofResult(true);
        }

        // Disable keychain error modal when proving flow ends
        selfClient.navigation?.disableKeychainErrorModal?.();
      }

      if (state.value === 'passport_not_supported') {
        get()._handlePassportNotSupported(selfClient);
      }

      if (state.value === 'account_recovery_choice') {
        get()._handleAccountRecoveryChoice(selfClient);
      }

      if (state.value === 'passport_data_not_found') {
        get()._handlePassportDataNotFound(selfClient);
      }

      if (state.value === 'failure') {
        if (get().circuitType === 'disclose') {
          const { error_code, reason } = get();
          selfClient.getSelfAppState().handleProofResult(false, error_code ?? undefined, reason ?? undefined);
        }
      }
      if (state.value === 'error') {
        if (get().circuitType === 'disclose') {
          selfClient.getSelfAppState().handleProofResult(false, 'error', 'error');
        }
        // Disable keychain error modal when proving flow ends
        selfClient.navigation?.disableKeychainErrorModal?.();
      }
    });
  }

  const getActorRef = () => actor;

  const createContextFactory =
    (selfClient: SelfClient) =>
    (stage: string, overrides: Partial<ProofContext> = {}) =>
      createProofContext(selfClient, stage, overrides);

  const createSocketDeps = (selfClient: SelfClient): SocketIOListenerDeps => ({
    getState: get,
    setState: set,
    getActor: getActorRef,
    createProofContext: (stage: string, overrides: Partial<ProofContext> = {}) =>
      createContextFactory(selfClient)(stage, overrides),
  });

  const createWebSocketDeps = (selfClient: SelfClient): WebSocketHandlerDeps => {
    const socketDeps = createSocketDeps(selfClient);
    return {
      ...socketDeps,
      getState: get,
      startSocketIOStatusListener: (receivedUuid: string, endpointType: EndpointType, client: SelfClient) =>
        startSocketIOStatusListener(receivedUuid, endpointType, client, socketDeps),
    };
  };

  const createPayloadDeps = (selfClient: SelfClient): PayloadDeps => ({
    getState: get,
    setState: set,
    createProofContext: (stage: string, overrides: Partial<ProofContext> = {}) =>
      createContextFactory(selfClient)(stage, overrides),
  });

  const createDocumentDeps = (selfClient: SelfClient): DocumentProcessorDeps => ({
    getState: get,
    setState: set,
    getActor: getActorRef,
    createProofContext: (stage: string, overrides: Partial<ProofContext> = {}) =>
      createContextFactory(selfClient)(stage, overrides),
  });

  return {
    currentState: 'idle',
    attestation: null,
    serverPublicKey: null,
    sharedKey: null,
    wsConnection: null,
    wsHandlers: null,
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
      handleWebSocketMessage(event, selfClient, createWebSocketDeps(selfClient)),
    _handleRegisterErrorOrFailure: async (selfClient: SelfClient) => {
      try {
        const hasValid = await hasAnyValidRegisteredDocument(selfClient);

        selfClient.emit(SdkEvents.PROVING_REGISTER_ERROR_OR_FAILURE, {
          hasValidDocument: hasValid,
        });
      } catch {
        selfClient.emit(SdkEvents.PROVING_REGISTER_ERROR_OR_FAILURE, {
          hasValidDocument: false,
        });
      }
    },

    _startSocketIOStatusListener: (receivedUuid: string, endpointType: EndpointType, selfClient: SelfClient) =>
      startSocketIOStatusListener(receivedUuid, endpointType, selfClient, createSocketDeps(selfClient)),

    _handleWsOpen: (selfClient: SelfClient) => handleWsOpen(selfClient, createWebSocketDeps(selfClient)),

    _handleWsError: (error: Event, selfClient: SelfClient) =>
      handleWsError(error, selfClient, createWebSocketDeps(selfClient)),

    _handleWsClose: (event: CloseEvent, selfClient: SelfClient) =>
      handleWsClose(event, selfClient, createWebSocketDeps(selfClient)),

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
      });

      actor = createActor(provingMachine);
      setupActorSubscriptions(actor, selfClient);
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
      // Skip parsing for disclosure if passport is already parsed
      // Re-parsing would overwrite the alternative CSCA used during registration and is unnecessary
      // skip also the register circuit as the passport already got parsed in during the dsc step
      console.log('circuitType', circuitType);
      if (circuitType !== 'dsc') {
        console.log('skipping id document parsing');
        actor.send({ type: 'FETCH_DATA' });
        selfClient.trackEvent(ProofEvents.FETCH_DATA_STARTED);
      } else {
        actor.send({ type: 'PARSE_ID_DOCUMENT' });
        selfClient.trackEvent(ProofEvents.PARSE_ID_DOCUMENT_STARTED);
      }
    },

    parseIDDocument: async (selfClient: SelfClient) => parseIDDocument(selfClient, createDocumentDeps(selfClient)),

    startFetchingData: async (selfClient: SelfClient) => startFetchingData(selfClient, createDocumentDeps(selfClient)),

    validatingDocument: async (selfClient: SelfClient) =>
      validatingDocument(selfClient, createDocumentDeps(selfClient)),

    initTeeConnection: async (selfClient: SelfClient): Promise<boolean> => {
      const startTime = Date.now();
      const baseContext = createProofContext(selfClient, 'initTeeConnection');
      const { passportData } = get();
      if (!passportData) {
        selfClient.logProofEvent('error', 'Passport data missing', baseContext, {
          failure: 'PROOF_FAILED_CONNECTION',
          duration_ms: Date.now() - startTime,
        });
        throw new Error('PassportData is not available');
      }
      const circuitType = get().circuitType as 'disclose' | 'register' | 'dsc';

      let circuitName;
      if (circuitType === 'disclose') {
        circuitName = passportData.documentCategory === 'aadhaar' ? 'disclose_aadhaar' : 'disclose';
      } else {
        circuitName = getCircuitNameFromPassportData(passportData, circuitType as 'register' | 'dsc');
      }

      const wsRpcUrl = resolveWebSocketUrl(selfClient, circuitType, passportData as PassportData, circuitName);
      selfClient.logProofEvent('info', 'Circuit resolution', baseContext, {
        circuit_name: circuitName,
        ws_url: wsRpcUrl,
      });
      if (!circuitName) {
        actor?.send({ type: 'CONNECT_ERROR' });
        selfClient.logProofEvent('error', 'Circuit name missing', baseContext, {
          failure: 'PROOF_FAILED_CONNECTION',
          duration_ms: Date.now() - startTime,
        });
        throw new Error('Could not determine circuit name');
      }

      if (!wsRpcUrl) {
        actor?.send({ type: 'CONNECT_ERROR' });
        selfClient.logProofEvent('error', 'WebSocket URL missing', baseContext, {
          failure: 'PROOF_FAILED_CONNECTION',
          duration_ms: Date.now() - startTime,
        });
        throw new Error('No WebSocket URL available for TEE connection');
      }

      get()._closeConnections(selfClient);
      selfClient.trackEvent(ProofEvents.TEE_CONN_STARTED);
      selfClient.logProofEvent('info', 'TEE connection attempt', baseContext);

      return new Promise(resolve => {
        const ws = new WebSocket(wsRpcUrl);

        const handleConnectSuccess = () => {
          selfClient.logProofEvent('info', 'TEE connection succeeded', baseContext, {
            duration_ms: Date.now() - startTime,
          });
          selfClient.trackEvent(ProofEvents.TEE_CONN_SUCCESS);
          resolve(true);
        };
        const handleConnectError = (msg: string = 'connect_error') => {
          selfClient.logProofEvent('error', 'TEE connection failed', baseContext, {
            failure: 'PROOF_FAILED_CONNECTION',
            error: msg,
            duration_ms: Date.now() - startTime,
          });
          selfClient.trackEvent(ProofEvents.TEE_CONN_FAILED, { message: msg });
          resolve(false);
        };

        // Create stable handler functions
        const wsHandlers: WsHandlers = {
          message: (event: MessageEvent) => get()._handleWebSocketMessage(event, selfClient),
          open: () => get()._handleWsOpen(selfClient),
          error: (error: Event) => get()._handleWsError(error, selfClient),
          close: (event: CloseEvent) => get()._handleWsClose(event, selfClient),
        };

        set({ wsConnection: ws, wsHandlers });

        ws.addEventListener('message', wsHandlers.message);
        ws.addEventListener('open', wsHandlers.open);
        ws.addEventListener('error', wsHandlers.error);
        ws.addEventListener('close', wsHandlers.close);

        if (!actor) {
          return;
        }
        const unsubscribe = actor.subscribe(state => {
          if (state.matches('ready_to_prove')) {
            handleConnectSuccess();
            unsubscribe.unsubscribe();
          } else if (state.matches('error')) {
            handleConnectError();
            unsubscribe.unsubscribe();
          }
        });
      });
    },

    startProving: async (selfClient: SelfClient) => {
      _checkActorInitialized(actor);
      const startTime = Date.now();
      const { wsConnection, sharedKey, passportData, secret, uuid } = get();
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
      if (!wsConnection || !sharedKey || !passportData || !secret || !uuid) {
        selfClient.logProofEvent('error', 'Missing proving prerequisites', context, {
          failure: 'PROOF_FAILED_CONNECTION',
        });
        console.error('Cannot start proving: Missing wsConnection, sharedKey, passportData, secret, or uuid.');
        actor!.send({ type: 'PROVE_ERROR' });
        return;
      }

      try {
        // Emit event for FCM token registration
        selfClient.emit(SdkEvents.PROVING_BEGIN_GENERATION, {
          uuid,
          isMock: passportData?.mock ?? false,
          context,
        });

        selfClient.trackEvent(ProofEvents.PAYLOAD_GEN_STARTED);
        selfClient.logProofEvent('info', 'Payload generation started', context);
        const submitBody = await get()._generatePayload(selfClient);
        wsConnection.send(JSON.stringify(submitBody));
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
      _checkActorInitialized(actor);
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

    _generatePayload: async (selfClient: SelfClient) => generatePayload(selfClient, createPayloadDeps(selfClient)),

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

/**
 * Creates a ProofContext with sane defaults for logging proof events
 */
const createProofContext = (
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
    platform: getPlatform(),
    ...overrides,
  };
};

function _checkActorInitialized(actor: AnyActorRef | null) {
  if (!actor) {
    throw new Error('State machine not initialized. Call init() first.');
  }
}
