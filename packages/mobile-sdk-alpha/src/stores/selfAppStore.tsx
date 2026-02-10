// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Socket } from 'socket.io-client';
import socketIo from 'socket.io-client';
import { create } from 'zustand';

import type { SelfApp } from '@selfxyz/common';
import { WS_DB_RELAYER } from '@selfxyz/common';

/**
 * Zustand state backing the in-app handoff between the SDK and the hosted Self
 * application. The store tracks the active websocket session, latest
 * {@link SelfApp} payload, and helper callbacks used by the proving machine.
 * Consumers should treat the state as ephemeral and expect it to reset whenever
 * the socket disconnects.
 */
export interface SelfAppState {
  selfApp: SelfApp | null;
  sessionId: string | null;
  socket: Socket | null;
  /** Establishes (or reuses) a websocket connection for the provided session. */
  startAppListener: (sessionId: string) => void;
  /** Tears down any active socket connection and clears cached payloads. */
  cleanSelfApp: () => void;
  /** Directly mutates the cached {@link SelfApp}. Primarily used by socket handlers. */
  setSelfApp: (selfApp: SelfApp | null) => void;
  /** Internal helper that derives the correct websocket endpoint and instantiates the client. */
  _initSocket: (sessionId: string) => Socket;
  /** Emits proving results to the relayer so the host app can respond. */
  handleProofResult: (proof_verified: boolean, error_code?: string, reason?: string) => void;
}

/**
 * Internal Self app store hook. Always access it through the self client
 * accessors to avoid creating multiple websocket connections within the same
 * runtime.
 */
export const useSelfAppStore = create<SelfAppState>((set, get) => ({
  selfApp: null,
  sessionId: null,
  socket: null,

  _initSocket: (sessionId: string): Socket => {
    const connectionUrl = WS_DB_RELAYER.startsWith('https') ? WS_DB_RELAYER.replace(/^https/, 'wss') : WS_DB_RELAYER;
    const socketUrl = `${connectionUrl}/websocket`;

    // Create a new socket connection using the updated URL.
    const socket = socketIo(socketUrl, {
      path: '/',
      transports: ['websocket'],
      forceNew: true, // Ensure a new connection is established
      query: {
        sessionId,
        clientType: 'mobile',
      },
    });
    return socket;
  },

  setSelfApp: (selfApp: SelfApp | null) => {
    set({ selfApp });
  },

  startAppListener: (sessionId: string) => {
    const currentSocket = get().socket;

    // If a socket connection exists for a different session, disconnect it.
    if (currentSocket && get().sessionId !== sessionId) {
      currentSocket.disconnect();
      set({ socket: null, sessionId: null, selfApp: null });
    } else if (currentSocket && get().sessionId === sessionId) {
      return; // Avoid reconnecting if already connected with the same session
    }

    try {
      const socket = get()._initSocket(sessionId);
      set({ socket, sessionId });

      socket.on('connect', () => {});

      // Listen for the event only once per connection attempt
      socket.once('self_app', (data: unknown) => {
        try {
          const appData: SelfApp = typeof data === 'string' ? JSON.parse(data) : (data as SelfApp);

          // Basic validation
          if (!appData || typeof appData !== 'object' || !appData.sessionId) {
            console.error('[SelfAppStore] Invalid app data received:', appData);
            // Optionally clear the app data or handle the error appropriately
            set({ selfApp: null });
            return;
          }
          if (appData.sessionId !== get().sessionId) {
            console.warn(
              `[SelfAppStore] Received SelfApp for session ${
                appData.sessionId
              }, but current session is ${get().sessionId}. Ignoring.`,
            );
            return;
          }

          set({ selfApp: appData });
        } catch (error) {
          console.error('[SelfAppStore] Error processing app data:', error);
          set({ selfApp: null }); // Clear app data on parsing error
        }
      });

      socket.on('connect_error', error => {
        console.error('[SelfAppStore] Mobile WS connection error:', error);
        // Clean up on connection error
        get().cleanSelfApp();
      });

      socket.on('error', error => {
        console.error('[SelfAppStore] Mobile WS error:', error);
        // Consider if cleanup is needed here as well
      });

      socket.on('disconnect', (_reason: string) => {
        // Prevent cleaning up if disconnect was initiated by cleanSelfApp
        if (get().socket === socket) {
          set({ socket: null, sessionId: null, selfApp: null });
        }
      });
    } catch (error) {
      console.error('[SelfAppStore] Exception in startAppListener:', error);
      get().cleanSelfApp(); // Clean up on exception
    }
  },

  cleanSelfApp: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
    }
    // Reset state
    set({ selfApp: null, sessionId: null, socket: null });
  },

  handleProofResult: (proof_verified: boolean, error_code?: string, reason?: string) => {
    const socket = get().socket;
    const sessionId = get().sessionId;

    if (!socket || !sessionId) {
      console.error('[SelfAppStore] Cannot handleProofResult: Socket or SessionId missing.');
      return;
    }

    if (proof_verified) {
      socket.emit('proof_verified', {
        session_id: sessionId,
      });
    } else {
      socket.emit('proof_generation_failed', {
        session_id: sessionId,
        error_code,
        reason,
      });
    }
  },
}));
