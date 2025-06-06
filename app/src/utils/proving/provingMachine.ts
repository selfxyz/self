import { WS_RPC_URL_VC_AND_DISCLOSE } from '@selfxyz/common';
import { EndpointType, SelfApp } from '@selfxyz/common';
import { getCircuitNameFromPassportData } from '@selfxyz/common';
import { PassportData } from '@selfxyz/common';
import forge from 'node-forge';
import io, { Socket } from 'socket.io-client';
import { v4 } from 'uuid';
import { AnyActorRef, createActor, createMachine } from 'xstate';
import { create } from 'zustand';

import { navigationRef } from '../../navigation';
import {
  clearPassportData,
  loadPassportDataAndSecret,
  reStorePassportDataWithRightCSCA,
} from '../../providers/passportDataProvider';
import { useProtocolStore } from '../../stores/protocolStore';
import { useSelfAppStore } from '../../stores/selfAppStore';
import { getPublicKey, verifyAttestation } from './attest';
import {
  generateTEEInputsDisclose,
  generateTEEInputsDSC,
  generateTEEInputsRegister,
} from './provingInputs';
import {
  clientKey,
  clientPublicKeyHex,
  ec,
  encryptAES256GCM,
  getPayload,
  getWSDbRelayerUrl,
} from './provingUtils';
import {
  checkIfPassportDscIsInTree,
  checkPassportSupported,
  isPassportNullified,
  isUserRegistered,
  isUserRegisteredWithAlternativeCSCA,
} from './validateDocument';

const provingMachine = createMachine({
  id: 'proving',
  initial: 'idle',
  states: {
    idle: {
      on: {
        FETCH_DATA: 'fetching_data',
        ERROR: 'error',
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

interface ProvingState {
  currentState: ProvingStateType;
  attestation: any;
  serverPublicKey: string | null;
  sharedKey: Buffer | null;
  wsConnection: WebSocket | null;
  socketConnection: Socket | null;
  uuid: string | null;
  userConfirmed: boolean;
  passportData: any | null;
  secret: string | null;
  circuitType: provingMachineCircuitType | null;
  error_code: string | null;
  reason: string | null;
  endpointType: EndpointType | null;
  fcmToken: string | null;
  setFcmToken: (token: string) => void;
  init: (
    circuitType: 'dsc' | 'disclose' | 'register',
    userConfirmed?: boolean,
  ) => Promise<void>;
  startFetchingData: () => Promise<void>;
  validatingDocument: () => Promise<void>;
  initTeeConnection: () => Promise<boolean>;
  startProving: () => Promise<void>;
  postProving: () => void;
  setUserConfirmed: () => void;
  _closeConnections: () => void;
  _generatePayload: () => Promise<any>;
  _handleWebSocketMessage: (event: MessageEvent) => Promise<void>;
  _startSocketIOStatusListener: (
    receivedUuid: string,
    endpointType: EndpointType,
  ) => void;
  _handleWsOpen: () => void;
  _handleWsError: (error: Event) => void;
  _handleWsClose: (event: CloseEvent) => void;
}

export const useProvingStore = create<ProvingState>((set, get) => {
  let actor: AnyActorRef | null = null;

  function setupActorSubscriptions(newActor: AnyActorRef) {
    newActor.subscribe((state: any) => {
      console.log(`State transition: ${state.value}`);
      set({ currentState: state.value as ProvingStateType });

      if (state.value === 'fetching_data') {
        get().startFetchingData();
      }
      if (state.value === 'validating_document') {
        get().validatingDocument();
      }

      if (state.value === 'init_tee_connexion') {
        get().initTeeConnection();
      }

      if (state.value === 'ready_to_prove' && get().userConfirmed) {
        get().startProving();
      }

      if (state.value === 'post_proving') {
        get().postProving();
      }
      if (
        get().circuitType !== 'disclose' &&
        (state.value === 'error' || state.value === 'failure')
      ) {
        setTimeout(() => {
          if (navigationRef.isReady()) {
            navigationRef.navigate('Launch');
          }
        }, 3000);
      }
      if (state.value === 'completed') {
        if (get().circuitType !== 'disclose' && navigationRef.isReady()) {
          setTimeout(() => {
            navigationRef.navigate('AccountVerifiedSuccess');
          }, 3000);
        }
        if (get().circuitType === 'disclose') {
          useSelfAppStore.getState().handleProofResult(true);
        }
      }
      if (state.value === 'passport_not_supported') {
        if (navigationRef.isReady()) {
          navigationRef.navigate('UnsupportedPassport');
        }
      }
      if (state.value === 'account_recovery_choice') {
        if (navigationRef.isReady()) {
          navigationRef.navigate('AccountRecoveryChoice');
        }
      }
      if (state.value === 'passport_data_not_found') {
        if (navigationRef.isReady()) {
          navigationRef.navigate('PassportDataNotFound');
        }
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
    socketConnection: null,
    uuid: null,
    userConfirmed: false,
    passportData: null,
    secret: null,
    circuitType: null,
    selfApp: null,
    error_code: null,
    reason: null,
    endpointType: null,
    fcmToken: null,
    setFcmToken: (token: string) => {
      set({ fcmToken: token });
    },
    _handleWebSocketMessage: async (event: MessageEvent) => {
      if (!actor) {
        console.error('Cannot process message: State machine not initialized.');
        return;
      }

      try {
        const result = JSON.parse(event.data);
        if (result.result?.attestation) {
          const attestationData = result.result.attestation;
          set({ attestation: attestationData });

          const serverPubkey = getPublicKey(attestationData);
          const verified = await verifyAttestation(attestationData);

          if (!verified) {
            console.error('Attestation verification failed');
            actor!.send({ type: 'CONNECT_ERROR' });
            return;
          }

          const serverKey = ec.keyFromPublic(serverPubkey as string, 'hex');
          const derivedKey = clientKey.derive(serverKey.getPublic());

          set({
            serverPublicKey: serverPubkey,
            sharedKey: Buffer.from(derivedKey.toArray('be', 32)),
          });

          actor!.send({ type: 'CONNECT_SUCCESS' });
        } else if (
          result.id === 2 &&
          typeof result.result === 'string' &&
          !result.error
        ) {
          console.log('Received message with status:', result.id);
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
            actor!.send({ type: 'PROVE_ERROR' });
            return;
          }
          get()._startSocketIOStatusListener(statusUuid, endpointType);
        } else if (result.error) {
          console.error('Received error from TEE:', result.error);
          actor!.send({ type: 'PROVE_ERROR' });
        } else {
          console.warn('Received unknown message format from TEE:', result);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        if (get().currentState === 'init_tee_connexion') {
          actor!.send({ type: 'CONNECT_ERROR' });
        } else {
          actor!.send({ type: 'PROVE_ERROR' });
        }
      }
    },

    _startSocketIOStatusListener: (
      receivedUuid: string,
      endpointType: EndpointType,
    ) => {
      if (!actor) {
        console.error('Cannot start Socket.IO listener: Actor not available.');
        return;
      }

      const url = getWSDbRelayerUrl(endpointType);
      let socket: Socket | null = io(url, {
        path: '/',
        transports: ['websocket'],
      });
      set({ socketConnection: socket });

      socket.on('connect', () => {
        socket?.emit('subscribe', receivedUuid);
      });

      socket.on('status', (message: any) => {
        const data =
          typeof message === 'string' ? JSON.parse(message) : message;
        console.log('Received status update with status:', data.status);
        if (data.status === 3 || data.status === 5) {
          console.log('Proof generation/verification failed (status 3 or 5).');
          set({ error_code: data.error_code, reason: data.reason });
          actor!.send({ type: 'PROVE_FAILURE' });
          socket?.disconnect();
          set({ socketConnection: null });
        } else if (data.status === 4) {
          socket?.disconnect();
          set({ socketConnection: null });
          actor!.send({ type: 'PROVE_SUCCESS' });
        }
      });

      socket.on('disconnect', (reason: string) => {
        console.log(`SocketIO disconnected. Reason: ${reason}`);
        const currentActor = actor;

        if (get().currentState === 'ready_to_prove' && currentActor) {
          console.error(
            'SocketIO disconnected unexpectedly during proof listening.',
          );
          currentActor.send({ type: 'PROVE_ERROR' });
        }
        set({ socketConnection: null });
      });

      socket.on('connect_error', error => {
        console.error('SocketIO connection error:', error);
        actor!.send({ type: 'PROVE_ERROR' });
        set({ socketConnection: null });
      });
    },

    _handleWsOpen: () => {
      if (!actor) {
        return;
      }
      const ws = get().wsConnection;
      if (!ws) {
        return;
      }
      const connectionUuid = v4();
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
      ws.send(JSON.stringify(helloBody));
    },

    _handleWsError: (error: Event) => {
      console.error('TEE WebSocket error event:', error);
      if (!actor) {
        return;
      }
      get()._handleWebSocketMessage(
        new MessageEvent('error', {
          data: JSON.stringify({ error: 'WebSocket connection error' }),
        }),
      );
    },

    _handleWsClose: (event: CloseEvent) => {
      console.log(
        `TEE WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`,
      );
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
        );
      }
      if (get().wsConnection) {
        set({ wsConnection: null });
      }
    },

    init: async (
      circuitType: 'dsc' | 'disclose' | 'register',
      userConfirmed: boolean = false,
    ) => {
      get()._closeConnections();

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
      });

      actor = createActor(provingMachine);
      setupActorSubscriptions(actor);
      actor.start();

      const passportDataAndSecretStr = await loadPassportDataAndSecret();
      if (!passportDataAndSecretStr) {
        actor!.send({ type: 'ERROR' });
        return;
      }

      const passportDataAndSecret = JSON.parse(passportDataAndSecretStr);
      const { passportData, secret } = passportDataAndSecret;

      set({ passportData, secret });
      set({ circuitType });
      actor.send({ type: 'FETCH_DATA' });
    },

    startFetchingData: async () => {
      _checkActorInitialized(actor);
      try {
        const { passportData } = get();
        const env =
          passportData.documentType && passportData.documentType !== 'passport'
            ? 'stg'
            : 'prod';
        await useProtocolStore
          .getState()
          .passport.fetch_all(
            env,
            (passportData as PassportData).dsc_parsed!.authorityKeyIdentifier,
          );
        actor!.send({ type: 'FETCH_SUCCESS' });
      } catch (error) {
        console.error('Error fetching data:', error);
        actor!.send({ type: 'FETCH_ERROR' });
      }
    },

    validatingDocument: async () => {
      _checkActorInitialized(actor);
      // TODO: for the disclosure, we could check that the selfApp is a valid one.
      try {
        const { passportData, secret, circuitType } = get();
        const isSupported = await checkPassportSupported(passportData);
        if (isSupported.status !== 'passport_supported') {
          console.error(
            'Passport not supported:',
            isSupported.status,
            isSupported.details,
          );
          await clearPassportData();
          actor!.send({ type: 'PASSPORT_NOT_SUPPORTED' });
          return;
        }

        /// disclosure
        if (circuitType === 'disclose') {
          // check if the user is registered using the csca from the passport data.
          const isRegisteredWithLocalCSCA = await isUserRegistered(
            passportData,
            secret as string,
          );
          if (isRegisteredWithLocalCSCA) {
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
            );
          if (isRegistered) {
            reStorePassportDataWithRightCSCA(passportData, csca as string);
            actor!.send({ type: 'ALREADY_REGISTERED' });
            return;
          }
          const isNullifierOnchain = await isPassportNullified(passportData);
          if (isNullifierOnchain) {
            console.log(
              'Passport is nullified, but not registered with this secret. Navigating to AccountRecoveryChoice',
            );
            actor!.send({ type: 'ACCOUNT_RECOVERY_CHOICE' });
            return;
          }
          const isDscRegistered = await checkIfPassportDscIsInTree(
            passportData,
            useProtocolStore.getState().passport.dsc_tree,
          );
          console.log('isDscRegistered: ', isDscRegistered);
          if (isDscRegistered) {
            set({ circuitType: 'register' });
          }
          actor!.send({ type: 'VALIDATION_SUCCESS' });
        }
      } catch (error) {
        console.error('Error validating passport:', error);
        actor!.send({ type: 'VALIDATION_ERROR' });
      }
    },

    initTeeConnection: async (): Promise<boolean> => {
      const circuitsMapping =
        useProtocolStore.getState().passport.circuits_dns_mapping;
      const passportData = get().passportData;

      let circuitName, wsRpcUrl;
      if (get().circuitType === 'disclose') {
        circuitName = 'disclose';
        wsRpcUrl = WS_RPC_URL_VC_AND_DISCLOSE;
      } else {
        circuitName = getCircuitNameFromPassportData(
          passportData,
          get().circuitType as 'register' | 'dsc',
        );
        if (get().circuitType === 'register') {
          wsRpcUrl = circuitsMapping?.REGISTER?.[circuitName];
        } else {
          wsRpcUrl = circuitsMapping?.DSC?.[circuitName];
        }
      }
      if (!circuitName) {
        actor?.send({ type: 'CONNECT_ERROR' });
        throw new Error('Could not determine circuit name');
      }
      if (!wsRpcUrl) {
        throw new Error('No WebSocket URL available for TEE connection');
      }

      get()._closeConnections();

      return new Promise(resolve => {
        const ws = new WebSocket(wsRpcUrl);
        set({ wsConnection: ws });

        const handleConnectSuccess = () => resolve(true);
        const handleConnectError = () => resolve(false);

        ws.addEventListener('message', get()._handleWebSocketMessage);
        ws.addEventListener('open', get()._handleWsOpen);
        ws.addEventListener('error', get()._handleWsError);
        ws.addEventListener('close', get()._handleWsClose);

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

    startProving: async () => {
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
        actor!.send({ type: 'PROVE_ERROR' });
        return;
      }

      try {
        // Register device token before payload generation
        if (fcmToken) {
          try {
            const {
              registerDeviceToken,
            } = require('../../utils/notifications/notificationService');
            console.log(
              'passportData.documentType: ',
              passportData?.documentType,
            );
            const isMockPassport =
              passportData?.documentType === 'mock_passport';
            await registerDeviceToken(uuid, fcmToken, isMockPassport);
          } catch (error) {
            console.error('Error registering device token:', error);
            // Continue with the proving process even if token registration fails
          }
        }

        const submitBody = await get()._generatePayload();
        wsConnection.send(JSON.stringify(submitBody));
        actor!.send({ type: 'START_PROVING' });
      } catch (error) {
        console.error('Error during startProving preparation/send:', error);
        actor!.send({ type: 'PROVE_ERROR' });
      }
    },

    setUserConfirmed: () => {
      set({ userConfirmed: true });
      if (get().currentState === 'ready_to_prove') {
        get().startProving();
      }
    },

    postProving: () => {
      _checkActorInitialized(actor);
      const { circuitType } = get();
      if (circuitType === 'dsc') {
        setTimeout(() => {
          get().init('register', true);
        }, 1500);
      } else if (circuitType === 'register') {
        actor!.send({ type: 'COMPLETED' });
      } else if (circuitType === 'disclose') {
        actor!.send({ type: 'COMPLETED' });
      }
    },

    _closeConnections: () => {
      const ws = get().wsConnection;
      if (ws) {
        try {
          ws.removeEventListener('message', get()._handleWebSocketMessage);
          ws.removeEventListener('open', get()._handleWsOpen);
          ws.removeEventListener('error', get()._handleWsError);
          ws.removeEventListener('close', get()._handleWsClose);
          ws.close();
        } catch (error) {
          console.error(
            'Error removing listeners or closing WebSocket:',
            error,
          );
        }
        set({ wsConnection: null });
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

    _generatePayload: async () => {
      const { circuitType, passportData, secret, uuid, sharedKey } = get();
      console.log('circuitType: ', circuitType);
      const selfApp = useSelfAppStore.getState().selfApp;
      // TODO: according to the circuitType we could check that the params are valid.
      let inputs, circuitName, endpointType, endpoint;
      const protocolStore = useProtocolStore.getState();
      switch (circuitType) {
        case 'register':
          ({ inputs, circuitName, endpointType, endpoint } =
            generateTEEInputsRegister(
              secret as string,
              passportData,
              protocolStore.passport.dsc_tree,
            ));
          break;
        case 'dsc':
          ({ inputs, circuitName, endpointType, endpoint } =
            generateTEEInputsDSC(
              passportData,
              protocolStore.passport.csca_tree as string[][],
            ));
          break;
        case 'disclose':
          ({ inputs, circuitName, endpointType, endpoint } =
            generateTEEInputsDisclose(
              secret as string,
              passportData,
              selfApp as SelfApp,
            ));
          break;
        default:
          console.error('Invalid circuit type:' + circuitType);
          throw new Error('Invalid circuit type:' + circuitType);
      }
      const payload = getPayload(
        inputs,
        circuitType as provingMachineCircuitType,
        circuitName as string,
        endpointType as EndpointType,
        endpoint as string,
      );
      const forgeKey = forge.util.createBuffer(
        sharedKey?.toString('binary') as string,
      );
      const encryptedPayload = encryptAES256GCM(
        JSON.stringify(payload),
        forgeKey,
      );

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
  };
});

function _checkActorInitialized(actor: AnyActorRef | null) {
  if (!actor) {
    throw new Error('State machine not initialized. Call init() first.');
  }
}
