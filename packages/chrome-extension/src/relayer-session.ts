// Relayer session for embed (disclosure) popups.
//
// The webview-app embed flow builds its SelfApp from URL params and never
// opens a relayer socket, so `handleProofResult` inside the SDK store has no
// socket to emit on. This module fills the mobile-client role instead: it
// joins the room for the RP page's sessionId (mobile_connected fires the
// page's progress UI) and translates the terminal lifecycle result into the
// `proof_verified` / `proof_generation_failed` statuses the RP's websocket
// flow (sdk/qrcode) expects.

import { io, type Socket } from 'socket.io-client';

const RELAY_PROD = 'wss://websocket.self.xyz';
const RELAY_STAGING = 'wss://websocket.staging.self.xyz';

export interface RelayerSession {
  reportResult(success: boolean, errorCode?: string, reason?: string): void;
  reportDismissWithoutResult(): void;
  close(): void;
}

export function startRelayerSession(params: URLSearchParams): RelayerSession | null {
  const sessionId = params.get('verificationId');
  if (!sessionId) return null;

  const env = params.get('environment');
  const relay = params.get('relay') ?? (env === 'stg' || env === 'staging' ? RELAY_STAGING : RELAY_PROD);

  const socket: Socket = io(`${relay}/websocket`, {
    path: '/',
    transports: ['websocket'],
    forceNew: true,
    query: { sessionId, clientType: 'mobile' },
  });
  socket.on('connect_error', (err: Error) => {
    console.warn('[self-ext] relayer connect_error', err.message);
  });

  let reported = false;

  return {
    reportResult(success: boolean, errorCode?: string, reason?: string): void {
      if (reported) return;
      reported = true;
      if (success) {
        socket.emit('proof_verified', { session_id: sessionId });
      } else {
        socket.emit('proof_generation_failed', {
          session_id: sessionId,
          error_code: errorCode ?? 'VERIFICATION_FAILED',
          reason: reason ?? 'verification_failed',
        });
      }
    },
    reportDismissWithoutResult(): void {
      if (reported) return;
      reported = true;
      socket.emit('proof_generation_failed', {
        session_id: sessionId,
        error_code: 'USER_CANCELLED',
        reason: 'user_cancel',
      });
    },
    close(): void {
      setTimeout(() => socket.disconnect(), 500);
    },
  };
}
