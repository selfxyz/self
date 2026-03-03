// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Socket } from 'socket.io-client';
import socketIo from 'socket.io-client';

import type { EndpointType } from '@selfxyz/common/utils';
import { getWSDbRelayerUrl } from '@selfxyz/common/utils/proving';

import { ProofEvents } from '../../constants/analytics';
import type { SelfClient } from '../../types/public';
import type { ProvingDependencies } from './dependencyFactory';
import { createProofContext } from './helpers';
import { handleStatusCode, parseStatusMessage } from './statusHandlers';

export const startSocketIOStatusListener = (
  receivedUuid: string,
  endpointType: EndpointType,
  selfClient: SelfClient,
  deps: ProvingDependencies,
) => {
  const get = deps.get;
  const set = deps.set;
  const actor = deps.getActor();

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
    actor.send({ type: 'PROVE_ERROR' });
    set({ socketConnection: null });
  });

  socket.on('disconnect', (_reason: string) => {
    const currentActor = deps.getActor();
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
        actor.send(result.actorEvent);
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
      actor.send({ type: 'PROVE_ERROR' });
    }
  });
};
