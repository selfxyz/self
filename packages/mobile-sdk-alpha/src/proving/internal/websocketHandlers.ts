// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { v4 } from 'uuid';
import type { AnyActorRef } from 'xstate';

import type { EndpointType } from '@selfxyz/common/utils';
import { checkPCR0Mapping, validatePKIToken } from '@selfxyz/common/utils/attest';
import { clientKey, clientPublicKeyHex, ec } from '@selfxyz/common/utils/proving';

import { ProofEvents } from '../../constants/analytics';
import type { SelfClient } from '../../types/public';
import type { ProvingState } from '../types';
import type { ProofContext } from './logging';

type WebSocketHandlerState = Pick<
  ProvingState,
  | 'uuid'
  | 'endpointType'
  | 'circuitType'
  | 'error_code'
  | 'reason'
  | 'currentState'
  | 'wsConnection'
  | 'wsHandlers'
  | 'sharedKey'
  | 'serverPublicKey'
  | 'attestation'
>;

export type WebSocketHandlerDeps = {
  getState: () => WebSocketHandlerState;
  setState: (partial: Partial<WebSocketHandlerState>) => void;
  getActor: () => AnyActorRef | null;
  createProofContext: (stage: string, overrides?: Partial<ProofContext>) => ProofContext;
  startSocketIOStatusListener: (receivedUuid: string, endpointType: EndpointType, selfClient: SelfClient) => void;
};

export const _handleWebSocketMessage = async (
  event: MessageEvent,
  selfClient: SelfClient,
  deps: WebSocketHandlerDeps,
) => {
  const { getState, setState, getActor, createProofContext, startSocketIOStatusListener } = deps;
  const actor = getActor();
  if (!actor) {
    console.error('Cannot process message: State machine not initialized.');
    return;
  }

  const startTime = Date.now();
  const context = createProofContext('_handleWebSocketMessage');

  try {
    const result = JSON.parse(event.data);
    selfClient.logProofEvent('info', 'WebSocket message received', context);
    if (result.result?.attestation) {
      selfClient?.trackEvent(ProofEvents.ATTESTATION_RECEIVED);
      selfClient.logProofEvent('info', 'Attestation received', context);

      const attestationData = result.result.attestation;
      setState({ attestation: attestationData });
      const attestationToken = Buffer.from(attestationData).toString('utf-8');

      const { userPubkey, serverPubkey, imageHash, verified } = validatePKIToken(attestationToken, __DEV__);

      const pcr0Mapping = await checkPCR0Mapping(imageHash);

      if (!__DEV__ && !pcr0Mapping) {
        console.error('PCR0 mapping not found');
        actor.send({ type: 'CONNECT_ERROR' });
        return;
      }

      if (clientPublicKeyHex !== userPubkey.toString('hex')) {
        console.error('User public key does not match');
        actor.send({ type: 'CONNECT_ERROR' });
        return;
      }

      if (!verified) {
        selfClient.logProofEvent('error', 'Attestation verification failed', context, {
          failure: 'PROOF_FAILED_TEE_PROCESSING',
          duration_ms: Date.now() - startTime,
        });
        console.error('Attestation verification failed');
        actor.send({ type: 'CONNECT_ERROR' });
        return;
      }

      selfClient?.trackEvent(ProofEvents.ATTESTATION_VERIFIED);
      selfClient.logProofEvent('info', 'Attestation verified', context);

      const serverKey = ec.keyFromPublic(serverPubkey, 'hex');
      const derivedKey = clientKey.derive(serverKey.getPublic());

      setState({
        serverPublicKey: serverKey.getPublic(true, 'hex'),
        sharedKey: Buffer.from(derivedKey.toArray('be', 32)),
      });
      selfClient?.trackEvent(ProofEvents.SHARED_KEY_DERIVED);
      selfClient.logProofEvent('info', 'Shared key derived', context);

      actor.send({ type: 'CONNECT_SUCCESS' });
    } else if (result.id === 2 && typeof result.result === 'string' && !result.error) {
      selfClient?.trackEvent(ProofEvents.WS_HELLO_ACK);
      selfClient.logProofEvent('info', 'Hello ACK received', context);

      const statusUuid = result.result;
      if (getState().uuid !== statusUuid) {
        selfClient.logProofEvent('warn', 'Status UUID mismatch', context, {
          received_uuid: statusUuid,
        });
        console.warn(
          `Received status UUID (${statusUuid}) does not match stored UUID (${getState().uuid}). Using received UUID.`,
        );
      }
      const endpointType = getState().endpointType;
      if (!endpointType) {
        selfClient.logProofEvent('error', 'Endpoint type missing', context, {
          failure: 'PROOF_FAILED_TEE_PROCESSING',
          duration_ms: Date.now() - startTime,
        });
        console.error('Cannot start Socket.IO listener: endpointType not set.');
        selfClient?.trackEvent(ProofEvents.PROOF_FAILED, {
          circuitType: getState().circuitType,
          error: getState().error_code ?? 'unknown',
        });
        actor.send({ type: 'PROVE_ERROR' });
        return;
      }
      startSocketIOStatusListener(statusUuid, endpointType, selfClient);
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
        circuitType: getState().circuitType,
        error: getState().error_code ?? 'unknown',
      });
      actor.send({ type: 'PROVE_ERROR' });
    } else {
      selfClient.logProofEvent('warn', 'Unknown message format', context);
      console.warn('Received unknown message format from TEE:', result);
    }
  } catch (error) {
    selfClient.logProofEvent('error', 'WebSocket message handling failed', context, {
      failure:
        getState().currentState === 'init_tee_connexion' ? 'PROOF_FAILED_CONNECTION' : 'PROOF_FAILED_TEE_PROCESSING',
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startTime,
    });
    console.error('Error processing WebSocket message:', error);
    if (getState().currentState === 'init_tee_connexion') {
      selfClient?.trackEvent(ProofEvents.TEE_CONN_FAILED, {
        message: error instanceof Error ? error.message : String(error),
      });
      actor.send({ type: 'CONNECT_ERROR' });
    } else {
      selfClient?.trackEvent(ProofEvents.TEE_WS_ERROR, {
        error: error instanceof Error ? error.message : String(error),
      });
      selfClient?.trackEvent(ProofEvents.PROOF_FAILED, {
        circuitType: getState().circuitType,
        error: getState().error_code ?? 'unknown',
      });
      actor.send({ type: 'PROVE_ERROR' });
    }
  }
};

export const _handleWsClose = (event: CloseEvent, selfClient: SelfClient, deps: WebSocketHandlerDeps) => {
  const { getState, setState, getActor, createProofContext } = deps;
  selfClient.trackEvent(ProofEvents.TEE_WS_CLOSED, {
    code: event.code,
    reason: event.reason,
  });
  if (!getActor()) {
    return;
  }
  const context = createProofContext('_handleWsClose');
  selfClient.logProofEvent('warn', 'TEE WebSocket closed', context, {
    code: event.code,
    reason: event.reason,
  });
  const currentState = getState().currentState;
  if (currentState === 'init_tee_connexion' || currentState === 'proving' || currentState === 'listening_for_status') {
    console.error(`TEE WebSocket closed unexpectedly during ${currentState}.`);
    _handleWebSocketMessage(
      new MessageEvent('error', {
        data: JSON.stringify({ error: 'WebSocket closed unexpectedly' }),
      }),
      selfClient,
      deps,
    );
  }
  if (getState().wsConnection) {
    setState({ wsConnection: null });
  }
};

export const _handleWsError = (error: Event, selfClient: SelfClient, deps: WebSocketHandlerDeps) => {
  const { getActor, createProofContext } = deps;
  console.error('TEE WebSocket error event:', error);
  if (!getActor()) {
    return;
  }
  const context = createProofContext('_handleWsError');
  selfClient.logProofEvent('error', 'TEE WebSocket error', context, {
    failure: 'PROOF_FAILED_CONNECTION',
    error: error instanceof Error ? error.message : String(error),
  });
  _handleWebSocketMessage(
    new MessageEvent('error', {
      data: JSON.stringify({ error: 'WebSocket connection error' }),
    }),
    selfClient,
    deps,
  );
};

export const _handleWsOpen = (selfClient: SelfClient, deps: WebSocketHandlerDeps) => {
  const { getState, setState, getActor, createProofContext } = deps;
  const actor = getActor();
  if (!actor) {
    return;
  }
  const ws = getState().wsConnection;
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
  selfClient.logProofEvent('info', 'WebSocket open', context);
  setState({ uuid: connectionUuid });
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
};
