// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NetworkAdapter, WsConn } from '../../types/public';

/**
 * Creates a {@link NetworkAdapter} backed by the platform's native `fetch` and
 * `WebSocket` globals. Works in any browser, WebView, or React Native context
 * where those globals are available.
 */
export function createWebNetworkAdapter(): NetworkAdapter {
  return {
    http: {
      fetch: (input: RequestInfo, init?: RequestInit) => fetch(input, init),
    },
    ws: {
      connect: (url: string): WsConn => {
        const socket = new WebSocket(url);
        return {
          send: (data: string | ArrayBufferView | ArrayBuffer) => socket.send(data),
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
