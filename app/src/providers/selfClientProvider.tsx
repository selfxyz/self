// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { type PropsWithChildren, useMemo } from 'react';

import {
  SelfClientProvider as SDKSelfClientProvider,
  webScannerShim,
  type WsConn,
} from '@selfxyz/mobile-sdk-alpha';

/**
 * Provides a configured Self SDK client instance to all descendants.
 *
 * Adapters:
 * - `webScannerShim` for basic MRZ/QR scanning stubs
 * - `fetch`/`WebSocket` for network communication
 * - Web Crypto hashing with a stub signer
 */
export const SelfClientProvider = ({ children }: PropsWithChildren) => {
  const config = useMemo(() => ({}), []);
  const adapters = useMemo(
    () => ({
      scanner: webScannerShim,
      network: {
        http: {
          fetch: (input: RequestInfo, init?: RequestInit) => fetch(input, init),
        },
        ws: {
          connect: (url: string): WsConn => {
            const socket = new WebSocket(url);
            return {
              send: (data: string | ArrayBufferView | ArrayBuffer) =>
                socket.send(data),
              close: () => socket.close(),
              onMessage: cb => {
                socket.addEventListener('message', ev =>
                  cb((ev as MessageEvent).data),
                );
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
      },
      crypto: {
        async hash(
          data: Uint8Array,
          algo: 'sha256' = 'sha256',
        ): Promise<Uint8Array> {
          const subtle = (globalThis as any)?.crypto?.subtle;
          if (!subtle?.digest) {
            throw new Error(
              'WebCrypto subtle.digest is not available; provide a crypto adapter/polyfill for React Native.',
            );
          }
          // Convert algorithm name to WebCrypto format
          const webCryptoAlgo = algo === 'sha256' ? 'SHA-256' : algo;
          const buf = await subtle.digest(webCryptoAlgo, data as BufferSource);
          return new Uint8Array(buf);
        },
        async sign(_data: Uint8Array, _keyRef: string): Promise<Uint8Array> {
          throw new Error(
            `crypto.sign adapter not implemented for keyRef: ${_keyRef}`,
          );
        },
      },
    }),
    [],
  );

  return (
    <SDKSelfClientProvider config={config} adapters={adapters}>
      {children}
    </SDKSelfClientProvider>
  );
};

export default SelfClientProvider;
