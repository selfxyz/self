import { io } from 'socket.io-client';

export interface WebAppInfo {
  appName: string;
  userId: string;
  logoBase64: string;
}

export const validateWebSocketUrl = (websocketUrl: string) => {
  if (websocketUrl.includes('localhost') || websocketUrl.includes('127.0.0.1')) {
    throw new Error('localhost websocket URLs are not allowed');
  }
};

export const newSocket = (websocketUrl: string, sessionId: string) => {
  const fullUrl = `${websocketUrl}/websocket`;
  console.log(`[WebSocket] Creating new socket. URL: ${fullUrl}, sessionId: ${sessionId}`);
  return io(fullUrl, {
    path: '/',
    query: { sessionId, clientType: 'web' },
    transports: ['websocket'],
  });
};
