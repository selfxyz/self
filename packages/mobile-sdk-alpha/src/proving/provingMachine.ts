// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AnyActorRef } from 'xstate';
import { createActor } from 'xstate';
import { create } from 'zustand';

import type { PassportData } from '@selfxyz/common/types';

import { PassportEvents, ProofEvents } from '../constants/analytics';
import { hasAnyValidRegisteredDocument, loadSelectedDocument } from '../documents/utils';
import { SdkEvents } from '../types/events';
import type { SelfClient } from '../types/public';
import type { ActorSubscriptionDeps } from './internal/actorSubscriptions';
import { setupActorSubscriptions } from './internal/actorSubscriptions';
import { PROVING_EVENTS, TIMING } from './internal/constants';
import {
  createDocumentDeps,
  createPayloadDeps,
  createSocketDeps,
  createWebSocketDeps,
} from './internal/dependencyFactory';
import { parseIDDocument, startFetchingData, validatingDocument } from './internal/documentProcessor';
import { checkActorInitialized } from './internal/helpers';
import { _generatePayload as generatePayload } from './internal/payloadGenerator';
import { _startSocketIOStatusListener as startSocketIOStatusListener } from './internal/socketIOListener';
import { provingMachine } from './internal/stateMachine';
import type { TeeConnectionDeps } from './internal/teeConnectionHandler';
import { initTeeConnection } from './internal/teeConnectionHandler';
import {
  _handleWebSocketMessage as handleWebSocketMessage,
  _handleWsClose as handleWsClose,
  _handleWsError as handleWsError,
  _handleWsOpen as handleWsOpen,
} from './internal/websocketHandlers';
import type { ProvingState } from './types';

export type { ProvingMachineCircuitType, ProvingState, ProvingStateType } from './types';

export const useProvingStore = create<ProvingState>((set, get) => {
  let actor: AnyActorRef | null = null;

  const getActorRef = () => actor;

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
      handleWebSocketMessage(event, selfClient, createWebSocketDeps(selfClient, get, set, getActorRef)),

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

    _startSocketIOStatusListener: (receivedUuid: string, endpointType, selfClient: SelfClient) =>
      startSocketIOStatusListener(
        receivedUuid,
        endpointType,
        selfClient,
        createSocketDeps(selfClient, get, set, getActorRef),
      ),

    _handleWsOpen: (selfClient: SelfClient) =>
      handleWsOpen(selfClient, createWebSocketDeps(selfClient, get, set, getActorRef)),

    _handleWsError: (error: Event, selfClient: SelfClient) =>
      handleWsError(error, selfClient, createWebSocketDeps(selfClient, get, set, getActorRef)),

    _handleWsClose: (event: CloseEvent, selfClient: SelfClient) =>
      handleWsClose(event, selfClient, createWebSocketDeps(selfClient, get, set, getActorRef)),

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
      const actorDeps: ActorSubscriptionDeps = {
        getState: get,
        setState: set,
      };
      setupActorSubscriptions(actor, selfClient, actorDeps);
      actor.start();

      selfClient.trackEvent(ProofEvents.DOCUMENT_LOAD_STARTED);
      const selectedDocument = await loadSelectedDocument(selfClient);
      if (!selectedDocument) {
        console.error('No document found for proving');
        selfClient.trackEvent(PassportEvents.PASSPORT_DATA_NOT_FOUND, {
          stage: 'init',
        });
        console.error('No document found for proving in init');
        actor!.send({ type: PROVING_EVENTS.PASSPORT_DATA_NOT_FOUND });
        return;
      }

      const { data: passportData } = selectedDocument;
      const secret = await selfClient.getPrivateKey();
      if (!secret) {
        console.error('Could not load secret');
        selfClient.trackEvent(ProofEvents.LOAD_SECRET_FAILED);
        actor!.send({ type: PROVING_EVENTS.ERROR });
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
        actor.send({ type: PROVING_EVENTS.FETCH_DATA });
        selfClient.trackEvent(ProofEvents.FETCH_DATA_STARTED);
      } else {
        actor.send({ type: PROVING_EVENTS.PARSE_ID_DOCUMENT });
        selfClient.trackEvent(ProofEvents.PARSE_ID_DOCUMENT_STARTED);
      }
    },

    parseIDDocument: async (selfClient: SelfClient) =>
      parseIDDocument(selfClient, createDocumentDeps(selfClient, get, set, getActorRef)),

    startFetchingData: async (selfClient: SelfClient) =>
      startFetchingData(selfClient, createDocumentDeps(selfClient, get, set, getActorRef)),

    validatingDocument: async (selfClient: SelfClient) =>
      validatingDocument(selfClient, createDocumentDeps(selfClient, get, set, getActorRef)),

    initTeeConnection: async (selfClient: SelfClient): Promise<boolean> => {
      const teeDeps: TeeConnectionDeps = {
        getState: get,
        setState: set,
        getActor: getActorRef,
        handleWebSocketMessage: (event, client) => get()._handleWebSocketMessage(event, client),
        handleWsOpen: client => get()._handleWsOpen(client),
        handleWsError: (error, client) => get()._handleWsError(error, client),
        handleWsClose: (event, client) => get()._handleWsClose(event, client),
        closeConnections: client => get()._closeConnections(client),
      };
      return initTeeConnection(selfClient, teeDeps);
    },

    startProving: async (selfClient: SelfClient) => {
      checkActorInitialized(actor);
      const { wsConnection, sharedKey, passportData, secret, uuid } = get();

      if (get().currentState !== 'ready_to_prove') {
        console.error('Cannot start proving: Not in ready_to_prove state.');
        return;
      }
      if (!wsConnection || !sharedKey || !passportData || !secret || !uuid) {
        console.error('Cannot start proving: Missing wsConnection, sharedKey, passportData, secret, or uuid.');
        actor!.send({ type: PROVING_EVENTS.PROVE_ERROR });
        return;
      }

      try {
        // Emit event for FCM token registration
        selfClient.emit(SdkEvents.PROVING_BEGIN_GENERATION, {
          uuid,
          isMock: passportData?.mock ?? false,
          context: {
            sessionId: uuid,
            userId: selfClient.getSelfAppState().selfApp?.userId,
            circuitType: get().circuitType || null,
            currentState: get().currentState || 'unknown-state',
            stage: 'startProving',
            platform: 'ios',
          },
        });

        selfClient.trackEvent(ProofEvents.PAYLOAD_GEN_STARTED);
        const submitBody = await get()._generatePayload(selfClient);
        wsConnection.send(JSON.stringify(submitBody));
        selfClient.trackEvent(ProofEvents.PAYLOAD_SENT);
        selfClient.trackEvent(ProofEvents.PROVING_PROCESS_STARTED);
        actor!.send({ type: PROVING_EVENTS.START_PROVING });
      } catch (error) {
        console.error('Error during startProving preparation/send:', error);
        actor!.send({ type: PROVING_EVENTS.PROVE_ERROR });
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
        }, TIMING.POST_PROVING_DELAY_MS);
      } else if (circuitType === 'register') {
        selfClient.trackEvent(ProofEvents.POST_PROVING_COMPLETED);
        actor!.send({ type: PROVING_EVENTS.COMPLETED });
      } else if (circuitType === 'disclose') {
        selfClient.trackEvent(ProofEvents.POST_PROVING_COMPLETED);
        actor!.send({ type: PROVING_EVENTS.COMPLETED });
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

    _generatePayload: async (selfClient: SelfClient) =>
      generatePayload(selfClient, createPayloadDeps(selfClient, get, set)),

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
