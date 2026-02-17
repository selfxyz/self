// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NetworkAdapter, WsConn } from '../../types/public';

/**
 * Creates a {@link NetworkAdapter} backed by the global `fetch` and `WebSocket`
 * APIs available in React Native.
 *
 * No configuration is needed — the adapter uses the runtime globals directly.
 */
export function createNetworkAdapter(): NetworkAdapter {
  return {
    http: {
      fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
        const fetchImpl = globalThis.fetch;
        if (!fetchImpl) {
          return Promise.reject(new Error('Fetch is not available in this environment. Provide a fetch polyfill.'));
        }
        return fetchImpl(input, init);
      },
    },
    ws: {
      connect(url: string, opts?: { signal?: AbortSignal; headers?: Record<string, string> }): WsConn {
        const WebSocketImpl = globalThis.WebSocket;
        if (!WebSocketImpl) {
          throw new Error('WebSocket is not available in this environment. Provide a WebSocket implementation.');
        }

        // React Native WebSocket accepts (url, protocols, options, headers)
        const socket = opts?.headers
          ? new (WebSocketImpl as any)(url, undefined, undefined, opts.headers)
          : new WebSocketImpl(url);

        let abortHandler: (() => void) | null = null;

        if (opts?.signal) {
          abortHandler = () => {
            socket.close();
          };

          if (opts.signal.aborted) {
            socket.close();
          } else if (typeof opts.signal.addEventListener === 'function') {
            opts.signal.addEventListener('abort', abortHandler, { once: true });
          }
        }

        // Unconditionally clean up abort listener when socket closes,
        // regardless of whether the caller registers an onClose handler.
        if (abortHandler && opts?.signal) {
          const cleanupAbort = () => {
            if (typeof opts.signal!.removeEventListener === 'function') {
              opts.signal!.removeEventListener('abort', abortHandler!);
            }
          };
          if (typeof socket.addEventListener === 'function') {
            (socket.addEventListener as any)('close', cleanupAbort, { once: true });
          } else {
            const prev = (socket as any).onclose;
            (socket as any).onclose = (e: any) => {
              cleanupAbort();
              if (prev) prev(e);
            };
          }
        }

        const attach = (event: 'message' | 'error' | 'close', handler: (payload?: any) => void) => {
          if (typeof socket.addEventListener === 'function') {
            if (event === 'message') {
              (socket.addEventListener as any)('message', handler as any);
            } else if (event === 'error') {
              (socket.addEventListener as any)('error', handler as any);
            } else {
              (socket.addEventListener as any)('close', handler as any);
            }
          } else {
            if (event === 'message') {
              (socket as any).onmessage = handler;
            } else if (event === 'error') {
              (socket as any).onerror = handler;
            } else {
              (socket as any).onclose = handler;
            }
          }
        };

        return {
          send: (data: string | ArrayBufferView | ArrayBuffer) => {
            if (socket.readyState !== WebSocketImpl.OPEN) {
              throw new Error(
                `Cannot send data — WebSocket is not open (readyState=${socket.readyState}).`,
              );
            }
            socket.send(data);
          },
          close: () => socket.close(),
          onMessage: cb => {
            attach('message', event => {
              // React Native emits { data }, whereas browsers emit MessageEvent.
              const payload = (event as { data?: unknown }).data ?? event;
              cb(payload);
            });
          },
          onError: cb => {
            attach('error', error => cb(error));
          },
          onClose: cb => {
            attach('close', () => cb());
          },
        };
      },
    },
  };
}
