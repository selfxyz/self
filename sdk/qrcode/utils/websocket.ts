import io, { Socket } from 'socket.io-client';
import { QRcodeSteps } from './utils';

export interface WebAppInfo {
  appName: string;
  userId: string;
  logoBase64: string;
};

const newSocket = (websocketUrl: string, sessionId: string) =>
  io(websocketUrl + "/websocket", {
    path: '/',
    query: { sessionId, clientType: 'web' },
  });

const handleWebSocketMessage =
  (
    newSocket: Socket,
    sessionId: string,
    webAppInfo: WebAppInfo,
    setProofStep: (step: number) => void,
    setProofVerified: (proofVerified: boolean) => void,
    onSuccess: () => void
  ) =>
    async (data) => {
      console.log('received mobile status:', data.status);
      switch (data.status) {
        case 'mobile_connected':
          setProofStep(QRcodeSteps.MOBILE_CONNECTED);
          newSocket.emit('web_app_info', {
            "webAppInfo": webAppInfo,
          });
          break;
        case 'mobile_disconnected':
          setProofStep(QRcodeSteps.WAITING_FOR_MOBILE);
          break;
        case 'proof_generation_started':
          setProofStep(QRcodeSteps.PROOF_GENERATION_STARTED);
          break;
        case 'proof_generated':
          setProofStep(QRcodeSteps.PROOF_GENERATED);
          break;
        case 'proof_generation_failed':
          setProofVerified(false);
          setProofStep(QRcodeSteps.PROOF_VERIFIED);
          console.log('Proof generation failed');
          break;
      }
    };

export function initWebSocket(
  websocketUrl: string,
  sessionId: string,
  webAppInfo: WebAppInfo,
  setProofStep: (step: number) => void,
  setProofVerified: (proofVerified: boolean) => void,
  onSuccess: () => void
) {
  const socket = newSocket(websocketUrl, sessionId);
  socket.on(
    'mobile_status',
    handleWebSocketMessage(
      socket,
      sessionId,
      webAppInfo,
      setProofStep,
      setProofVerified,
      onSuccess
    )
  );
}
