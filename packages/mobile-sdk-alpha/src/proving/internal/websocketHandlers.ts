// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { v4 } from 'uuid';

import type { PassportData } from '@selfxyz/common/types';
import { getCircuitNameFromPassportData } from '@selfxyz/common/utils';
import { checkPCR0Mapping, validatePKIToken } from '@selfxyz/common/utils/attest';
import { clientKey, clientPublicKeyHex, ec } from '@selfxyz/common/utils/proving';

import { ProofEvents } from '../../constants/analytics';
import { hasAnyValidRegisteredDocument } from '../../documents/utils';
import { SdkEvents } from '../../types/events';
import type { SelfClient } from '../../types/public';
import type { WsHandlers } from '../types';
import {
  MAX_RECONNECT_ATTEMPTS,
  RECONNECT_BASE_BACKOFF_MS,
  RECONNECT_MAX_BACKOFF_MS,
  RECONNECT_TIMEOUT_MS,
} from './constants';
import type { ProvingDependencies, ProvingStateWithMethods } from './dependencyFactory';
import { createProofContext } from './helpers';
import { resolveWebSocketUrl } from './websocketUrlResolver';

export const handleRegisterErrorOrFailure = async (selfClient: SelfClient) => {
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
};

export const handleWebSocketMessage = async (
  event: MessageEvent,
  selfClient: SelfClient,
  deps: ProvingDependencies,
) => {
  const get = deps.get;
  const set = deps.set;
  const actor = deps.getActor();

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

      const { userPubkey, serverPubkey, imageHash, verified } = validatePKIToken(
        attestationToken,
        selfClient?.config?.debug ?? false,
      );

      const pcr0Mapping = await checkPCR0Mapping(imageHash);

      if (!(selfClient?.config?.debug ?? false) && !pcr0Mapping) {
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

      set({
        serverPublicKey: serverKey.getPublic(true, 'hex'),
        sharedKey: Buffer.from(derivedKey.toArray('be', 32)),
      });
      selfClient?.trackEvent(ProofEvents.SHARED_KEY_DERIVED);
      selfClient.logProofEvent('info', 'Shared key derived', context);

      actor.send({ type: 'CONNECT_SUCCESS' });
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
        actor.send({ type: 'PROVE_ERROR' });
        return;
      }
      (get() as ProvingStateWithMethods)._startSocketIOStatusListener(statusUuid, endpointType, selfClient);
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
      actor.send({ type: 'PROVE_ERROR' });
    } else {
      selfClient.logProofEvent('warn', 'Unknown message format', context);
      console.warn('Received unknown message format from TEE:', result);
    }
  } catch (error) {
    selfClient.logProofEvent('error', 'WebSocket message handling failed', context, {
      failure: get().currentState === 'init_tee_connexion' ? 'PROOF_FAILED_CONNECTION' : 'PROOF_FAILED_TEE_PROCESSING',
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startTime,
    });
    console.error('Error processing WebSocket message:', error);
    if (get().currentState === 'init_tee_connexion') {
      selfClient?.trackEvent(ProofEvents.TEE_CONN_FAILED, {
        message: error instanceof Error ? error.message : String(error),
      });
      actor.send({ type: 'CONNECT_ERROR' });
    } else {
      selfClient?.trackEvent(ProofEvents.TEE_WS_ERROR, {
        error: error instanceof Error ? error.message : String(error),
      });
      selfClient?.trackEvent(ProofEvents.PROOF_FAILED, {
        circuitType: get().circuitType,
        error: get().error_code ?? 'unknown',
      });
      actor.send({ type: 'PROVE_ERROR' });
    }
  }
};

export const handleWsClose = (event: CloseEvent, selfClient: SelfClient, deps: ProvingDependencies) => {
  const get = deps.get;
  const set = deps.set;
  const actor = deps.getActor();

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

  // Handle unexpected close during active proving states
  if (currentState === 'init_tee_connexion' || currentState === 'proving' || currentState === 'listening_for_status') {
    console.error(`TEE WebSocket closed unexpectedly during ${currentState}.`);
    (get() as ProvingStateWithMethods)._handleWebSocketMessage(
      new MessageEvent('error', {
        data: JSON.stringify({ error: 'WebSocket closed unexpectedly' }),
      }),
      selfClient,
    );
  }

  // In ready_to_prove state, attempt automatic reconnection to handle network interruptions.
  // Users may lose connectivity briefly; reconnecting transparently improves UX.
  if (currentState === 'ready_to_prove') {
    const attempts = get().wsReconnectAttempts;

    if (attempts < MAX_RECONNECT_ATTEMPTS) {
      selfClient.logProofEvent('info', 'TEE WebSocket reconnection attempt', context, {
        attempt: attempts + 1,
        max_attempts: MAX_RECONNECT_ATTEMPTS,
      });
      set({ wsConnection: null, wsReconnectAttempts: attempts + 1 });

      const backoffMs = Math.min(RECONNECT_BASE_BACKOFF_MS * Math.pow(2, attempts), RECONNECT_MAX_BACKOFF_MS);
      setTimeout(() => {
        if (get().currentState === 'ready_to_prove') {
          (get() as ProvingStateWithMethods)._reconnectTeeWebSocket(selfClient);
        }
      }, backoffMs);
      return;
    }

    selfClient.logProofEvent('error', 'TEE WebSocket reconnection exhausted', context, {
      failure: 'PROOF_FAILED_CONNECTION',
      attempts: MAX_RECONNECT_ATTEMPTS,
    });
    (get() as ProvingStateWithMethods)._handleWebSocketMessage(
      new MessageEvent('error', {
        data: JSON.stringify({ error: 'WebSocket reconnection failed' }),
      }),
      selfClient,
    );
  }

  if (get().wsConnection) {
    set({ wsConnection: null });
  }
};

export const handleWsError = (error: Event, selfClient: SelfClient, deps: ProvingDependencies) => {
  const actor = deps.getActor();
  const get = deps.get;

  console.error('TEE WebSocket error event:', error);
  if (!actor) {
    return;
  }
  const context = createProofContext(selfClient, '_handleWsError');
  selfClient.logProofEvent('error', 'TEE WebSocket error', context, {
    failure: 'PROOF_FAILED_CONNECTION',
    error: error instanceof Error ? error.message : String(error),
  });
  (get() as ProvingStateWithMethods)._handleWebSocketMessage(
    new MessageEvent('error', {
      data: JSON.stringify({ error: 'WebSocket connection error' }),
    }),
    selfClient,
  );
};

export const handleWsOpen = (selfClient: SelfClient, deps: ProvingDependencies) => {
  const get = deps.get;
  const set = deps.set;
  const actor = deps.getActor();

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
};

export const reconnectTeeWebSocket = async (selfClient: SelfClient, deps: ProvingDependencies): Promise<boolean> => {
  const get = deps.get;
  const set = deps.set;
  const context = createProofContext(selfClient, '_reconnectTeeWebSocket');
  const { passportData, circuitType } = get();

  if (!passportData || !circuitType) {
    selfClient.logProofEvent('error', 'Reconnect failed: missing prerequisites', context);
    return false;
  }

  const typedCircuitType = circuitType as 'disclose' | 'register' | 'dsc';
  const circuitName =
    typedCircuitType === 'disclose'
      ? passportData.documentCategory === 'aadhaar'
        ? 'disclose_aadhaar'
        : passportData.documentCategory === 'kyc'
          ? 'disclose_kyc'
          : 'disclose'
      : getCircuitNameFromPassportData(passportData, typedCircuitType as 'register' | 'dsc');

  const wsRpcUrl = resolveWebSocketUrl(selfClient, typedCircuitType, passportData as PassportData, circuitName);
  if (!wsRpcUrl) {
    selfClient.logProofEvent('error', 'Reconnect failed: no WebSocket URL', context);
    return false;
  }

  selfClient.logProofEvent('info', 'TEE WebSocket reconnection started', context);

  return new Promise(resolve => {
    const ws = new WebSocket(wsRpcUrl);
    let settled = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const settle = (value: boolean): boolean => {
      if (settled) {
        return false;
      }
      settled = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      resolve(value);
      return true;
    };

    const wsHandlers: WsHandlers = {
      message: (event: MessageEvent) => (get() as ProvingStateWithMethods)._handleWebSocketMessage(event, selfClient),
      open: () => {
        if (settled) {
          return;
        }
        selfClient.logProofEvent('info', 'TEE WebSocket reconnected', context);
        set({ wsReconnectAttempts: 0 });
        settle(true);
      },
      error: (error: Event) => (get() as ProvingStateWithMethods)._handleWsError(error, selfClient),
      close: (event: CloseEvent) => (get() as ProvingStateWithMethods)._handleWsClose(event, selfClient),
    };

    set({ wsConnection: ws, wsHandlers });
    ws.addEventListener('message', wsHandlers.message);
    ws.addEventListener('open', wsHandlers.open);
    ws.addEventListener('error', wsHandlers.error);
    ws.addEventListener('close', wsHandlers.close);

    reconnectTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        selfClient.logProofEvent('warn', 'TEE WebSocket reconnection timeout', context);
        if (settle(false)) {
          ws.removeEventListener('message', wsHandlers.message);
          ws.removeEventListener('open', wsHandlers.open);
          ws.removeEventListener('error', wsHandlers.error);
          ws.removeEventListener('close', wsHandlers.close);
          try {
            ws.close();
          } catch (error) {
            console.error('Error closing timed out reconnect socket:', error);
          }
          set({ wsConnection: null, wsHandlers: null });
        }
      }
    }, RECONNECT_TIMEOUT_MS);
  });
};
