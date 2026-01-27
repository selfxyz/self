// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AnyActorRef } from 'xstate';

import type { PassportData } from '@selfxyz/common/types';
import { getCircuitNameFromPassportData } from '@selfxyz/common/utils';

import { ProofEvents } from '../../constants/analytics';
import type { SelfClient } from '../../types/public';
import type { ProvingMachineCircuitType, ProvingState, WsHandlers } from '../types';
import { PROVING_EVENTS } from './constants';
import { createProofContext } from './helpers';
import { resolveWebSocketUrl } from './websocketUrlResolver';

type TeeConnectionState = Pick<ProvingState, 'passportData' | 'circuitType' | 'wsConnection' | 'wsHandlers'>;

export type TeeConnectionDeps = {
  getState: () => TeeConnectionState;
  setState: (partial: Partial<TeeConnectionState>) => void;
  getActor: () => AnyActorRef | null;
  handleWebSocketMessage: (event: MessageEvent, selfClient: SelfClient) => Promise<void>;
  handleWsOpen: (selfClient: SelfClient) => void;
  handleWsError: (error: Event, selfClient: SelfClient) => void;
  handleWsClose: (event: CloseEvent, selfClient: SelfClient) => void;
  closeConnections: (selfClient: SelfClient) => void;
};

/**
 * Initialize TEE connection
 */
export const initTeeConnection = async (selfClient: SelfClient, deps: TeeConnectionDeps): Promise<boolean> => {
  const {
    getState,
    setState,
    getActor,
    handleWebSocketMessage,
    handleWsOpen,
    handleWsError,
    handleWsClose,
    closeConnections,
  } = deps;
  const actor = getActor();
  if (!actor) {
    throw new Error('State machine not initialized. Call init() first.');
  }

  const startTime = Date.now();
  const baseContext = createProofContext(selfClient, 'initTeeConnection');
  const { passportData } = getState();
  if (!passportData) {
    selfClient.logProofEvent('error', 'Passport data missing', baseContext, {
      failure: 'PROOF_FAILED_CONNECTION',
      duration_ms: Date.now() - startTime,
    });
    throw new Error('PassportData is not available');
  }
  const circuitType = getState().circuitType as ProvingMachineCircuitType;

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
    actor.send({ type: PROVING_EVENTS.CONNECT_ERROR });
    selfClient.logProofEvent('error', 'Circuit name missing', baseContext, {
      failure: 'PROOF_FAILED_CONNECTION',
      duration_ms: Date.now() - startTime,
    });
    throw new Error('Could not determine circuit name');
  }

  if (!wsRpcUrl) {
    actor.send({ type: PROVING_EVENTS.CONNECT_ERROR });
    selfClient.logProofEvent('error', 'WebSocket URL missing', baseContext, {
      failure: 'PROOF_FAILED_CONNECTION',
      duration_ms: Date.now() - startTime,
    });
    throw new Error('No WebSocket URL available for TEE connection');
  }

  closeConnections(selfClient);
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
      message: (event: MessageEvent) => handleWebSocketMessage(event, selfClient),
      open: () => handleWsOpen(selfClient),
      error: (error: Event) => handleWsError(error, selfClient),
      close: (event: CloseEvent) => handleWsClose(event, selfClient),
    };

    setState({ wsConnection: ws, wsHandlers });

    ws.addEventListener('message', wsHandlers.message);
    ws.addEventListener('open', wsHandlers.open);
    ws.addEventListener('error', wsHandlers.error);
    ws.addEventListener('close', wsHandlers.close);

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
