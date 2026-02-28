import type { SelfApp } from '@selfxyz/sdk-common';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

export const VerificationStep = {
  DISCONNECTED: 0,
  WAITING_FOR_MOBILE: 1,
  MOBILE_CONNECTED: 2,
  PROOF_GENERATION_STARTED: 3,
  PROOF_GENERATION_FAILED: 4,
  PROOF_GENERATED: 5,
  PROOF_VERIFIED: 6,
} as const;

export type VerificationStepValue = (typeof VerificationStep)[keyof typeof VerificationStep];

export interface WebSocketCallbacks {
  onStepChange: (step: VerificationStepValue) => void;
  onSuccess: (data: Record<string, unknown>) => void;
  onError: (data: { error_code?: string; reason?: string }) => void;
}

function createSocket(websocketUrl: string, sessionId: string): Socket {
  const fullUrl = `${websocketUrl}/websocket`;
  return io(fullUrl, {
    path: '/',
    query: { sessionId, clientType: 'web' },
    transports: ['websocket'],
  });
}

function handleMessage(
  socket: Socket,
  sessionId: string,
  selfApp: SelfApp,
  callbacks: WebSocketCallbacks
) {
  return (data: { status: string; error_code?: string; reason?: string }) => {
    switch (data.status) {
      case 'mobile_connected':
        callbacks.onStepChange(VerificationStep.MOBILE_CONNECTED);
        socket.emit('self_app', { ...selfApp, sessionId });
        break;
      case 'mobile_disconnected':
        callbacks.onStepChange(VerificationStep.WAITING_FOR_MOBILE);
        break;
      case 'proof_generation_started':
        callbacks.onStepChange(VerificationStep.PROOF_GENERATION_STARTED);
        break;
      case 'proof_generated':
        callbacks.onStepChange(VerificationStep.PROOF_GENERATED);
        break;
      case 'proof_generation_failed':
        callbacks.onStepChange(VerificationStep.PROOF_GENERATION_FAILED);
        callbacks.onError(data);
        break;
      case 'proof_verified':
        callbacks.onStepChange(VerificationStep.PROOF_VERIFIED);
        callbacks.onSuccess(data as Record<string, unknown>);
        break;
    }
  };
}

export class WebSocketManager {
  private socket: Socket | null = null;
  private callbacks: WebSocketCallbacks;

  constructor(callbacks: WebSocketCallbacks) {
    this.callbacks = callbacks;
  }

  connect(websocketUrl: string, selfApp: SelfApp): void {
    this.disconnect();

    if (websocketUrl.includes('localhost') || websocketUrl.includes('127.0.0.1')) {
      throw new Error('localhost websocket URLs are not allowed');
    }

    const sessionId = selfApp.sessionId;
    this.socket = createSocket(websocketUrl, sessionId);

    this.socket.on('connect', () => {
      this.callbacks.onStepChange(VerificationStep.WAITING_FOR_MOBILE);
    });

    this.socket.on('connect_error', () => {
      this.callbacks.onStepChange(VerificationStep.DISCONNECTED);
    });

    this.socket.on(
      'mobile_status',
      handleMessage(this.socket, sessionId, selfApp, this.callbacks)
    );

    this.socket.on('disconnect', () => {
      this.callbacks.onStepChange(VerificationStep.DISCONNECTED);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  updateCallbacks(callbacks: Partial<WebSocketCallbacks>): void {
    Object.assign(this.callbacks, callbacks);
  }
}
