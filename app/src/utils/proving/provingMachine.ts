// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import forge from 'node-forge';
import { Platform } from 'react-native';
import type { Socket } from 'socket.io-client';
import socketIo from 'socket.io-client';
import { v4 } from 'uuid';
import type { AnyActorRef, AnyEventObject, StateFrom } from 'xstate';
import { createActor, createMachine } from 'xstate';
import { create } from 'zustand';

import type { DocumentCategory, PassportData } from '@selfxyz/common/types';
import type { EndpointType, SelfApp } from '@selfxyz/common/utils';
import {
  getCircuitNameFromPassportData,
  getSolidityPackedUserContextData,
} from '@selfxyz/common/utils';
import { getPublicKey, verifyAttestation } from '@selfxyz/common/utils/attest';
import {
  generateTEEInputsDiscloseStateless,
  generateTEEInputsDSC,
  generateTEEInputsRegister,
} from '@selfxyz/common/utils/circuits/registerInputs';
import {
  checkDocumentSupported,
  checkIfPassportDscIsInTree,
  isDocumentNullified,
  isUserRegistered,
  isUserRegisteredWithAlternativeCSCA,
} from '@selfxyz/common/utils/passports/validate';
import {
  clientKey,
  clientPublicKeyHex,
  ec,
  encryptAES256GCM,
  getPayload,
  getWSDbRelayerUrl,
} from '@selfxyz/common/utils/proving';
import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  clearPassportData,
  hasAnyValidRegisteredDocument,
  loadSelectedDocument,
  markCurrentDocumentAsRegistered,
  reStorePassportDataWithRightCSCA,
  SdkEvents,
} from '@selfxyz/mobile-sdk-alpha';
import {
  PassportEvents,
  ProofEvents,
} from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  useProtocolStore,
  useSelfAppStore,
} from '@selfxyz/mobile-sdk-alpha/stores';

import { logProofEvent, type ProofContext } from '@/Sentry';
// import analytics from '@/utils/analytics';
import {
  handleStatusCode,
  parseStatusMessage,
} from '@/utils/proving/statusHandlers';

// Helper functions for WebSocket URL resolution
const getMappingKey = (
  circuitType: 'disclose' | 'register' | 'dsc',
  documentCategory: DocumentCategory,
): string => {
  if (circuitType === 'disclose') {
    return documentCategory === 'passport' ? 'DISCLOSE' : 'DISCLOSE_ID';
  }
  if (circuitType === 'register') {
    return documentCategory === 'passport' ? 'REGISTER' : 'REGISTER_ID';
  }
  // circuitType === 'dsc'
  return documentCategory === 'passport' ? 'DSC' : 'DSC_ID';
};

const resolveWebSocketUrl = (
  circuitType: 'disclose' | 'register' | 'dsc',
  passportData: PassportData,
  circuitName: string,
): string | undefined => {
  const { documentCategory } = passportData;
  const circuitsMapping =
    useProtocolStore.getState()[documentCategory].circuits_dns_mapping;
  const mappingKey = getMappingKey(circuitType, documentCategory);

  return circuitsMapping?.[mappingKey]?.[circuitName];
};

// Helper functions for _generatePayload refactoring
const _generateCircuitInputs = (
  circuitType: 'disclose' | 'register' | 'dsc',
  secret: string | undefined | null,
  passportData: PassportData,
  env: 'prod' | 'stg',
) => {
  const document: DocumentCategory = passportData.documentCategory;
  const protocolStore = useProtocolStore.getState();
  const selfApp = useSelfAppStore.getState().selfApp;

  let inputs,
    circuitName,
    endpointType,
    endpoint,
    circuitTypeWithDocumentExtension;

  switch (circuitType) {
    case 'register':
      ({ inputs, circuitName, endpointType, endpoint } =
        generateTEEInputsRegister(
          secret as string,
          passportData,
          protocolStore[document].dsc_tree,
          env,
        ));
      circuitTypeWithDocumentExtension = `${circuitType}${document === 'passport' ? '' : '_id'}`;
      break;
    case 'dsc':
      ({ inputs, circuitName, endpointType, endpoint } = generateTEEInputsDSC(
        passportData,
        protocolStore[document].csca_tree as string[][],
        env,
      ));
      circuitTypeWithDocumentExtension = `${circuitType}${document === 'passport' ? '' : '_id'}`;
      break;
    case 'disclose':
      ({ inputs, circuitName, endpointType, endpoint } =
        generateTEEInputsDiscloseStateless(
          secret as string,
          passportData,
          selfApp as SelfApp,
          (doc: DocumentCategory, tree) => {
            const docStore =
              doc === 'passport'
                ? protocolStore.passport
                : protocolStore.id_card;
            switch (tree) {
              case 'ofac':
                return docStore.ofac_trees;
              case 'commitment':
                if (!docStore.commitment_tree) {
                  throw new Error('Commitment tree not loaded');
                }
                return docStore.commitment_tree;
              default:
                throw new Error('Unknown tree type');
            }
          },
        ));
      circuitTypeWithDocumentExtension = `disclose`;
      break;
    default:
      throw new Error('Invalid circuit type:' + circuitType);
  }

  return {
    inputs,
    circuitName,
    endpointType,
    endpoint,
    circuitTypeWithDocumentExtension,
  };
};

const JSONRPC_VERSION = '2.0' as const;
const SUBMIT_METHOD = 'openpassport_submit_request' as const;
const SUBMIT_ID = 2 as const;

type EncryptedPayload = {
  nonce: number[];
  cipher_text: number[];
  auth_tag: number[];
};

type SubmitRequest = {
  jsonrpc: typeof JSONRPC_VERSION;
  method: typeof SUBMIT_METHOD;
  id: typeof SUBMIT_ID;
  params: { uuid: string | null } & EncryptedPayload;
};

const _encryptPayload = (
  payload: unknown,
  sharedKey: Buffer,
): EncryptedPayload => {
  const forgeKey = forge.util.createBuffer(sharedKey.toString('binary'));
  return encryptAES256GCM(JSON.stringify(payload), forgeKey);
};

const _buildSubmitRequest = (
  uuid: string | null,
  encryptedPayload: EncryptedPayload,
): SubmitRequest => {
  return {
    jsonrpc: JSONRPC_VERSION,
    method: SUBMIT_METHOD,
    id: SUBMIT_ID,
    params: {
      uuid: uuid,
      ...encryptedPayload,
    },
  };
};

const getPlatform = (): 'ios' | 'android' =>
  Platform.OS === 'ios' ? 'ios' : 'android';

export type ProvingStateType =
  // Initial states
  | 'idle'
  | undefined
  // Data preparation states
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

const provingMachine = createMachine({
  id: 'proving',
  initial: 'idle',
  states: {
    idle: {
      on: {
        FETCH_DATA: 'fetching_data',
        ERROR: 'error',
        PASSPORT_DATA_NOT_FOUND: 'passport_data_not_found',
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

export type provingMachineCircuitType = 'register' | 'dsc' | 'disclose';

export const getPostVerificationRoute = () => {
  return 'AccountVerifiedSuccess';
  // disable for now
  // const { cloudBackupEnabled } = useSettingStore.getState();
  // return cloudBackupEnabled ? 'AccountVerifiedSuccess' : 'SaveRecoveryPhrase';
};

type WsHandlers = {
  message: (event: MessageEvent) => void;
  open: () => void;
  error: (error: Event) => void;
  close: (event: CloseEvent) => void;
};

interface ProvingState {
  currentState: ProvingStateType;
  attestation: number[] | null;
  serverPublicKey: string | null;
  sharedKey: Buffer | null;
  wsConnection: WebSocket | null;
  wsHandlers: WsHandlers | null;
  socketConnection: Socket | null;
  uuid: string | null;
  userConfirmed: boolean;
  passportData: PassportData | null;
  secret: string | null;
  circuitType: provingMachineCircuitType | null;
  error_code: string | null;
  reason: string | null;
  endpointType: EndpointType | null;
  fcmToken: string | null;
  env: 'prod' | 'stg' | null;
  setFcmToken: (token: string, selfClient: SelfClient) => void;
  init: (
    selfClient: SelfClient,
    circuitType: 'dsc' | 'disclose' | 'register',
    userConfirmed?: boolean,
  ) => Promise<void>;
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
  _handleWebSocketMessage: (
    event: MessageEvent,
    selfClient: SelfClient,
  ) => Promise<void>;
  _handleRegisterErrorOrFailure: (selfClient: SelfClient) => void;
  _startSocketIOStatusListener: (
    receivedUuid: string,
    endpointType: EndpointType,
    selfClient: SelfClient,
  ) => void;
  _handleWsOpen: (selfClient: SelfClient) => void;
  _handleWsError: (error: Event, selfClient: SelfClient) => void;
  _handleWsClose: (event: CloseEvent, selfClient: SelfClient) => void;

  _handlePassportNotSupported: (selfClient: SelfClient) => void;
  _handleAccountRecoveryChoice: (selfClient: SelfClient) => void;
  _handleAccountVerifiedSuccess: (selfClient: SelfClient) => void;
  _handlePassportDataNotFound: (selfClient: SelfClient) => void;
}

export const useProvingStore = create<ProvingState>((set, get) => {
  let actor: AnyActorRef | null = null;

  function setupActorSubscriptions(
    newActor: AnyActorRef,
    selfClient: SelfClient,
  ) {
    let lastTransition = Date.now();
    let lastEvent: AnyEventObject = { type: 'init' };
    newActor.on('*', (event: AnyEventObject) => {
      lastEvent = event;
    });
    newActor.subscribe((state: StateFrom<typeof provingMachine>) => {
      const now = Date.now();
      const context = createProofContext('stateTransition', {
        currentState: String(state.value),
      });
      logProofEvent('info', `State transition: ${state.value}`, context, {
        event: lastEvent.type,
        duration_ms: now - lastTransition,
      });
      lastTransition = now;
      selfClient.trackEvent(ProofEvents.PROVING_STATE_CHANGE, {
        state: state.value,
      });
      set({ currentState: state.value as ProvingStateType });

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

      if (
        get().circuitType !== 'disclose' &&
        (state.value === 'error' || state.value === 'failure')
      ) {
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
          useSelfAppStore.getState().handleProofResult(true);
        }
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
          useSelfAppStore
            .getState()
            .handleProofResult(
              false,
              error_code ?? undefined,
              reason ?? undefined,
            );
        }
      }
      if (state.value === 'error') {
        if (get().circuitType === 'disclose') {
          useSelfAppStore.getState().handleProofResult(false, 'error', 'error');
        }
      }
    });
  }

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
    selfApp: null,
    error_code: null,
    reason: null,
    endpointType: null,
    fcmToken: null,
    setFcmToken: (token: string, selfClient: SelfClient) => {
      set({ fcmToken: token });
      selfClient.trackEvent(ProofEvents.FCM_TOKEN_STORED);
    },
    _handleWebSocketMessage: async (
      event: MessageEvent,
      selfClient: SelfClient,
    ) => {
      if (!actor) {
        console.error('Cannot process message: State machine not initialized.');
        return;
      }

      const startTime = Date.now();
      const context = createProofContext('_handleWebSocketMessage');

      try {
        const result = JSON.parse(event.data);
        logProofEvent('info', 'WebSocket message received', context);
        if (result.result?.attestation) {
          selfClient?.trackEvent(ProofEvents.ATTESTATION_RECEIVED);
          logProofEvent('info', 'Attestation received', context);

          const attestationData = result.result.attestation;
          set({ attestation: attestationData });

          const serverPubkey = getPublicKey(attestationData);
          const verified = await verifyAttestation(attestationData);

          if (!verified) {
            logProofEvent('error', 'Attestation verification failed', context, {
              failure: 'PROOF_FAILED_TEE_PROCESSING',
              duration_ms: Date.now() - startTime,
            });
            console.error('Attestation verification failed');
            actor!.send({ type: 'CONNECT_ERROR' });
            return;
          }

          selfClient?.trackEvent(ProofEvents.ATTESTATION_VERIFIED);
          logProofEvent('info', 'Attestation verified', context);

          const serverKey = ec.keyFromPublic(serverPubkey as string, 'hex');
          const derivedKey = clientKey.derive(serverKey.getPublic());

          set({
            serverPublicKey: serverPubkey,
            sharedKey: Buffer.from(derivedKey.toArray('be', 32)),
          });
          selfClient?.trackEvent(ProofEvents.SHARED_KEY_DERIVED);
          logProofEvent('info', 'Shared key derived', context);

          actor!.send({ type: 'CONNECT_SUCCESS' });
        } else if (
          result.id === 2 &&
          typeof result.result === 'string' &&
          !result.error
        ) {
          selfClient?.trackEvent(ProofEvents.WS_HELLO_ACK);
          logProofEvent('info', 'Hello ACK received', context);

          // Received status from TEE
          const statusUuid = result.result;
          if (get().uuid !== statusUuid) {
            logProofEvent('warn', 'Status UUID mismatch', context, {
              received_uuid: statusUuid,
            });
            console.warn(
              `Received status UUID (${statusUuid}) does not match stored UUID (${get().uuid}). Using received UUID.`,
            );
          }
          const endpointType = get().endpointType;
          if (!endpointType) {
            logProofEvent('error', 'Endpoint type missing', context, {
              failure: 'PROOF_FAILED_TEE_PROCESSING',
              duration_ms: Date.now() - startTime,
            });
            console.error(
              'Cannot start Socket.IO listener: endpointType not set.',
            );
            selfClient?.trackEvent(ProofEvents.PROOF_FAILED, {
              circuitType: get().circuitType,
              error: get().error_code ?? 'unknown',
            });
            actor!.send({ type: 'PROVE_ERROR' });
            return;
          }
          get()._startSocketIOStatusListener(
            statusUuid,
            endpointType,
            selfClient,
          );
        } else if (result.error) {
          logProofEvent('error', 'TEE returned error', context, {
            failure: 'PROOF_FAILED_TEE_PROCESSING',
            error: result.error,
            duration_ms: Date.now() - startTime,
          });
          console.error('Received error from TEE:', result.error);
          selfClient?.trackEvent(ProofEvents.TEE_WS_ERROR, {
            error: result.error,
          });
          selfClient?.trackEvent(ProofEvents.PROOF_FAILED, {
            circuitType: get().circuitType,
            error: get().error_code ?? 'unknown',
          });
          actor!.send({ type: 'PROVE_ERROR' });
        } else {
          logProofEvent('warn', 'Unknown message format', context);
          console.warn('Received unknown message format from TEE:', result);
        }
      } catch (error) {
        logProofEvent('error', 'WebSocket message handling failed', context, {
          failure:
            get().currentState === 'init_tee_connexion'
              ? 'PROOF_FAILED_CONNECTION'
              : 'PROOF_FAILED_TEE_PROCESSING',
          error: error instanceof Error ? error.message : String(error),
          duration_ms: Date.now() - startTime,
        });
        console.error('Error processing WebSocket message:', error);
        if (get().currentState === 'init_tee_connexion') {
          selfClient?.trackEvent(ProofEvents.TEE_CONN_FAILED, {
            message: error instanceof Error ? error.message : String(error),
          });
          actor!.send({ type: 'CONNECT_ERROR' });
        } else {
          selfClient?.trackEvent(ProofEvents.TEE_WS_ERROR, {
            error: error instanceof Error ? error.message : String(error),
          });
          selfClient?.trackEvent(ProofEvents.PROOF_FAILED, {
            circuitType: get().circuitType,
            error: get().error_code ?? 'unknown',
          });
          actor!.send({ type: 'PROVE_ERROR' });
        }
      }
    },
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

    _startSocketIOStatusListener: (
      receivedUuid: string,
      endpointType: EndpointType,
      selfClient: SelfClient,
    ) => {
      if (!actor) {
        console.error('Cannot start Socket.IO listener: Actor not available.');
        return;
      }
      const url = getWSDbRelayerUrl(endpointType);
      const socket: Socket = socketIo(url, {
        path: '/',
        transports: ['websocket'],
      });
      set({ socketConnection: socket });
      selfClient.trackEvent(ProofEvents.SOCKETIO_CONN_STARTED);
      const context = createProofContext('_startSocketIOStatusListener');
      logProofEvent('info', 'Socket.IO listener started', context, { url });

      socket.on('connect', () => {
        socket?.emit('subscribe', receivedUuid);
        selfClient.trackEvent(ProofEvents.SOCKETIO_SUBSCRIBED);
        logProofEvent('info', 'Socket.IO connected', context);
      });

      socket.on('connect_error', error => {
        console.error('SocketIO connection error:', error);
        selfClient.trackEvent(ProofEvents.SOCKETIO_CONNECT_ERROR, {
          message: error instanceof Error ? error.message : String(error),
        });
        logProofEvent('error', 'Socket.IO connection error', context, {
          failure: 'PROOF_FAILED_CONNECTION',
          error: error instanceof Error ? error.message : String(error),
        });
        actor!.send({ type: 'PROVE_ERROR' });
        set({ socketConnection: null });
      });

      socket.on('disconnect', (_reason: string) => {
        const currentActor = actor;
        logProofEvent('warn', 'Socket.IO disconnected', context);
        if (get().currentState === 'ready_to_prove' && currentActor) {
          console.error(
            'SocketIO disconnected unexpectedly during proof listening.',
          );
          selfClient.trackEvent(ProofEvents.SOCKETIO_DISCONNECT_UNEXPECTED);
          logProofEvent(
            'error',
            'Socket.IO disconnected unexpectedly',
            context,
            {
              failure: 'PROOF_FAILED_CONNECTION',
            },
          );
          currentActor.send({ type: 'PROVE_ERROR' });
        }
        set({ socketConnection: null });
      });

      socket.on('status', (message: unknown) => {
        try {
          const data = parseStatusMessage(message);

          selfClient.trackEvent(ProofEvents.SOCKETIO_STATUS_RECEIVED, {
            status: data.status,
          });
          logProofEvent('info', 'Status message received', context, {
            status: data.status,
          });

          const result = handleStatusCode(data, get().circuitType as string);

          // Handle state updates
          if (result.stateUpdate) {
            set(result.stateUpdate);
          }

          // Handle analytics
          result.analytics?.forEach(({ event, data: eventData }) => {
            if (event === 'SOCKETIO_PROOF_FAILURE') {
              logProofEvent('error', 'TEE processing failed', context, {
                failure: 'PROOF_FAILED_TEE_PROCESSING',
                error_code: eventData?.error_code,
                reason: eventData?.reason,
              });
            } else if (event === 'SOCKETIO_PROOF_SUCCESS') {
              logProofEvent('info', 'TEE processing succeeded', context);
            }
            selfClient.trackEvent(
              event as unknown as keyof typeof ProofEvents,
              eventData,
            );
          });

          // Handle actor events
          if (result.actorEvent) {
            if (result.actorEvent.type === 'PROVE_FAILURE') {
              console.error(
                'Proof generation/verification failed (status 3 or 5).',
              );
              console.error(data);
            }
            actor!.send(result.actorEvent);
          }

          // Handle disconnection
          if (result.shouldDisconnect) {
            socket?.disconnect();
          }
        } catch (error) {
          console.error('Error handling status message:', error);
          logProofEvent('error', 'Status message parsing failed', context, {
            failure: 'PROOF_FAILED_MESSAGE_PARSING',
            error: error instanceof Error ? error.message : String(error),
          });
          actor!.send({ type: 'PROVE_ERROR' });
        }
      });
    },

    _handleWsOpen: (selfClient: SelfClient) => {
      if (!actor) {
        return;
      }
      const ws = get().wsConnection;
      if (!ws) {
        return;
      }
      const connectionUuid = v4();

      selfClient.trackEvent(ProofEvents.CONNECTION_UUID_GENERATED, {
        connection_uuid: connectionUuid,
      });
      const context = createProofContext('_handleWsOpen', {
        sessionId: connectionUuid,
      });
      logProofEvent('info', 'WebSocket open', context);
      set({ uuid: connectionUuid });
      const helloBody = {
        jsonrpc: '2.0',
        method: 'openpassport_hello',
        id: 1,
        params: {
          user_pubkey: [
            4,
            ...Array.from(Buffer.from(clientPublicKeyHex, 'hex')),
          ],
          uuid: connectionUuid,
        },
      };
      selfClient.trackEvent(ProofEvents.WS_HELLO_SENT);
      ws.send(JSON.stringify(helloBody));
      logProofEvent('info', 'WS hello sent', context);
    },

    _handleWsError: (error: Event, selfClient: SelfClient) => {
      console.error('TEE WebSocket error event:', error);
      if (!actor) {
        return;
      }
      const context = createProofContext('_handleWsError');
      logProofEvent('error', 'TEE WebSocket error', context, {
        failure: 'PROOF_FAILED_CONNECTION',
        error: error instanceof Error ? error.message : String(error),
      });
      get()._handleWebSocketMessage(
        new MessageEvent('error', {
          data: JSON.stringify({ error: 'WebSocket connection error' }),
        }),
        selfClient,
      );
    },

    _handleWsClose: (event: CloseEvent, selfClient: SelfClient) => {
      selfClient.trackEvent(ProofEvents.TEE_WS_CLOSED, {
        code: event.code,
        reason: event.reason,
      });
      if (!actor) {
        return;
      }
      const context = createProofContext('_handleWsClose');
      logProofEvent('warn', 'TEE WebSocket closed', context, {
        code: event.code,
        reason: event.reason,
      });
      const currentState = get().currentState;
      if (
        currentState === 'init_tee_connexion' ||
        currentState === 'proving' ||
        currentState === 'listening_for_status'
      ) {
        console.error(
          `TEE WebSocket closed unexpectedly during ${currentState}.`,
        );
        get()._handleWebSocketMessage(
          new MessageEvent('error', {
            data: JSON.stringify({ error: 'WebSocket closed unexpectedly' }),
          }),
          selfClient,
        );
      }
      if (get().wsConnection) {
        set({ wsConnection: null });
      }
    },

    init: async (
      selfClient: SelfClient,
      circuitType: 'dsc' | 'disclose' | 'register',
      userConfirmed: boolean = false,
    ) => {
      selfClient.trackEvent(ProofEvents.PROVING_INIT);
      get()._closeConnections(selfClient);

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
      actor.send({ type: 'FETCH_DATA' });
      selfClient.trackEvent(ProofEvents.FETCH_DATA_STARTED);
    },

    startFetchingData: async (selfClient: SelfClient) => {
      _checkActorInitialized(actor);
      selfClient.trackEvent(ProofEvents.FETCH_DATA_STARTED);
      const startTime = Date.now();
      const context = createProofContext('startFetchingData');
      logProofEvent('info', 'Fetching DSC data started', context);
      try {
        const { passportData, env } = get();
        if (!passportData) {
          throw new Error('PassportData is not available');
        }
        if (!passportData?.dsc_parsed) {
          logProofEvent('error', 'Missing parsed DSC', context, {
            failure: 'PROOF_FAILED_DATA_FETCH',
            duration_ms: Date.now() - startTime,
          });
          console.error('Missing parsed DSC in passport data');
          selfClient.trackEvent(ProofEvents.FETCH_DATA_FAILED, {
            message: 'Missing parsed DSC in passport data',
          });
          actor!.send({ type: 'FETCH_ERROR' });
          return;
        }
        const document: DocumentCategory = passportData.documentCategory;
        logProofEvent('info', 'Protocol store fetch', context, {
          step: 'protocol_store_fetch',
          document,
        });
        await useProtocolStore
          .getState()
          [
            document
          ].fetch_all(env!, (passportData as PassportData).dsc_parsed!.authorityKeyIdentifier);
        logProofEvent('info', 'Data fetch succeeded', context, {
          duration_ms: Date.now() - startTime,
        });
        selfClient.trackEvent(ProofEvents.FETCH_DATA_SUCCESS);
        actor!.send({ type: 'FETCH_SUCCESS' });
      } catch (error) {
        logProofEvent('error', 'Data fetch failed', context, {
          failure: 'PROOF_FAILED_DATA_FETCH',
          error: error instanceof Error ? error.message : String(error),
          duration_ms: Date.now() - startTime,
        });
        console.error('Error fetching data:', error);
        selfClient.trackEvent(ProofEvents.FETCH_DATA_FAILED, {
          message: error instanceof Error ? error.message : String(error),
        });
        actor!.send({ type: 'FETCH_ERROR' });
      }
    },

    validatingDocument: async (selfClient: SelfClient) => {
      _checkActorInitialized(actor);
      // TODO: for the disclosure, we could check that the selfApp is a valid one.
      selfClient.trackEvent(ProofEvents.VALIDATION_STARTED);
      const startTime = Date.now();
      const context = createProofContext('validatingDocument');
      logProofEvent('info', 'Validating document started', context);
      try {
        const { passportData, secret, circuitType } = get();
        if (!passportData) {
          throw new Error('PassportData is not available');
        }
        const isSupported = await checkDocumentSupported(passportData, {
          getDeployedCircuits: (documentCategory: DocumentCategory) =>
            useProtocolStore.getState()[documentCategory].deployed_circuits!,
        });
        logProofEvent('info', 'Document support check', context, {
          supported: isSupported.status === 'passport_supported',
          duration_ms: Date.now() - startTime,
        });
        if (isSupported.status !== 'passport_supported') {
          logProofEvent('error', 'Passport not supported', context, {
            failure: 'PROOF_FAILED_VALIDATION',
            details: isSupported.details,
            duration_ms: Date.now() - startTime,
          });
          console.error(
            'Passport not supported:',
            isSupported.status,
            isSupported.details,
          );
          selfClient.trackEvent(PassportEvents.UNSUPPORTED_PASSPORT, {
            status: isSupported.status,
            details: isSupported.details,
          });

          await clearPassportData(selfClient);

          actor!.send({ type: 'PASSPORT_NOT_SUPPORTED' });
          return;
        }
        const getCommitmentTree = (documentCategory: DocumentCategory) =>
          useProtocolStore.getState()[documentCategory].commitment_tree;
        /// disclosure
        if (circuitType === 'disclose') {
          const isRegisteredWithLocalCSCA = await isUserRegistered(
            passportData,
            secret as string,
            getCommitmentTree,
          );
          logProofEvent('info', 'Local CSCA registration check', context, {
            registered: isRegisteredWithLocalCSCA,
          });
          if (isRegisteredWithLocalCSCA) {
            logProofEvent('info', 'Validation succeeded', context, {
              duration_ms: Date.now() - startTime,
            });
            selfClient.trackEvent(ProofEvents.VALIDATION_SUCCESS);
            actor!.send({ type: 'VALIDATION_SUCCESS' });
            return;
          } else {
            logProofEvent('error', 'Passport data not found', context, {
              failure: 'PROOF_FAILED_VALIDATION',
              duration_ms: Date.now() - startTime,
            });
            actor!.send({ type: 'PASSPORT_DATA_NOT_FOUND' });
            return;
          }
        }

        /// registration
        else {
          const { isRegistered, csca } =
            await isUserRegisteredWithAlternativeCSCA(
              passportData,
              secret as string,
              {
                getCommitmentTree,
                getAltCSCA: docType =>
                  useProtocolStore.getState()[docType].alternative_csca,
              },
            );
          logProofEvent(
            'info',
            'Alternative CSCA registration check',
            context,
            {
              registered: isRegistered,
            },
          );
          if (isRegistered) {
            await reStorePassportDataWithRightCSCA(
              selfClient,
              passportData,
              csca as string,
            );

            (async () => {
              try {
                await markCurrentDocumentAsRegistered(selfClient);
              } catch (error) {
                console.error('Error marking document as registered:', error);
              }
            })();

            selfClient.trackEvent(ProofEvents.ALREADY_REGISTERED);
            logProofEvent('info', 'Document already registered', context, {
              duration_ms: Date.now() - startTime,
            });
            actor!.send({ type: 'ALREADY_REGISTERED' });
            return;
          }
          const isNullifierOnchain = await isDocumentNullified(passportData);
          logProofEvent('info', 'Nullifier check', context, {
            nullified: isNullifierOnchain,
          });
          if (isNullifierOnchain) {
            logProofEvent('error', 'Passport nullified', context, {
              failure: 'PROOF_FAILED_VALIDATION',
              duration_ms: Date.now() - startTime,
            });
            console.warn(
              'Passport is nullified, but not registered with this secret. Navigating to AccountRecoveryChoice',
            );
            selfClient.trackEvent(ProofEvents.PASSPORT_NULLIFIER_ONCHAIN);
            actor!.send({ type: 'ACCOUNT_RECOVERY_CHOICE' });
            return;
          }
          const document: DocumentCategory = passportData.documentCategory;
          const isDscRegistered = await checkIfPassportDscIsInTree(
            passportData,
            useProtocolStore.getState()[document].dsc_tree,
          );
          logProofEvent('info', 'DSC tree check', context, {
            dsc_registered: isDscRegistered,
          });
          if (isDscRegistered) {
            selfClient.trackEvent(ProofEvents.DSC_IN_TREE);
            set({ circuitType: 'register' });
          }
          logProofEvent('info', 'Validation succeeded', context, {
            duration_ms: Date.now() - startTime,
          });
          selfClient.trackEvent(ProofEvents.VALIDATION_SUCCESS);
          actor!.send({ type: 'VALIDATION_SUCCESS' });
        }
      } catch (error) {
        logProofEvent('error', 'Validation failed', context, {
          failure: 'PROOF_FAILED_VALIDATION',
          error: error instanceof Error ? error.message : String(error),
          duration_ms: Date.now() - startTime,
        });
        console.error('Error validating passport:', error);
        selfClient.trackEvent(ProofEvents.VALIDATION_FAILED, {
          message: error instanceof Error ? error.message : String(error),
        });
        actor!.send({ type: 'VALIDATION_ERROR' });
      }
    },

    initTeeConnection: async (selfClient: SelfClient): Promise<boolean> => {
      const startTime = Date.now();
      const baseContext = createProofContext('initTeeConnection');
      const { passportData } = get();
      if (!passportData) {
        logProofEvent('error', 'Passport data missing', baseContext, {
          failure: 'PROOF_FAILED_CONNECTION',
          duration_ms: Date.now() - startTime,
        });
        throw new Error('PassportData is not available');
      }
      const document: DocumentCategory = (passportData as PassportData)
        .documentCategory;
      const circuitType = get().circuitType as 'disclose' | 'register' | 'dsc';

      let circuitName;
      if (circuitType === 'disclose') {
        circuitName = 'disclose';
      } else {
        circuitName = getCircuitNameFromPassportData(
          passportData,
          circuitType as 'register' | 'dsc',
        );
      }

      const wsRpcUrl = resolveWebSocketUrl(
        circuitType,
        passportData as PassportData,
        circuitName,
      );
      logProofEvent('info', 'Circuit resolution', baseContext, {
        circuit_name: circuitName,
        ws_url: wsRpcUrl,
      });
      if (!circuitName) {
        actor?.send({ type: 'CONNECT_ERROR' });
        logProofEvent('error', 'Circuit name missing', baseContext, {
          failure: 'PROOF_FAILED_CONNECTION',
          duration_ms: Date.now() - startTime,
        });
        throw new Error('Could not determine circuit name');
      }

      if (!wsRpcUrl) {
        actor?.send({ type: 'CONNECT_ERROR' });
        logProofEvent('error', 'WebSocket URL missing', baseContext, {
          failure: 'PROOF_FAILED_CONNECTION',
          duration_ms: Date.now() - startTime,
        });
        throw new Error('No WebSocket URL available for TEE connection');
      }

      get()._closeConnections(selfClient);
      selfClient.trackEvent(ProofEvents.TEE_CONN_STARTED);
      logProofEvent('info', 'TEE connection attempt', baseContext);

      return new Promise(resolve => {
        const ws = new WebSocket(wsRpcUrl);

        const handleConnectSuccess = () => {
          logProofEvent('info', 'TEE connection succeeded', baseContext, {
            duration_ms: Date.now() - startTime,
          });
          selfClient.trackEvent(ProofEvents.TEE_CONN_SUCCESS);
          resolve(true);
        };
        const handleConnectError = (msg: string = 'connect_error') => {
          logProofEvent('error', 'TEE connection failed', baseContext, {
            failure: 'PROOF_FAILED_CONNECTION',
            error: msg,
            duration_ms: Date.now() - startTime,
          });
          selfClient.trackEvent(ProofEvents.TEE_CONN_FAILED, { message: msg });
          resolve(false);
        };

        // Create stable handler functions
        const wsHandlers: WsHandlers = {
          message: (event: MessageEvent) =>
            get()._handleWebSocketMessage(event, selfClient),
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
      const { wsConnection, sharedKey, passportData, secret, uuid, fcmToken } =
        get();
      const context = createProofContext('startProving', {
        sessionId: uuid || get().uuid || 'unknown-session',
      });

      if (get().currentState !== 'ready_to_prove') {
        logProofEvent('error', 'Not in ready_to_prove state', context, {
          failure: 'PROOF_FAILED_CONNECTION',
        });
        console.error('Cannot start proving: Not in ready_to_prove state.');
        return;
      }
      if (!wsConnection || !sharedKey || !passportData || !secret || !uuid) {
        logProofEvent('error', 'Missing proving prerequisites', context, {
          failure: 'PROOF_FAILED_CONNECTION',
        });
        console.error(
          'Cannot start proving: Missing wsConnection, sharedKey, passportData, secret, or uuid.',
        );
        actor!.send({ type: 'PROVE_ERROR' });
        return;
      }

      try {
        if (fcmToken) {
          try {
            const {
              registerDeviceToken,
            } = require('@/utils/notifications/notificationService');
            const isMockPassport = passportData?.mock;
            selfClient.trackEvent(ProofEvents.DEVICE_TOKEN_REG_STARTED);
            logProofEvent('info', 'Device token registration started', context);
            await registerDeviceToken(uuid, fcmToken, isMockPassport);
            selfClient.trackEvent(ProofEvents.DEVICE_TOKEN_REG_SUCCESS);
            logProofEvent('info', 'Device token registration success', context);
          } catch (error) {
            logProofEvent('warn', 'Device token registration failed', context, {
              error: error instanceof Error ? error.message : String(error),
            });
            console.error('Error registering device token:', error);
            selfClient.trackEvent(ProofEvents.DEVICE_TOKEN_REG_FAILED, {
              message: error instanceof Error ? error.message : String(error),
            });
          }
        }

        selfClient.trackEvent(ProofEvents.PAYLOAD_GEN_STARTED);
        logProofEvent('info', 'Payload generation started', context);
        const submitBody = await get()._generatePayload(selfClient);
        wsConnection.send(JSON.stringify(submitBody));
        logProofEvent('info', 'Payload sent over WebSocket', context);
        selfClient.trackEvent(ProofEvents.PAYLOAD_SENT);
        selfClient.trackEvent(ProofEvents.PROVING_PROCESS_STARTED);
        actor!.send({ type: 'START_PROVING' });
        logProofEvent('info', 'Proving started', context, {
          duration_ms: Date.now() - startTime,
        });
      } catch (error) {
        logProofEvent('error', 'startProving failed', context, {
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
          console.error(
            'Error removing listeners or closing WebSocket:',
            error,
          );
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

    _generatePayload: async (selfClient: SelfClient) => {
      const startTime = Date.now();
      const { circuitType, passportData, secret, uuid, sharedKey, env } = get();
      const context = createProofContext('_generatePayload', {
        sessionId: uuid || get().uuid || 'unknown-session',
        circuitType: circuitType || null,
      });
      logProofEvent('info', 'Payload generation started', context);

      try {
        if (!passportData) {
          throw new Error('PassportData is not available');
        }
        if (!env) {
          throw new Error('Environment not set');
        }
        if (!sharedKey) {
          throw new Error('Shared key not available');
        }

        // Generate circuit inputs
        const {
          inputs,
          circuitName,
          endpointType,
          endpoint,
          circuitTypeWithDocumentExtension,
        } = _generateCircuitInputs(
          circuitType as 'disclose' | 'register' | 'dsc',
          secret,
          passportData,
          env,
        );

        logProofEvent('info', 'Inputs generated', context, {
          circuit_name: circuitName,
          endpoint_type: endpointType,
        });

        // Build payload
        const selfApp = useSelfAppStore.getState().selfApp;
        const userDefinedData = getSolidityPackedUserContextData(
          selfApp?.chainID ?? 0,
          selfApp?.userId ?? '',
          selfApp?.userDefinedData ?? '',
        ).slice(2);

        const payload = getPayload(
          inputs,
          circuitTypeWithDocumentExtension as
            | 'register_id'
            | 'dsc_id'
            | 'register'
            | 'dsc',
          circuitName as string,
          endpointType as EndpointType,
          endpoint as string,
          selfApp?.version,
          userDefinedData,
        );

        const payloadSize = JSON.stringify(payload).length;

        // Encrypt payload
        const encryptedPayload = _encryptPayload(payload, sharedKey);

        logProofEvent('info', 'Payload encrypted', context, {
          payload_size: payloadSize,
        });

        selfClient.trackEvent(ProofEvents.PAYLOAD_GEN_COMPLETED);
        selfClient.trackEvent(ProofEvents.PAYLOAD_ENCRYPTED);

        set({ endpointType: endpointType as EndpointType });

        logProofEvent('info', 'Payload generation completed', context, {
          duration_ms: Date.now() - startTime,
        });

        // Build and return submit request
        return _buildSubmitRequest(uuid!, encryptedPayload);
      } catch (error) {
        logProofEvent('error', 'Payload generation failed', context, {
          failure: 'PROOF_FAILED_PAYLOAD_GEN',
          error: error instanceof Error ? error.message : String(error),
          duration_ms: Date.now() - startTime,
        });
        throw error;
      }
    },

    _handlePassportNotSupported: (selfClient: SelfClient) => {
      const passportData = get().passportData;
      const countryCode = passportData?.passportMetadata?.countryCode;
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
  stage: string,
  overrides: Partial<ProofContext> = {},
): ProofContext => {
  const selfApp = useSelfAppStore.getState().selfApp;
  const provingState = useProvingStore.getState();

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
