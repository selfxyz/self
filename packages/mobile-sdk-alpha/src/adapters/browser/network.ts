// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NetworkAdapter, WsConn } from '../../types/public';

/**
 * Creates a {@link NetworkAdapter} backed by the platform's global `fetch` and
 * `WebSocket`. Suitable for any environment where these globals are available
 * (browsers, React Native with polyfills, Cloudflare Workers, etc.).
 */
export function createWebNetworkAdapter(): NetworkAdapter {
  return {
    http: {
      fetch: (input: RequestInfo, init?: RequestInit) => fetch(input, init),
    },
    ws: {
      connect: (url: string, opts?: { signal?: AbortSignal; headers?: Record<string, string> }): WsConn => {
        const protocols = opts?.headers ? Object.entries(opts.headers).map(([k, v]) => `${k}.${v}`) : undefined;
        const socket = new WebSocket(url, protocols);

        if (opts?.signal) {
          const onAbort = () => socket.close();
          opts.signal.addEventListener('abort', onAbort, { once: true });
          socket.addEventListener('close', () => opts.signal!.removeEventListener('abort', onAbort), {
            once: true,
          });
        }

        return {
          send: data => socket.send(data),
          close: () => socket.close(),
          onMessage: cb => {
            socket.addEventListener('message', ev => cb((ev as MessageEvent).data));
          },
          onError: cb => {
            socket.addEventListener('error', e => cb(e));
          },
          onClose: cb => {
            socket.addEventListener('close', () => cb());
          },
        };
      },
    },
  };
}
