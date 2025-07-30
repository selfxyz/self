// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import type { SelfApp } from '@selfxyz/common';
import { WS_DB_RELAYER } from '@selfxyz/common';
import socketIo, { Socket } from 'socket.io-client';
import { create } from 'zustand';

interface SelfAppState {
  selfApp: SelfApp | null;
  sessionId: string | null;
  socket: Socket | null;
  startAppListener: (sessionId: string) => void;
  cleanSelfApp: () => void;
  setSelfApp: (selfApp: SelfApp | null) => void;
  _initSocket: (sessionId: string) => Socket;
  handleProofResult: (
    proof_verified: boolean,
    error_code?: string,
    reason?: string,
  ) => void;
}

export const useSelfAppStore = create<SelfAppState>((set, get) => ({
  selfApp: null,
  sessionId: null,
  socket: null,

  _initSocket: (sessionId: string): Socket => {
    const connectionUrl = WS_DB_RELAYER.startsWith('https')
      ? WS_DB_RELAYER.replace(/^https/, 'wss')
      : WS_DB_RELAYER;
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
    console.log(
      `[SelfAppStore] Initializing WS connection with sessionId: ${sessionId}`,
    );
    const currentSocket = get().socket;

    // If a socket connection exists for a different session, disconnect it.
    if (currentSocket && get().sessionId !== sessionId) {
      console.log(
        '[SelfAppStore] Disconnecting existing socket for old session.',
      );
      currentSocket.disconnect();
      set({ socket: null, sessionId: null, selfApp: null });
    } else if (currentSocket && get().sessionId === sessionId) {
      console.log('[SelfAppStore] Already connected with the same session ID.');
      return; // Avoid reconnecting if already connected with the same session
    }

    try {
      const socket = get()._initSocket(sessionId);
      set({ socket, sessionId });

      socket.on('connect', () => {
        console.log(
          `[SelfAppStore] Mobile WS connected (id: ${socket.id}) with sessionId: ${sessionId}`,
        );
      });

      // Listen for the event only once per connection attempt
      socket.once('self_app', (data: any) => {
        console.log('[SelfAppStore] Received self_app event with data:', data);
        try {
          const appData: SelfApp =
            typeof data === 'string' ? JSON.parse(data) : data;

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

          console.log(
            '[SelfAppStore] Processing valid app data:',
            JSON.stringify(appData),
          );
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

      socket.on('disconnect', (reason: string) => {
        console.log('[SelfAppStore] Mobile WS disconnected:', reason);
        // Prevent cleaning up if disconnect was initiated by cleanSelfApp
        if (get().socket === socket) {
          console.log('[SelfAppStore] Cleaning up state on disconnect.');
          set({ socket: null, sessionId: null, selfApp: null });
        }
      });
    } catch (error) {
      console.error('[SelfAppStore] Exception in startAppListener:', error);
      get().cleanSelfApp(); // Clean up on exception
    }
  },

  cleanSelfApp: () => {
    console.log('[SelfAppStore] Cleaning up SelfApp state and WS connection.');
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
    }
    // Reset state
    set({ selfApp: null, sessionId: null, socket: null });
  },

  handleProofResult: (
    proof_verified: boolean,
    error_code?: string,
    reason?: string,
  ) => {
    const socket = get().socket;
    const sessionId = get().sessionId;

    if (!socket || !sessionId) {
      console.error(
        '[SelfAppStore] Cannot handleProofResult: Socket or SessionId missing.',
      );
      return;
    }

    console.log(
      `[SelfAppStore] handleProofResult called for sessionId: ${sessionId}, verified: ${proof_verified}`,
    );

    if (proof_verified) {
      console.log('[SelfAppStore] Emitting proof_verified event with data:', {
        session_id: sessionId,
      });
      socket.emit('proof_verified', {
        session_id: sessionId,
      });
    } else {
      console.log(
        '[SelfAppStore] Emitting proof_generation_failed event with data:',
        {
          session_id: sessionId,
          error_code,
          reason,
        },
      );
      socket.emit('proof_generation_failed', {
        session_id: sessionId,
        error_code,
        reason,
      });
    }
  },
}));
