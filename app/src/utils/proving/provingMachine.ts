// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import forge from 'node-forge';
import type { Socket } from 'socket.io-client';
import socketIo from 'socket.io-client';
import { v4 } from 'uuid';
import type { AnyActorRef, StateFrom } from 'xstate';
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
import {
  clearPassportData,
  generateTEEInputsDisclose,
  hasAnyValidRegisteredDocument,
  loadSelectedDocument,
  markCurrentDocumentAsRegistered,
  reStorePassportDataWithRightCSCA,
  SdkEvents,
  SelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  PassportEvents,
  ProofEvents,
} from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  useProtocolStore,
  useSelfAppStore,
} from '@selfxyz/mobile-sdk-alpha/stores';

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
    newActor.subscribe((state: StateFrom<typeof provingMachine>) => {
      console.log(`State transition: ${state.value}`);
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
      try {
        const result = JSON.parse(event.data);
        if (result.result?.attestation) {
          selfClient?.trackEvent(ProofEvents.ATTESTATION_RECEIVED);
          const attestationData = result.result.attestation;
          set({ attestation: attestationData });

          const serverPubkey = getPublicKey(attestationData);
          const verified = await verifyAttestation(attestationData);

          if (!verified) {
            console.error('Attestation verification failed');
            actor!.send({ type: 'CONNECT_ERROR' });
            return;
          }

          selfClient?.trackEvent(ProofEvents.ATTESTATION_VERIFIED);

          const serverKey = ec.keyFromPublic(serverPubkey as string, 'hex');
          const derivedKey = clientKey.derive(serverKey.getPublic());

          set({
            serverPublicKey: serverPubkey,
            sharedKey: Buffer.from(derivedKey.toArray('be', 32)),
          });
          selfClient?.trackEvent(ProofEvents.SHARED_KEY_DERIVED);

          actor!.send({ type: 'CONNECT_SUCCESS' });
        } else if (
          result.id === 2 &&
          typeof result.result === 'string' &&
          !result.error
        ) {
          selfClient?.trackEvent(ProofEvents.WS_HELLO_ACK);
          // Received status from TEE
          const statusUuid = result.result;
          if (get().uuid !== statusUuid) {
            console.warn(
              `Received status UUID (${statusUuid}) does not match stored UUID (${
                get().uuid
              }). Using received UUID.`,
            );
          }
          const endpointType = get().endpointType;
          if (!endpointType) {
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
          console.warn('Received unknown message format from TEE:', result);
        }
      } catch (error) {
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
      } catch (error) {
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

      socket.on('connect', () => {
        socket?.emit('subscribe', receivedUuid);
        selfClient.trackEvent(ProofEvents.SOCKETIO_SUBSCRIBED);
      });

      socket.on('connect_error', error => {
        console.error('SocketIO connection error:', error);
        selfClient.trackEvent(ProofEvents.SOCKETIO_CONNECT_ERROR, {
          message: error instanceof Error ? error.message : String(error),
        });
        selfClient.trackEvent(ProofEvents.PROOF_FAILED, {
          circuitType: get().circuitType,
          error: get().error_code ?? 'unknown',
        });
        actor!.send({ type: 'PROVE_ERROR' });
        set({ socketConnection: null });
      });

      socket.on('disconnect', (_reason: string) => {
        const currentActor = actor;

        if (get().currentState === 'ready_to_prove' && currentActor) {
          console.error(
            'SocketIO disconnected unexpectedly during proof listening.',
          );
          selfClient.trackEvent(ProofEvents.SOCKETIO_DISCONNECT_UNEXPECTED);
          selfClient.trackEvent(ProofEvents.PROOF_FAILED, {
            circuitType: get().circuitType,
            error: get().error_code ?? 'unknown',
          });
          currentActor.send({ type: 'PROVE_ERROR' });
        }
        set({ socketConnection: null });
      });

      socket.on('status', (message: unknown) => {
        const data =
          typeof message === 'string' ? JSON.parse(message) : message;
        selfClient.trackEvent(ProofEvents.SOCKETIO_STATUS_RECEIVED, {
          status: data.status,
        });
        if (data.status === 3 || data.status === 5) {
          console.error(
            'Proof generation/verification failed (status 3 or 5).',
          );
          console.error(data);
          set({ error_code: data.error_code, reason: data.reason });
          selfClient.trackEvent(ProofEvents.SOCKETIO_PROOF_FAILURE, {
            error_code: data.error_code,
            reason: data.reason,
          });
          selfClient.trackEvent(ProofEvents.PROOF_FAILED, {
            circuitType: get().circuitType,
            error: data.error_code ?? 'unknown',
          });
          actor!.send({ type: 'PROVE_FAILURE' });
          socket?.disconnect();
          set({ socketConnection: null });
        } else if (data.status === 4) {
          socket?.disconnect();
          set({ socketConnection: null });
          if (get().circuitType === 'register') {
            selfClient.trackEvent(ProofEvents.REGISTER_COMPLETED);
          }
          selfClient.trackEvent(ProofEvents.SOCKETIO_PROOF_SUCCESS);
          actor!.send({ type: 'PROVE_SUCCESS' });
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
    },

    _handleWsError: (error: Event, selfClient: SelfClient) => {
      console.error('TEE WebSocket error event:', error);
      if (!actor) {
        return;
      }
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
      try {
        const { passportData, env } = get();
        if (!passportData) {
          throw new Error('PassportData is not available');
        }
        if (!passportData?.dsc_parsed) {
          console.error('Missing parsed DSC in passport data');
          selfClient.trackEvent(ProofEvents.FETCH_DATA_FAILED, {
            message: 'Missing parsed DSC in passport data',
          });
          actor!.send({ type: 'FETCH_ERROR' });
          return;
        }
        const document: DocumentCategory = passportData.documentCategory;
        await useProtocolStore
          .getState()
          [
            document
          ].fetch_all(env!, (passportData as PassportData).dsc_parsed!.authorityKeyIdentifier);
        selfClient.trackEvent(ProofEvents.FETCH_DATA_SUCCESS);
        actor!.send({ type: 'FETCH_SUCCESS' });
      } catch (error) {
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
      try {
        const { passportData, secret, circuitType } = get();
        if (!passportData) {
          throw new Error('PassportData is not available');
        }
        const isSupported = await checkDocumentSupported(passportData, {
          getDeployedCircuits: (documentCategory: DocumentCategory) =>
            useProtocolStore.getState()[documentCategory].deployed_circuits!,
        });
        if (isSupported.status !== 'passport_supported') {
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
          // check if the user is registered using the csca from the passport data.
          const isRegisteredWithLocalCSCA = await isUserRegistered(
            passportData,
            secret as string,
            getCommitmentTree,
          );
          if (isRegisteredWithLocalCSCA) {
            selfClient.trackEvent(ProofEvents.VALIDATION_SUCCESS);
            actor!.send({ type: 'VALIDATION_SUCCESS' });
            return;
          } else {
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
          if (isRegistered) {
            await reStorePassportDataWithRightCSCA(
              selfClient,
              passportData,
              csca as string,
            );

            // Mark document as registered since its already onChain
            (async () => {
              try {
                await markCurrentDocumentAsRegistered(selfClient);
              } catch (error) {
                //it will be checked and marked as registered during next app launch
                console.error('Error marking document as registered:', error);
              }
            })();

            selfClient.trackEvent(ProofEvents.ALREADY_REGISTERED);
            actor!.send({ type: 'ALREADY_REGISTERED' });
            return;
          }
          const isNullifierOnchain = await isDocumentNullified(passportData);
          if (isNullifierOnchain) {
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
          if (isDscRegistered) {
            selfClient.trackEvent(ProofEvents.DSC_IN_TREE);
            set({ circuitType: 'register' });
          }
          selfClient.trackEvent(ProofEvents.VALIDATION_SUCCESS);
          actor!.send({ type: 'VALIDATION_SUCCESS' });
        }
      } catch (error) {
        console.error('Error validating passport:', error);
        selfClient.trackEvent(ProofEvents.VALIDATION_FAILED, {
          message: error instanceof Error ? error.message : String(error),
        });
        actor!.send({ type: 'VALIDATION_ERROR' });
      }
    },

    initTeeConnection: async (selfClient: SelfClient): Promise<boolean> => {
      const { passportData } = get();
      if (!passportData) {
        throw new Error('PassportData is not available');
      }
      const document: DocumentCategory = passportData.documentCategory;
      const circuitsMapping =
        useProtocolStore.getState()[document].circuits_dns_mapping;

      let circuitName, wsRpcUrl;
      if (get().circuitType === 'disclose') {
        circuitName = 'disclose';
        if (passportData.documentCategory === 'passport') {
          wsRpcUrl = circuitsMapping?.DISCLOSE?.[circuitName];
        } else {
          wsRpcUrl = circuitsMapping?.DISCLOSE_ID?.[circuitName];
        }
      } else {
        circuitName = getCircuitNameFromPassportData(
          passportData,
          get().circuitType as 'register' | 'dsc',
        );
        if (get().circuitType === 'register') {
          if (passportData.documentCategory === 'passport') {
            wsRpcUrl = circuitsMapping?.REGISTER?.[circuitName];
          } else {
            wsRpcUrl = circuitsMapping?.REGISTER_ID?.[circuitName];
          }
        } else {
          if (passportData.documentCategory === 'passport') {
            wsRpcUrl = circuitsMapping?.DSC?.[circuitName];
          } else {
            wsRpcUrl = circuitsMapping?.DSC_ID?.[circuitName];
          }
        }
      }
      if (!circuitName) {
        actor?.send({ type: 'CONNECT_ERROR' });
        throw new Error('Could not determine circuit name');
      }

      if (!wsRpcUrl) {
        actor?.send({ type: 'CONNECT_ERROR' });
        throw new Error('No WebSocket URL available for TEE connection');
      }

      get()._closeConnections(selfClient);
      selfClient.trackEvent(ProofEvents.TEE_CONN_STARTED);

      return new Promise(resolve => {
        const ws = new WebSocket(wsRpcUrl);

        const handleConnectSuccess = () => {
          selfClient.trackEvent(ProofEvents.TEE_CONN_SUCCESS);
          resolve(true);
        };
        const handleConnectError = (msg: string = 'connect_error') => {
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
      const { wsConnection, sharedKey, passportData, secret, uuid, fcmToken } =
        get();

      if (get().currentState !== 'ready_to_prove') {
        console.error('Cannot start proving: Not in ready_to_prove state.');
        return;
      }
      if (!wsConnection || !sharedKey || !passportData || !secret || !uuid) {
        console.error(
          'Cannot start proving: Missing wsConnection, sharedKey, passportData, secret, or uuid.',
        );
        selfClient.trackEvent(ProofEvents.PROOF_FAILED, {
          circuitType: get().circuitType,
          error: get().error_code ?? 'unknown',
        });
        actor!.send({ type: 'PROVE_ERROR' });
        return;
      }

      try {
        // Register device token before payload generation
        if (fcmToken) {
          try {
            const {
              registerDeviceToken,
            } = require('@/utils/notifications/notificationService');
            const isMockPassport = passportData?.mock;
            selfClient.trackEvent(ProofEvents.DEVICE_TOKEN_REG_STARTED);
            await registerDeviceToken(uuid, fcmToken, isMockPassport);
            selfClient.trackEvent(ProofEvents.DEVICE_TOKEN_REG_SUCCESS);
          } catch (error) {
            console.error('Error registering device token:', error);
            selfClient.trackEvent(ProofEvents.DEVICE_TOKEN_REG_FAILED, {
              message: error instanceof Error ? error.message : String(error),
            });
            // Continue with the proving process even if token registration fails
          }
        }

        selfClient.trackEvent(ProofEvents.PAYLOAD_GEN_STARTED);
        const submitBody = await get()._generatePayload(selfClient);
        wsConnection.send(JSON.stringify(submitBody));
        selfClient.trackEvent(ProofEvents.PAYLOAD_SENT);
        selfClient.trackEvent(ProofEvents.PROVING_PROCESS_STARTED);
        actor!.send({ type: 'START_PROVING' });
      } catch (error) {
        console.error('Error during startProving preparation/send:', error);
        selfClient.trackEvent(ProofEvents.PROOF_FAILED, {
          circuitType: get().circuitType,
          error: get().error_code ?? 'unknown',
        });
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

    _closeConnections: (selfClient: SelfClient) => {
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
      const { circuitType, passportData, secret, uuid, sharedKey, env } = get();
      if (!passportData) {
        throw new Error('PassportData is not available');
      }
      const document: DocumentCategory = passportData.documentCategory;
      const selfApp = useSelfAppStore.getState().selfApp;
      // TODO: according to the circuitType we could check that the params are valid.
      let inputs,
        circuitName,
        endpointType,
        endpoint,
        circuitTypeWithDocumentExtension;
      const protocolStore = useProtocolStore.getState();

      if (!env) {
        throw new Error('Environment not set');
      }

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
          ({ inputs, circuitName, endpointType, endpoint } =
            generateTEEInputsDSC(
              passportData,
              protocolStore[document].csca_tree as string[][],
              env,
            ));
          circuitTypeWithDocumentExtension = `${circuitType}${document === 'passport' ? '' : '_id'}`;
          break;
        case 'disclose':
          ({ inputs, circuitName, endpointType, endpoint } =
            generateTEEInputsDisclose(
              secret as string,
              passportData,
              selfApp as SelfApp,
            ));
          circuitTypeWithDocumentExtension = `disclose`;
          break;
        default:
          console.error('Invalid circuit type:' + circuitType);
          throw new Error('Invalid circuit type:' + circuitType);
      }
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
      const forgeKey = forge.util.createBuffer(
        sharedKey?.toString('binary') as string,
      );
      const encryptedPayload = encryptAES256GCM(
        JSON.stringify(payload),
        forgeKey,
      );

      selfClient.trackEvent(ProofEvents.PAYLOAD_GEN_COMPLETED);
      selfClient.trackEvent(ProofEvents.PAYLOAD_ENCRYPTED);

      // Persist endpointType for later Socket.IO connection
      set({ endpointType: endpointType as EndpointType });
      return {
        jsonrpc: '2.0',
        method: 'openpassport_submit_request',
        id: 2,
        params: {
          uuid: uuid,
          ...encryptedPayload,
        },
      };
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

function _checkActorInitialized(actor: AnyActorRef | null) {
  if (!actor) {
    throw new Error('State machine not initialized. Call init() first.');
  }
}
