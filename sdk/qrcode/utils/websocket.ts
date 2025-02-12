import io, { Socket } from 'socket.io-client';
import { QRcodeSteps } from './utils';
import { SelfApp } from '../../../common/src/utils/appType';

export interface WebAppInfo {
  appName: string;
  userId: string;
  logoBase64: string;
};

const newSocket = (websocketUrl: string, sessionId: string) =>
  io(`${websocketUrl}/websocket`, {
    path: '/',
    query: { sessionId, clientType: 'web' },
  });

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
      console.log('Received mobile status:', data.status);
      switch (data.status) {
        case 'mobile_connected':
          setProofStep(QRcodeSteps.MOBILE_CONNECTED);
          socket.emit('self_app', selfApp);
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
        default:
          console.log('Unhandled status:', data.status);
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
  const socket = newSocket(websocketUrl, sessionId);
  socket.on(
    'mobile_status',
    handleWebSocketMessage(
      socket,
      sessionId,
      selfApp,
      setProofStep,
      setProofVerified,
      onSuccess
    )
  );
}
