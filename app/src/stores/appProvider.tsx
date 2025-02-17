import React, { createContext, useContext, useEffect, useRef } from 'react';

import io, { Socket } from 'socket.io-client';

import { WS_DB_RELAYER } from '../../../common/src/constants/constants';
import { SelfApp } from '../../../common/src/utils/appType';

interface IAppContext {
  /**
   * Call this function with the sessionId (scanned via ViewFinder) to
   * start the mobile WS connection. Once connected, the server (via our
   * Rust handler) will update the web client about mobile connectivity,
   * prompting the web to send its SelfApp over. The mobile provider here
   * listens for the "self_app" event and updates the navigation store.
   *
   * @param sessionId - The session ID from the scanned QR code.
   * @param setSelectedApp - The function to update the selected app in the navigation store.
   */
  startAppListener: (
    sessionId: string,
    setSelectedApp: (app: SelfApp) => void,
  ) => void;

  /**
   * Call this function with the sessionId and success status to notify the web app
   * that the proof has been verified.
   *
   * @param sessionId - The session ID from the scanned QR code.
   * @param success - Whether the proof was verified successfully.
   */
  handleProofVerified: (sessionId: string, success: boolean) => void;
}

const AppContext = createContext<IAppContext>({
  startAppListener: () => {},
  handleProofVerified: () => {},
});

const initSocket = (sessionId: string) => {
  // Ensure the URL uses the proper WebSocket scheme.
  const connectionUrl = WS_DB_RELAYER.startsWith('https')
    ? WS_DB_RELAYER.replace(/^https/, 'wss')
    : WS_DB_RELAYER;
  const socketUrl = `${connectionUrl}/websocket`;

  // Create a new socket connection using the updated URL.
  const socket = io(socketUrl, {
    path: '/',
    transports: ['websocket'],
    query: {
      sessionId,
      clientType: 'mobile',
    },
  });
  return socket;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const socketRef = useRef<Socket | null>(null);

  const startAppListener = (
    sessionId: string,
    setSelectedApp: (app: SelfApp) => void,
  ) => {
    console.log(
      `[AppProvider] Initializing WS connection with sessionId: ${sessionId}`,
    );
    try {
      // If a socket connection already exists, disconnect it.
      if (socketRef.current) {
        console.log('[AppProvider] Disconnecting existing socket');
        socketRef.current.disconnect();
      }

      const socket = initSocket(sessionId);
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log(
          `[AppProvider] Mobile WS connected (id: ${socket.id}) with sessionId: ${sessionId}`,
        );
      });

      // Listen for the event only once so that duplicate self_app events are ignored.
      socket.once('self_app', (data: any) => {
        console.log('[AppProvider] Received self_app event with data:', data);
        try {
          const appData: SelfApp =
            typeof data === 'string' ? JSON.parse(data) : data;
          if (!appData || !appData.sessionId) {
            console.error('[AppProvider] Invalid app data received');
            return;
          }
          console.log(
            '[AppProvider] Processing valid app data:',
            JSON.stringify(appData),
          );
          setSelectedApp(appData);
        } catch (error) {
          console.error('[AppProvider] Error processing app data:', error);
        }
      });

      socket.on('connect_error', error => {
        console.error('[AppProvider] Mobile WS connection error:', error);
      });

      socket.on('error', error => {
        console.error('[AppProvider] Mobile WS error:', error);
      });

      socket.on('disconnect', (reason: string) => {
        console.log('[AppProvider] Mobile WS disconnected:', reason);
      });
    } catch (error) {
      console.error('[AppProvider] Exception in startAppListener:', error);
    }
  };

  const handleProofVerified = (sessionId: string, proof_verified: boolean) => {
    console.log(
      '[AppProvider] handleProofVerified called with sessionId:',
      sessionId,
    );

    if (!socketRef.current) {
      socketRef.current = initSocket(sessionId);
    }

    console.log('[AppProvider] Emitting proof_verified event with data:', {
      session_id: sessionId,
      proof_verified,
    });

    socketRef.current.emit('proof_verified', {
      session_id: sessionId,
      proof_verified,
    });
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log('[AppProvider] Cleaning up WS connection on unmount');
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <AppContext.Provider value={{ startAppListener, handleProofVerified }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
