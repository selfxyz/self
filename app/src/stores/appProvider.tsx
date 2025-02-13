import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import io, { Socket } from 'socket.io-client';

import { WS_DB_RELAYER_NEW } from '../../../common/src/constants/constants';
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
   */
  startAppListener: (
    sessionId: string,
    setSelectedApp: (app: SelfApp) => void,
  ) => void;
}

const AppContext = createContext<IAppContext>({
  startAppListener: () => {},
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
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

      // Ensure the URL uses the proper WebSocket scheme.
      const connectionUrl = WS_DB_RELAYER_NEW.startsWith('https')
        ? WS_DB_RELAYER_NEW.replace(/^https/, 'wss')
        : WS_DB_RELAYER_NEW;
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
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log(
          `[AppProvider] Mobile WS connected (id: ${socket.id}) with sessionId: ${sessionId}`,
        );
      });

      // Listen for the event (should be emitted from the web side once mobile connects).
      socket.on('self_app', (data: any) => {
        console.log('[AppProvider] Received self_app event with data:', data);
        const appData: SelfApp =
          typeof data === 'string' ? JSON.parse(data) : data;
        // setSelfApp(appData);
        console.log(
          '[AppProvider] Updated selfApp state:',
          JSON.stringify(appData),
        );
        // Update the navigation store so that ProveScreen (and other screens) know which app is selected.
        setSelectedApp(appData);
        console.log(
          '[AppProvider] Called setSelectedApp with appData:',
          appData,
        );
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

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log('[AppProvider] Cleaning up WS connection on unmount');
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <AppContext.Provider value={{ startAppListener }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
