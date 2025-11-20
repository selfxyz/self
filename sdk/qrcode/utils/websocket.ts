import type { SelfApp } from '@selfxyz/sdk-common';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

import { QRcodeSteps } from './utils.js';

export interface WebAppInfo {
  appName: string;
  userId: string;
  logoBase64: string;
}

// Log once when this module loads
console.log('[WebSocket] Initializing websocket module.');

const validateWebSocketUrl = (websocketUrl: string) => {
  if (websocketUrl.includes('localhost') || websocketUrl.includes('127.0.0.1')) {
    throw new Error('localhost websocket URLs are not allowed');
  }
};

const newSocket = (websocketUrl: string, sessionId: string) => {
  const fullUrl = `${websocketUrl}/websocket`;
  console.log(`[WebSocket] Creating new socket. URL: ${fullUrl}, sessionId: ${sessionId}`);
  return io(fullUrl, {
    path: '/',
    query: { sessionId, clientType: 'web' },
    transports: ['websocket'],
  });
};

const handleWebSocketMessage =
  (
    socket: Socket,
    sessionId: string,
    selfApp: SelfApp,
    type: 'websocket' | 'deeplink',
    setProofStep: (step: number) => void,
    onSuccess: () => void,
    onError: (data: { error_code?: string; reason?: string }) => void
  ) =>
  async (data: { status: string; error_code?: string; reason?: string }) => {
    console.log('[WebSocket] Received mobile status:', data.status, 'for session:', sessionId);
    switch (data.status) {
      case 'mobile_connected':
        console.log(
          '[WebSocket] Mobile device connected. Emitting self_app event with payload:',
          selfApp
        );
        setProofStep(QRcodeSteps.MOBILE_CONNECTED);
        if (type === 'websocket') {
          socket.emit('self_app', { ...selfApp, sessionId });
        }
        break;
      case 'mobile_disconnected':
        console.log('[WebSocket] Mobile device disconnected.');
        setProofStep(QRcodeSteps.WAITING_FOR_MOBILE);
        break;
      case 'proof_generation_started':
        console.log('[WebSocket] Proof generation started.');
        setProofStep(QRcodeSteps.PROOF_GENERATION_STARTED);
        break;
      case 'proof_generated':
        console.log('[WebSocket] Proof generated.');
        setProofStep(QRcodeSteps.PROOF_GENERATED);
        break;
      case 'proof_generation_failed':
        console.log('[WebSocket] Proof generation failed.');
        setProofStep(QRcodeSteps.PROOF_GENERATION_FAILED);
        onError(data);
        break;
      case 'proof_verified':
        console.log('[WebSocket] Proof verified.');
        console.log('ws data', data);
        setProofStep(QRcodeSteps.PROOF_VERIFIED);
        onSuccess();
        break;
      default:
        console.log('[WebSocket] Unhandled mobile status:', data.status);
        break;
    }
  };

export function initWebSocket(
  websocketUrl: string,
  selfApp: SelfApp,
  type: 'websocket' | 'deeplink',
  setProofStep: (step: number) => void,
  onSuccess: () => void,
  onError: (data: { error_code?: string; reason?: string }) => void
) {
  validateWebSocketUrl(websocketUrl);
  const sessionId = selfApp.sessionId;
  console.log(`[WebSocket] Initializing WebSocket connection for sessionId: ${sessionId}`);
  const socket = newSocket(websocketUrl, sessionId);

  socket.on('connect', () => {
    console.log(
      `[WebSocket] Connected with id: ${socket.id}, transport: ${socket.io.engine.transport.name}`
    );
  });

  socket.on('connect_error', (error) => {
    console.error('[WebSocket] Connection error:', error);
  });

  socket.on('mobile_status', (data) => {
    console.log('[WebSocket] Raw mobile_status event received:', data);
    handleWebSocketMessage(
      socket,
      sessionId,
      selfApp,
      type,
      setProofStep,
      onSuccess,
      onError
    )(data);
  });

  socket.on('disconnect', (reason: string) => {
    console.log(
      `[WebSocket] Disconnected. Reason: ${reason}, Last transport: ${socket.io.engine.transport?.name}`
    );
  });

  return () => {
    console.log(`[WebSocket] Cleaning up connection for sessionId: ${sessionId}`);
    if (socket) {
      socket.disconnect();
    }
  };
}
