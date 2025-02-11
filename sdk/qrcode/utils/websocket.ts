import io, { Socket } from 'socket.io-client';
import { QRcodeSteps } from './utils';
import { SelfAttestation, SelfVerifier } from '@openpassport/core';

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
    openPassportVerifier: SelfVerifier,
    onSuccess: (proof: SelfAttestation) => void
  ) =>
    async (data) => {
      console.log('received mobile status:', data.status);
      switch (data.status) {
        case 'mobile_connected':
          setProofStep(QRcodeSteps.MOBILE_CONNECTED);
          newSocket.emit('web_app_info', {
            "webAppInfo": webAppInfo,
            "disclosureOptions": openPassportVerifier.toDisclosureOptions()
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

      if (data.proof) {
        // TODO: Remove frontend proof verification and wait for backend response before showing the validation animation
        console.log(data.proof);
        try {
          const local_proofVerified = await openPassportVerifier.verify(data.proof); // FIXME: add publicSignals
          setProofVerified(local_proofVerified.valid);
          setProofStep(QRcodeSteps.PROOF_VERIFIED);
          setTimeout(() => {
            newSocket.emit('proof_verified', {
              sessionId,
              proofVerified: local_proofVerified.toString(),
            });
            if (local_proofVerified.valid) {
              onSuccess(data.proof);
            }
          }, 1500); // wait for animation to finish before sending the proof to mobile
        } catch (error) {
          console.error('Error verifying proof:', error);
          setProofVerified(false);
          setProofStep(QRcodeSteps.PROOF_VERIFIED);
          newSocket.emit('proof_verified', {
            sessionId,
            proofVerified: JSON.stringify({ valid: false, error: error.message }),
          });
        }
      }
    };

export function initWebSocket(
  websocketUrl: string,
  sessionId: string,
  webAppInfo: WebAppInfo,
  setProofStep: (step: number) => void,
  setProofVerified: (proofVerified: boolean) => void,
  openPassportVerifier: SelfVerifier,
  onSuccess: (proof: SelfAttestation) => void
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
      openPassportVerifier,
      onSuccess
    )
  );
}
