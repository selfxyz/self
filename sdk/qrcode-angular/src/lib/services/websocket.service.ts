import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import type { SelfApp } from '../common';
import type { Socket } from 'socket.io-client';
import { newSocket, validateWebSocketUrl } from '../utils/websocket';
import { QRcodeSteps } from '../utils/utils';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private proofStepSubject = new BehaviorSubject<number>(QRcodeSteps.WAITING_FOR_MOBILE);
  private cleanupFunction: (() => void) | null = null;

  public proofStep$ = this.proofStepSubject.asObservable();

  initializeConnection(
    websocketUrl: string,
    selfApp: SelfApp,
    type: 'websocket' | 'deeplink',
    onSuccess: () => void,
    onError: (data: { error_code?: string; reason?: string }) => void
  ): void {
    // Clean up any existing connection
    this.cleanup();

    console.log('[WebSocketService] Initializing new WebSocket connection');

    this.cleanupFunction = this.initWebSocket(websocketUrl, selfApp, type, onSuccess, onError);
  }

  initWebSocket(
    websocketUrl: string,
    selfApp: SelfApp,
    type: 'websocket' | 'deeplink',
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
      this.handleWebSocketMessage(socket, sessionId, selfApp, type, onSuccess, onError, data);
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

  handleWebSocketMessage(
    socket: Socket,
    sessionId: string,
    selfApp: SelfApp,
    type: 'websocket' | 'deeplink',
    onSuccess: () => void,
    onError: (data: { error_code?: string; reason?: string }) => void,
    data: { status: string; error_code?: string; reason?: string }
  ) {
    console.log('[WebSocket] Received mobile status:', data.status, 'for session:', sessionId);
    switch (data.status) {
      case 'mobile_connected':
        console.log(
          '[WebSocket] Mobile device connected. Emitting self_app event with payload:',
          selfApp
        );
        this.proofStepSubject.next(QRcodeSteps.MOBILE_CONNECTED);
        if (type === 'websocket') {
          socket.emit('self_app', { ...selfApp, sessionId });
        }
        break;
      case 'mobile_disconnected':
        console.log('[WebSocket] Mobile device disconnected.');
        this.proofStepSubject.next(QRcodeSteps.WAITING_FOR_MOBILE);
        break;
      case 'proof_generation_started':
        console.log('[WebSocket] Proof generation started.');
        this.proofStepSubject.next(QRcodeSteps.PROOF_GENERATION_STARTED);
        break;
      case 'proof_generated':
        console.log('[WebSocket] Proof generated.');
        this.proofStepSubject.next(QRcodeSteps.PROOF_GENERATED);
        break;
      case 'proof_generation_failed':
        console.log('[WebSocket] Proof generation failed.');
        this.proofStepSubject.next(QRcodeSteps.PROOF_GENERATION_FAILED);
        onError(data);
        break;
      case 'proof_verified':
        console.log('[WebSocket] Proof verified.');
        console.log('ws data', data);
        this.proofStepSubject.next(QRcodeSteps.PROOF_VERIFIED);
        onSuccess();
        break;
      default:
        console.log('[WebSocket] Unhandled mobile status:', data.status);
        break;
    }
  }

  cleanup(): void {
    if (this.cleanupFunction) {
      console.log('[WebSocketService] Cleaning up WebSocket connection');
      this.cleanupFunction();
      this.cleanupFunction = null;
    }
  }

  resetStep(): void {
    this.proofStepSubject.next(QRcodeSteps.WAITING_FOR_MOBILE);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }
}
