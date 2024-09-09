import React, { useEffect, useRef, useState } from 'react';

import io, { Socket } from 'socket.io-client';
import { QRcodeSteps } from './utils';
import { OpenPassport1StepInputs, OpenPassport1StepVerifier } from '../../OpenPassport1Step';
import { OpenPassportVerifierReport } from '../../OpenPassportVerifierReport';


const newSocket = (websocketUrl: string, sessionId: string) => io(websocketUrl, {
    path: '/websocket',
    query: { sessionId, clientType: 'web' },
});

const handleWebSocketMessage = (newSocket: Socket, sessionId: string, setProofStep: (step: number) => void, setProofVerified: (proofVerified: boolean) => void, openPassport1StepVerifier: OpenPassport1StepVerifier, onSuccess: (proof: OpenPassport1StepInputs, report: OpenPassportVerifierReport) => void) => async (data) => {
    console.log('received mobile status:', data.status);
    switch (data.status) {
        case 'mobile_connected':
            setProofStep(QRcodeSteps.MOBILE_CONNECTED);
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
        try {
            const local_proofVerified: OpenPassportVerifierReport =
                await openPassport1StepVerifier.verify(data.proof);
            setProofVerified(local_proofVerified.valid);
            setProofStep(QRcodeSteps.PROOF_VERIFIED);
            setTimeout(() => {
                newSocket.emit('proof_verified', {
                    sessionId,
                    proofVerified: local_proofVerified.toString(),
                });
                if (local_proofVerified.valid) {
                    const openPassport1StepInputs = new OpenPassport1StepInputs(data.proof);
                    onSuccess(openPassport1StepInputs, local_proofVerified);
                }
            }, 1500); // wait for animation to finish before sending the proof to mobile
        } catch (error) {
            console.error('Error verifying proof:', error);
            setProofVerified(false);
            newSocket.emit('proof_verified', {
                sessionId,
                proofVerified: { valid: false, error: error.message },
            });
        }
    }
};

export function initWebSocket(websocketUrl: string, sessionId: string, setProofStep: (step: number) => void, setProofVerified: (proofVerified: boolean) => void, openPassport1StepVerifier: OpenPassport1StepVerifier, onSuccess: (proof: OpenPassport1StepInputs, report: OpenPassportVerifierReport) => void) {
    const socket = newSocket(websocketUrl, sessionId);
    socket.on('mobile_status', handleWebSocketMessage(socket, sessionId, setProofStep, setProofVerified, openPassport1StepVerifier, onSuccess));
}