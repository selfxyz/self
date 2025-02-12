import io, { Socket } from 'socket.io-client';
import { QRcodeSteps } from './utils';
import { SelfApp } from '../../../common/src/utils/appType';

export interface WebAppInfo {
  appName: string;
  userId: string;
  logoBase64: string;
};

// Log once when this module loads
console.log('[WebSocket] Initializing websocket module.');

const newSocket = (websocketUrl: string, sessionId: string) => {
  const fullUrl = `${websocketUrl}/websocket`;
  console.log(`[WebSocket] Creating new socket. URL: ${fullUrl}, sessionId: ${sessionId}`);
  return io(fullUrl, {
    path: '/',
    query: { sessionId, clientType: 'web' },
  });
};

const handleWebSocketMessage =
  (
    socket: Socket,
    sessionId: string,
    selfApp: SelfApp,
    setProofStep: (step: number) => void,
    setProofVerified: (proofVerified: boolean) => void,
    onSuccess: () => void
  ) =>
    async (data: any) => {
      console.log('[WebSocket] Received mobile status:', data.status, 'for session:', sessionId);
      switch (data.status) {
        case 'mobile_connected':
          console.log('[WebSocket] Mobile device connected. Emitting self_app event with payload:', selfApp);
          setProofStep(QRcodeSteps.MOBILE_CONNECTED);
          socket.emit('self_app', { ...selfApp, sessionId });
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
          setProofVerified(false);
          setProofStep(QRcodeSteps.PROOF_VERIFIED);
          break;
        default:
          console.log('[WebSocket] Unhandled mobile status:', data.status);
          break;
      }
    };

export function initWebSocket(
  websocketUrl: string,
  sessionId: string,
  selfApp: SelfApp,
  setProofStep: (step: number) => void,
  setProofVerified: (proofVerified: boolean) => void,
  onSuccess: () => void
) {
  console.log(`[WebSocket] Initializing WebSocket connection for sessionId: ${sessionId}`);
  const socket = newSocket(websocketUrl, sessionId);

  socket.on('connect', () => {
    console.log(`[WebSocket] WebSocket client connected with id: ${socket.id}`);
  });

  socket.on('connect_error', (error) => {
    console.error('[WebSocket] Connection error:', error);
  });

  socket.on('mobile_status', handleWebSocketMessage(
    socket,
    sessionId,
    selfApp,
    setProofStep,
    setProofVerified,
    onSuccess
  ));

  socket.on('disconnect', (reason: string) => {
    console.log('[WebSocket] Disconnected from WebSocket server. Reason:', reason);
  });
}
