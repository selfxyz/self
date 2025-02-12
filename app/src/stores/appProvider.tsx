import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

import { WS_URL } from '../../../common/src/constants/constants';
import { SelfApp } from '../../../common/src/utils/appType';
import useNavigationStore from './navigationStore';

interface IAppContext {
    selfApp: SelfApp | null;
    /**
     * Call this function with the sessionId (scanned via ViewFinder) to
     * start the mobile WS connection. Once connected, the server (via our
     * Rust handler) will update the web client about mobile connectivity,
     * prompting the web to send its SelfApp over. The mobile provider here
     * listens for the "self_app" event and updates the navigation store.
     *
     * @param sessionId - The session ID from the scanned QR code.
     */
    startAppListener: (sessionId: string) => void;
}

const AppContext = createContext<IAppContext>({
    selfApp: null,
    startAppListener: () => { },
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const startAppListener = (sessionId: string) => {
        // Disconnect any already opened connection
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        // Create a new socket connection using the WS_URL from constants.
        // Note: The query includes sessionId and sets clientType to "mobile"
        const socket = io(`${WS_URL}/websocket`, {
            path: '/',
            transports: ['websocket'],
            query: {
                sessionId,
                clientType: 'mobile',
            },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log(`Mobile WS connected (id: ${socket.id}) with sessionId: ${sessionId}`);
        });

        // When the mobile device receives the "self_app" event containing the SelfApp object...
        socket.on('self_app', (data: any) => {
            console.log('Mobile received self_app data:', data);
            const appData: SelfApp = typeof data === 'string' ? JSON.parse(data) : data;
            setSelfApp(appData);
            // Update the navigation store so that ProveScreen (and other screens) know which app is selected.
            useNavigationStore.getState().update({ selectedApp: appData });
        });

        socket.on('connect_error', (error) => {
            console.error('Mobile WS connection error:', error);
        });

        socket.on('disconnect', (reason: string) => {
            console.log('Mobile WS disconnected:', reason);
        });
    };

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    return (
        <AppContext.Provider value={{ selfApp, startAppListener }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
