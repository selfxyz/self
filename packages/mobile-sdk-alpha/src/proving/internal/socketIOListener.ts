// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Socket } from 'socket.io-client';
import socketIo from 'socket.io-client';
import type { AnyActorRef } from 'xstate';

import type { EndpointType } from '@selfxyz/common/utils';
import { getWSDbRelayerUrl } from '@selfxyz/common/utils/proving';

import { ProofEvents } from '../../constants/analytics';
import type { SelfClient } from '../../types/public';
import type { ProvingState } from '../types';
import type { ProofContext } from './logging';
import { handleStatusCode, parseStatusMessage } from './statusHandlers';

type SocketIOState = Pick<ProvingState, 'currentState' | 'socketConnection' | 'circuitType'>;

export type SocketIOListenerDeps = {
  getState: () => SocketIOState;
  setState: (partial: Partial<SocketIOState>) => void;
  getActor: () => AnyActorRef | null;
  createProofContext: (stage: string, overrides?: Partial<ProofContext>) => ProofContext;
};

export const _startSocketIOStatusListener = (
  receivedUuid: string,
  endpointType: EndpointType,
  selfClient: SelfClient,
  deps: SocketIOListenerDeps,
) => {
  const { getState, setState, getActor, createProofContext } = deps;
  const actor = getActor();
  if (!actor) {
    console.error('Cannot start Socket.IO listener: Actor not available.');
    return;
  }

  const url = getWSDbRelayerUrl(endpointType);
  const socket: Socket = socketIo(url, {
    path: '/',
    transports: ['websocket'],
  });

  setState({ socketConnection: socket });
  selfClient.trackEvent(ProofEvents.SOCKETIO_CONN_STARTED);
  const context = createProofContext('_startSocketIOStatusListener');
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
    actor.send({ type: 'PROVE_ERROR' });
    setState({ socketConnection: null });
  });

  socket.on('disconnect', (_reason: string) => {
    const currentActor = getActor();
    selfClient.logProofEvent('warn', 'Socket.IO disconnected', context);
    if (getState().currentState === 'ready_to_prove' && currentActor) {
      console.error('SocketIO disconnected unexpectedly during proof listening.');
      selfClient.trackEvent(ProofEvents.SOCKETIO_DISCONNECT_UNEXPECTED);
      selfClient.logProofEvent('error', 'Socket.IO disconnected unexpectedly', context, {
        failure: 'PROOF_FAILED_CONNECTION',
      });
      currentActor.send({ type: 'PROVE_ERROR' });
    }
    setState({ socketConnection: null });
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

      const circuitType = getState().circuitType;
      if (!circuitType) {
        console.error('Circuit type not set when handling status');
        getActor()?.send({ type: 'PROVE_ERROR' });
        return;
      }
      const result = handleStatusCode(data, circuitType);

      if (result.stateUpdate) {
        setState(result.stateUpdate);
      }

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

      if (result.actorEvent) {
        if (result.actorEvent.type === 'PROVE_FAILURE') {
          console.error(
            'Proof generation/verification failed (status 3 or 5). Error code:',
            result.stateUpdate?.error_code,
          );
        }
        getActor()?.send(result.actorEvent);
      }

      if (result.shouldDisconnect) {
        socket?.disconnect();
      }
    } catch (error) {
      console.error('Error handling status message:', error);
      selfClient.logProofEvent('error', 'Status message parsing failed', context, {
        failure: 'PROOF_FAILED_MESSAGE_PARSING',
        error: error instanceof Error ? error.message : String(error),
      });
      getActor()?.send({ type: 'PROVE_ERROR' });
    }
  });
};
