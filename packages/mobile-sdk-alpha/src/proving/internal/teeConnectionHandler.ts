// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PassportData } from '@selfxyz/common/types';
import { getCircuitNameFromPassportData } from '@selfxyz/common/utils';

import { ProofEvents } from '../../constants/analytics';
import type { SelfClient } from '../../types/public';
import type { WsHandlers } from '../types';
import type { ProvingDependencies, ProvingStoreSnapshot } from './dependencyFactory';
import { createProofContext } from './helpers';
import { resolveWebSocketUrl } from './websocketUrlResolver';

type ProvingStateWithMethods = ProvingStoreSnapshot & {
  _closeConnections: (selfClient: SelfClient) => void;
  _handleWebSocketMessage: (event: MessageEvent, selfClient: SelfClient) => Promise<void>;
  _handleWsOpen: (selfClient: SelfClient) => void;
  _handleWsError: (error: Event, selfClient: SelfClient) => void;
  _handleWsClose: (event: CloseEvent, selfClient: SelfClient) => void;
};

export const initTeeConnection = async (selfClient: SelfClient, deps: ProvingDependencies): Promise<boolean> => {
  const get = deps.get;
  const set = deps.set;
  const actor = deps.getActor();

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
    circuitName =
      passportData.documentCategory === 'aadhaar'
        ? 'disclose_aadhaar'
        : passportData.documentCategory === 'kyc'
          ? 'disclose_kyc'
          : 'disclose';
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

  (get() as ProvingStateWithMethods)._closeConnections(selfClient);
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
      message: (event: MessageEvent) => (get() as ProvingStateWithMethods)._handleWebSocketMessage(event, selfClient),
      open: () => (get() as ProvingStateWithMethods)._handleWsOpen(selfClient),
      error: (error: Event) => (get() as ProvingStateWithMethods)._handleWsError(error, selfClient),
      close: (event: CloseEvent) => (get() as ProvingStateWithMethods)._handleWsClose(event, selfClient),
    };

    set({ wsConnection: ws, wsHandlers, wsReconnectAttempts: 0 });

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
};
