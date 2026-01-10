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
  getSKIPEM,
  getSolidityPackedUserContextData,
  initPassportDataParsing,
} from '@selfxyz/common/utils';
import { checkPCR0Mapping, validatePKIToken } from '@selfxyz/common/utils/attest';
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
import type { IDDocument } from '@selfxyz/common/utils/types';

import { PassportEvents, ProofEvents } from '../constants/analytics';
import {
  clearPassportData,
  hasAnyValidRegisteredDocument,
  loadSelectedDocument,
  markCurrentDocumentAsRegistered,
  reStorePassportDataWithRightCSCA,
  storePassportData,
} from '../documents/utils';
import { fetchAllTreesAndCircuits, getCommitmentTree } from '../stores';
import { SdkEvents } from '../types/events';
import type { SelfClient } from '../types/public';
import type { ProofContext } from './internal/logging';
import { handleStatusCode, parseStatusMessage } from './internal/statusHandlers';

// Helper functions for WebSocket URL resolution
const getMappingKey = (circuitType: 'disclose' | 'register' | 'dsc', documentCategory: DocumentCategory): string => {
  if (circuitType === 'disclose') {
    if (documentCategory === 'passport') return 'DISCLOSE';
    if (documentCategory === 'id_card') return 'DISCLOSE_ID';
    if (documentCategory === 'aadhaar') return 'DISCLOSE_AADHAAR';
    throw new Error(`Unsupported document category for disclose: ${documentCategory}`);
  }
  if (circuitType === 'register') {
    if (documentCategory === 'passport') return 'REGISTER';
    if (documentCategory === 'id_card') return 'REGISTER_ID';
    if (documentCategory === 'aadhaar') return 'REGISTER_AADHAAR';
    throw new Error(`Unsupported document category for register: ${documentCategory}`);
  }
  // circuitType === 'dsc'
  return documentCategory === 'passport' ? 'DSC' : 'DSC_ID';
};

const resolveWebSocketUrl = (
  selfClient: SelfClient,
  circuitType: 'disclose' | 'register' | 'dsc',
  passportData: PassportData,
  circuitName: string,
): string | undefined => {
  const { documentCategory } = passportData;
  const circuitsMapping = selfClient.getProtocolState()[documentCategory].circuits_dns_mapping;
  const mappingKey = getMappingKey(circuitType, documentCategory);

  return circuitsMapping?.[mappingKey]?.[circuitName];
};

// Helper functions for _generatePayload refactoring
const _generateCircuitInputs = async (
  selfClient: SelfClient,
  circuitType: 'disclose' | 'register' | 'dsc',
  secret: string | undefined | null,
  passportData: IDDocument,
  env: 'prod' | 'stg',
  selfApp: SelfApp | null,
) => {
  const document: DocumentCategory = passportData.documentCategory;
  const protocolStore = selfClient.getProtocolState();

  // (Removed the early selfApp guard—only the disclosure path now enforces selfApp below)

  let inputs, circuitName, endpointType, endpoint, circuitTypeWithDocumentExtension;
  switch (circuitType) {
    case 'register':
      ({ inputs, circuitName, endpointType, endpoint } = await generateTEEInputsRegister(
        secret as string,
        passportData,
        document === 'aadhaar' ? protocolStore[document].public_keys : protocolStore[document].dsc_tree,
        env,
      ));
      circuitTypeWithDocumentExtension = `${circuitType}${document === 'passport' ? '' : '_id'}`;
      break;
    case 'dsc':
      if (document === 'aadhaar') {
        throw new Error('DSC circuit type is not supported for Aadhaar documents');
      }
      ({ inputs, circuitName, endpointType, endpoint } = generateTEEInputsDSC(
        passportData as PassportData,
        protocolStore[document].csca_tree as string[][],
        env,
      ));
      circuitTypeWithDocumentExtension = `${circuitType}${document === 'passport' ? '' : '_id'}`;
      break;
    case 'disclose': {
      if (!selfApp) {
        throw new Error('SelfApp context not initialized');
      }
      ({ inputs, circuitName, endpointType, endpoint } = generateTEEInputsDiscloseStateless(
        secret as string,
        passportData,
        selfApp,
        (doc: DocumentCategory, tree) => {
          const docStore =
            doc === 'passport'
              ? protocolStore.passport
              : doc === 'aadhaar'
                ? protocolStore.aadhaar
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
    }
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

const _encryptPayload = (payload: unknown, sharedKey: Buffer): EncryptedPayload => {
  const forgeKey = forge.util.createBuffer(sharedKey.toString('binary'));
  return encryptAES256GCM(JSON.stringify(payload), forgeKey);
};

const _buildSubmitRequest = (uuid: string | null, encryptedPayload: EncryptedPayload): SubmitRequest => {
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
    _handleWebSocketMessage: async (event: MessageEvent, selfClient: SelfClient) => {
      if (!actor) {
        console.error('Cannot process message: State machine not initialized.');
        return;
      }

      const startTime = Date.now();
      const context = createProofContext(selfClient, '_handleWebSocketMessage');

      try {
        const result = JSON.parse(event.data);
        selfClient.logProofEvent('info', 'WebSocket message received', context);
        if (result.result?.attestation) {
          selfClient?.trackEvent(ProofEvents.ATTESTATION_RECEIVED);
          selfClient.logProofEvent('info', 'Attestation received', context);

          const attestationData = result.result.attestation;
          set({ attestation: attestationData });
          const attestationToken = Buffer.from(attestationData).toString('utf-8');

          const { userPubkey, serverPubkey, imageHash, verified } = validatePKIToken(attestationToken, __DEV__);

          const pcr0Mapping = await checkPCR0Mapping(imageHash);

          if (!__DEV__ && !pcr0Mapping) {
            console.error('PCR0 mapping not found');
            actor!.send({ type: 'CONNECT_ERROR' });
            return;
          }

          if (clientPublicKeyHex !== userPubkey.toString('hex')) {
            console.error('User public key does not match');
            actor!.send({ type: 'CONNECT_ERROR' });
            return;
          }

          if (!verified) {
            selfClient.logProofEvent('error', 'Attestation verification failed', context, {
              failure: 'PROOF_FAILED_TEE_PROCESSING',
              duration_ms: Date.now() - startTime,
            });
            console.error('Attestation verification failed');
            actor!.send({ type: 'CONNECT_ERROR' });
            return;
          }

          selfClient?.trackEvent(ProofEvents.ATTESTATION_VERIFIED);
          selfClient.logProofEvent('info', 'Attestation verified', context);

          const serverKey = ec.keyFromPublic(serverPubkey, 'hex');
          const derivedKey = clientKey.derive(serverKey.getPublic());

          set({
            serverPublicKey: serverKey.getPublic(true, 'hex'),
            sharedKey: Buffer.from(derivedKey.toArray('be', 32)),
          });
          selfClient?.trackEvent(ProofEvents.SHARED_KEY_DERIVED);
          selfClient.logProofEvent('info', 'Shared key derived', context);

          actor!.send({ type: 'CONNECT_SUCCESS' });
        } else if (result.id === 2 && typeof result.result === 'string' && !result.error) {
          selfClient?.trackEvent(ProofEvents.WS_HELLO_ACK);
          selfClient.logProofEvent('info', 'Hello ACK received', context);

          // Received status from TEE
          const statusUuid = result.result;
          if (get().uuid !== statusUuid) {
            selfClient.logProofEvent('warn', 'Status UUID mismatch', context, {
              received_uuid: statusUuid,
            });
            console.warn(
              `Received status UUID (${statusUuid}) does not match stored UUID (${get().uuid}). Using received UUID.`,
            );
          }
          const endpointType = get().endpointType;
          if (!endpointType) {
            selfClient.logProofEvent('error', 'Endpoint type missing', context, {
              failure: 'PROOF_FAILED_TEE_PROCESSING',
              duration_ms: Date.now() - startTime,
            });
            console.error('Cannot start Socket.IO listener: endpointType not set.');
            selfClient?.trackEvent(ProofEvents.PROOF_FAILED, {
              circuitType: get().circuitType,
              error: get().error_code ?? 'unknown',
            });
            actor!.send({ type: 'PROVE_ERROR' });
            return;
          }
          get()._startSocketIOStatusListener(statusUuid, endpointType, selfClient);
        } else if (result.error) {
          selfClient.logProofEvent('error', 'TEE returned error', context, {
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
          selfClient.logProofEvent('warn', 'Unknown message format', context);
          console.warn('Received unknown message format from TEE:', result);
        }
      } catch (error) {
        selfClient.logProofEvent('error', 'WebSocket message handling failed', context, {
          failure:
            get().currentState === 'init_tee_connexion' ? 'PROOF_FAILED_CONNECTION' : 'PROOF_FAILED_TEE_PROCESSING',
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

    _startSocketIOStatusListener: (receivedUuid: string, endpointType: EndpointType, selfClient: SelfClient) => {
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
      const context = createProofContext(selfClient, '_startSocketIOStatusListener');
      selfClient.logProofEvent('info', 'Socket.IO listener started', context, { url });

      socket.on('connect', () => {
        socket?.emit('subscribe', receivedUuid);
        selfClient.trackEvent(ProofEvents.SOCKETIO_SUBSCRIBED);
        selfClient.logProofEvent('info', 'Socket.IO connected', context);
      });

      socket.on('connect_error', error => {
        console.error('SocketIO connection error:', error);
        selfClient.trackEvent(ProofEvents.SOCKETIO_CONNECT_ERROR, {
          message: error instanceof Error ? error.message : String(error),
        });
        selfClient.logProofEvent('error', 'Socket.IO connection error', context, {
          failure: 'PROOF_FAILED_CONNECTION',
          error: error instanceof Error ? error.message : String(error),
        });
        actor!.send({ type: 'PROVE_ERROR' });
        set({ socketConnection: null });
      });

      socket.on('disconnect', (_reason: string) => {
        const currentActor = actor;
        selfClient.logProofEvent('warn', 'Socket.IO disconnected', context);
        if (get().currentState === 'ready_to_prove' && currentActor) {
          console.error('SocketIO disconnected unexpectedly during proof listening.');
          selfClient.trackEvent(ProofEvents.SOCKETIO_DISCONNECT_UNEXPECTED);
          selfClient.logProofEvent('error', 'Socket.IO disconnected unexpectedly', context, {
            failure: 'PROOF_FAILED_CONNECTION',
          });
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
          selfClient.logProofEvent('info', 'Status message received', context, {
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
              selfClient.logProofEvent('error', 'TEE processing failed', context, {
                failure: 'PROOF_FAILED_TEE_PROCESSING',
                error_code: eventData?.error_code,
                reason: eventData?.reason,
              });
            } else if (event === 'SOCKETIO_PROOF_SUCCESS') {
              selfClient.logProofEvent('info', 'TEE processing succeeded', context);
            }
            selfClient.trackEvent(event as unknown as keyof typeof ProofEvents, eventData);
          });

          // Handle actor events
          if (result.actorEvent) {
            if (result.actorEvent.type === 'PROVE_FAILURE') {
              console.error('Proof generation/verification failed (status 3 or 5).');
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
          selfClient.logProofEvent('error', 'Status message parsing failed', context, {
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
      const context = createProofContext(selfClient, '_handleWsOpen', {
        sessionId: connectionUuid,
      });
      selfClient.logProofEvent('info', 'WebSocket open', context);
      set({ uuid: connectionUuid });
      const helloBody = {
        jsonrpc: '2.0',
        method: 'openpassport_hello',
        id: 1,
        params: {
          user_pubkey: [...Array.from(Buffer.from(clientPublicKeyHex, 'hex'))],
          uuid: connectionUuid,
        },
      };
      selfClient.trackEvent(ProofEvents.WS_HELLO_SENT);
      ws.send(JSON.stringify(helloBody));
      selfClient.logProofEvent('info', 'WS hello sent', context);
    },

    _handleWsError: (error: Event, selfClient: SelfClient) => {
      console.error('TEE WebSocket error event:', error);
      if (!actor) {
        return;
      }
      const context = createProofContext(selfClient, '_handleWsError');
      selfClient.logProofEvent('error', 'TEE WebSocket error', context, {
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
      const context = createProofContext(selfClient, '_handleWsClose');
      selfClient.logProofEvent('warn', 'TEE WebSocket closed', context, {
        code: event.code,
        reason: event.reason,
      });
      const currentState = get().currentState;
      if (
        currentState === 'init_tee_connexion' ||
        currentState === 'proving' ||
        currentState === 'listening_for_status'
      ) {
        console.error(`TEE WebSocket closed unexpectedly during ${currentState}.`);
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

    parseIDDocument: async (selfClient: SelfClient) => {
      _checkActorInitialized(actor);
      const startTime = Date.now();
      const context = createProofContext(selfClient, 'parseIDDocument');
      selfClient.logProofEvent('info', 'Parsing ID document started', context);

      try {
        const { passportData, env } = get();
        if (!passportData) {
          throw new Error('PassportData is not available');
        }

        selfClient.logProofEvent('info', 'ID document parsing process started', context);

        // Parse ID document logic (copied from parseIDDocument.ts but without try-catch wrapper)
        const skiPem = await getSKIPEM(env === 'stg' ? 'staging' : 'production');
        const parsedPassportData = initPassportDataParsing(passportData as PassportData, skiPem);
        if (!parsedPassportData) {
          throw new Error('Failed to parse passport data');
        }

        const passportMetadata = parsedPassportData.passportMetadata!;
        let dscObject;
        try {
          dscObject = { dsc: passportMetadata.dsc };
        } catch (error) {
          console.error('Failed to parse dsc:', error);
          dscObject = {};
        }

        selfClient.trackEvent(PassportEvents.PASSPORT_PARSED, {
          success: true,
          data_groups: passportMetadata.dataGroups,
          dg1_size: passportMetadata.dg1Size,
          dg1_hash_size: passportMetadata.dg1HashSize,
          dg1_hash_function: passportMetadata.dg1HashFunction,
          dg1_hash_offset: passportMetadata.dg1HashOffset,
          dg_padding_bytes: passportMetadata.dgPaddingBytes,
          e_content_size: passportMetadata.eContentSize,
          e_content_hash_function: passportMetadata.eContentHashFunction,
          e_content_hash_offset: passportMetadata.eContentHashOffset,
          signed_attr_size: passportMetadata.signedAttrSize,
          signed_attr_hash_function: passportMetadata.signedAttrHashFunction,
          signature_algorithm: passportMetadata.signatureAlgorithm,
          salt_length: passportMetadata.saltLength,
          curve_or_exponent: passportMetadata.curveOrExponent,
          signature_algorithm_bits: passportMetadata.signatureAlgorithmBits,
          country_code: passportMetadata.countryCode,
          csca_found: passportMetadata.cscaFound,
          csca_hash_function: passportMetadata.cscaHashFunction,
          csca_signature_algorithm: passportMetadata.cscaSignatureAlgorithm,
          csca_salt_length: passportMetadata.cscaSaltLength,
          csca_curve_or_exponent: passportMetadata.cscaCurveOrExponent,
          csca_signature_algorithm_bits: passportMetadata.cscaSignatureAlgorithmBits,
          dsc: dscObject,
          dsc_aki: (passportData as PassportData).dsc_parsed?.authorityKeyIdentifier,
          dsc_ski: (passportData as PassportData).dsc_parsed?.subjectKeyIdentifier,
        });
        console.log('passport data parsed successfully, storing in keychain');
        await storePassportData(selfClient, parsedPassportData);
        console.log('passport data stored in keychain');

        set({ passportData: parsedPassportData });
        selfClient.logProofEvent('info', 'ID document parsing succeeded', context, {
          duration_ms: Date.now() - startTime,
        });
        actor!.send({ type: 'PARSE_SUCCESS' });
      } catch (error) {
        selfClient.logProofEvent('error', 'ID document parsing failed', context, {
          failure: 'PROOF_FAILED_PARSING',
          error: error instanceof Error ? error.message : String(error),
          duration_ms: Date.now() - startTime,
        });
        console.error('Error parsing ID document:', error);
        const errMsg = error instanceof Error ? error.message : String(error);
        selfClient.trackEvent(PassportEvents.PASSPORT_PARSE_FAILED, {
          error: errMsg,
        });
        actor!.send({ type: 'PARSE_ERROR' });
      }
    },

    startFetchingData: async (selfClient: SelfClient) => {
      _checkActorInitialized(actor);
      selfClient.trackEvent(ProofEvents.FETCH_DATA_STARTED);
      const startTime = Date.now();
      const context = createProofContext(selfClient, 'startFetchingData');
      // passport and id card
      selfClient.logProofEvent('info', 'Fetching DSC data started', context);
      try {
        const { passportData, env } = get();
        if (!passportData) {
          throw new Error('PassportData is not available');
        }
        const document: DocumentCategory = passportData.documentCategory;
        console.log('document', document);
        switch (passportData.documentCategory) {
          case 'passport':
          case 'id_card':
            if (!passportData?.dsc_parsed) {
              selfClient.logProofEvent('error', 'Missing parsed DSC', context, {
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
            selfClient.logProofEvent('info', 'Protocol store fetch', context, {
              step: 'protocol_store_fetch',
              document,
            });
            await fetchAllTreesAndCircuits(selfClient, document, env!, passportData.dsc_parsed!.authorityKeyIdentifier);
            break;
          case 'aadhaar':
            selfClient.logProofEvent('info', 'Protocol store fetch', context, {
              step: 'protocol_store_fetch',
              document,
            });
            await selfClient.getProtocolState().aadhaar.fetch_all(env!);
            break;
        }
        selfClient.logProofEvent('info', 'Data fetch succeeded', context, {
          duration_ms: Date.now() - startTime,
        });
        selfClient.trackEvent(ProofEvents.FETCH_DATA_SUCCESS);
        actor!.send({ type: 'FETCH_SUCCESS' });
      } catch (error) {
        selfClient.logProofEvent('error', 'Data fetch failed', context, {
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
      const context = createProofContext(selfClient, 'validatingDocument');
      selfClient.logProofEvent('info', 'Validating document started', context);
      try {
        const { passportData, secret, circuitType } = get();
        if (!passportData) {
          throw new Error('PassportData is not available');
        }
        const isSupported = await checkDocumentSupported(passportData, {
          getDeployedCircuits: (documentCategory: DocumentCategory) =>
            selfClient.getProtocolState()[documentCategory].deployed_circuits!,
        });
        selfClient.logProofEvent('info', 'Document support check', context, {
          supported: isSupported.status === 'passport_supported',
          duration_ms: Date.now() - startTime,
        });
        if (isSupported.status !== 'passport_supported') {
          selfClient.logProofEvent('error', 'Passport not supported', context, {
            failure: 'PROOF_FAILED_VALIDATION',
            details: isSupported.details,
            duration_ms: Date.now() - startTime,
          });
          console.error('Passport not supported:', isSupported.status, isSupported.details);
          selfClient.trackEvent(PassportEvents.COMING_SOON, {
            status: isSupported.status,
            details: isSupported.details,
          });

          await clearPassportData(selfClient);

          actor!.send({ type: 'PASSPORT_NOT_SUPPORTED' });
          return;
        }

        /// disclosure
        if (circuitType === 'disclose') {
          const isRegisteredWithLocalCSCA = await isUserRegistered(
            passportData,
            secret as string,
            (documentCategory: DocumentCategory) => getCommitmentTree(selfClient, documentCategory),
          );
          selfClient.logProofEvent('info', 'Local CSCA registration check', context, {
            registered: isRegisteredWithLocalCSCA,
          });
          if (isRegisteredWithLocalCSCA) {
            selfClient.logProofEvent('info', 'Validation succeeded', context, {
              duration_ms: Date.now() - startTime,
            });
            selfClient.trackEvent(ProofEvents.VALIDATION_SUCCESS);
            actor!.send({ type: 'VALIDATION_SUCCESS' });
            return;
          } else {
            selfClient.logProofEvent('error', 'Passport data not found', context, {
              failure: 'PROOF_FAILED_VALIDATION',
              duration_ms: Date.now() - startTime,
            });
            actor!.send({ type: 'PASSPORT_DATA_NOT_FOUND' });
            return;
          }
        }

        /// registration
        else {
          const { isRegistered, csca } = await isUserRegisteredWithAlternativeCSCA(passportData, secret as string, {
            getCommitmentTree: (docCategory: DocumentCategory) => getCommitmentTree(selfClient, docCategory),
            getAltCSCA: (docType: DocumentCategory) => {
              if (docType === 'aadhaar') {
                const publicKeys = selfClient.getProtocolState().aadhaar.public_keys;
                // Convert string[] to Record<string, string> format expected by AlternativeCSCA
                return publicKeys ? Object.fromEntries(publicKeys.map(key => [key, key])) : {};
              }
              return selfClient.getProtocolState()[docType].alternative_csca;
            },
          });
          selfClient.logProofEvent('info', 'Alternative CSCA registration check', context, {
            registered: isRegistered,
          });
          if (isRegistered) {
            await reStorePassportDataWithRightCSCA(selfClient, passportData, csca as string);

            (async () => {
              try {
                await markCurrentDocumentAsRegistered(selfClient);
              } catch (error) {
                console.error('Error marking document as registered:', error);
              }
            })();
            set({ circuitType: 'register' }); // Update circuit type to 'register' to reflect full registration completion

            selfClient.trackEvent(ProofEvents.ALREADY_REGISTERED);
            selfClient.logProofEvent('info', 'Document already registered', context, {
              duration_ms: Date.now() - startTime,
            });
            actor!.send({ type: 'ALREADY_REGISTERED' });
            return;
          }
          const isNullifierOnchain = await isDocumentNullified(passportData);
          selfClient.logProofEvent('info', 'Nullifier check', context, {
            nullified: isNullifierOnchain,
          });
          if (isNullifierOnchain) {
            selfClient.logProofEvent('error', 'Passport nullified', context, {
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
          if (document === 'passport' || document === 'id_card') {
            const isDscRegistered = await checkIfPassportDscIsInTree(
              passportData,
              selfClient.getProtocolState()[document].dsc_tree,
            );
            selfClient.logProofEvent('info', 'DSC tree check', context, {
              dsc_registered: isDscRegistered,
            });
            if (isDscRegistered) {
              selfClient.trackEvent(ProofEvents.DSC_IN_TREE);
              set({ circuitType: 'register' });
            }
          }
          selfClient.logProofEvent('info', 'Validation succeeded', context, {
            duration_ms: Date.now() - startTime,
          });
          selfClient.trackEvent(ProofEvents.VALIDATION_SUCCESS);
          actor!.send({ type: 'VALIDATION_SUCCESS' });
        }
      } catch (error) {
        selfClient.logProofEvent('error', 'Validation failed', context, {
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

    _generatePayload: async (selfClient: SelfClient) => {
      const startTime = Date.now();
      const { circuitType, passportData, secret, uuid, sharedKey, env } = get();
      const context = createProofContext(selfClient, '_generatePayload', {
        sessionId: uuid || get().uuid || 'unknown-session',
        circuitType: circuitType || null,
      });
      selfClient.logProofEvent('info', 'Payload generation started', context);

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
        const { inputs, circuitName, endpointType, endpoint, circuitTypeWithDocumentExtension } =
          await _generateCircuitInputs(
            selfClient,
            circuitType as 'disclose' | 'register' | 'dsc',
            secret,
            passportData,
            env,
            selfClient.getSelfAppState().selfApp,
          );

        selfClient.logProofEvent('info', 'Inputs generated', context, {
          circuit_name: circuitName,
          endpoint_type: endpointType,
        });

        // Build payload
        const selfApp = selfClient.getSelfAppState().selfApp;
        const userDefinedData = getSolidityPackedUserContextData(
          selfApp?.chainID ?? 0,
          selfApp?.userId ?? '',
          selfApp?.userDefinedData ?? '',
        ).slice(2);

        const payload = getPayload(
          inputs,
          circuitTypeWithDocumentExtension as 'register_id' | 'dsc_id' | 'register' | 'dsc',
          circuitName as string,
          endpointType as EndpointType,
          endpoint as string,
          selfApp?.version,
          userDefinedData,
          selfApp?.selfDefinedData ?? '',
        );

        const payloadSize = JSON.stringify(payload).length;

        // Encrypt payload
        const encryptedPayload = _encryptPayload(payload, sharedKey);

        selfClient.logProofEvent('info', 'Payload encrypted', context, {
          payload_size: payloadSize,
        });

        selfClient.trackEvent(ProofEvents.PAYLOAD_GEN_COMPLETED);
        selfClient.trackEvent(ProofEvents.PAYLOAD_ENCRYPTED);

        set({ endpointType: endpointType as EndpointType });

        selfClient.logProofEvent('info', 'Payload generation completed', context, {
          duration_ms: Date.now() - startTime,
        });

        // Build and return submit request
        return _buildSubmitRequest(uuid!, encryptedPayload);
      } catch (error) {
        selfClient.logProofEvent('error', 'Payload generation failed', context, {
          failure: 'PROOF_FAILED_PAYLOAD_GEN',
          error: error instanceof Error ? error.message : String(error),
          duration_ms: Date.now() - startTime,
        });
        throw error;
      }
    },

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
