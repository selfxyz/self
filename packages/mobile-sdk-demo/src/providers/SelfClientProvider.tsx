// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { sha256 } from '@noble/hashes/sha256';
import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';

import {
  SelfClientProvider as SdkSelfClientProvider,
  createListenersMap,
  type Adapters,
  type TrackEventParams,
  type WsConn,
  webScannerShim,
} from '@selfxyz/mobile-sdk-alpha';

import { persistentDocumentsAdapter } from '../utils/documentStore';
import { getOrCreateSecret } from '../utils/secureStorage';

const createFetch = () => {
  const fetchImpl = globalThis.fetch;
  if (!fetchImpl) {
    return async () => {
      throw new Error('Fetch is not available in this environment. Provide a fetch polyfill.');
    };
  }

  return (input: RequestInfo | URL, init?: RequestInit) => fetchImpl(input, init);
};

const createWsAdapter = () => ({
  connect: (_url: string): WsConn => {
    return {
      send: () => {
        throw new Error('WebSocket send is not implemented in the demo environment.');
      },
      close: () => {},
      onMessage: () => {},
      onError: () => {},
      onClose: () => {},
    };
  },
});

const hash = (data: Uint8Array): Uint8Array => sha256(data);

export function SelfClientProvider({ children }: PropsWithChildren) {
  const config = useMemo(() => ({}), []);

  const adapters: Adapters = useMemo(
    () => ({
      scanner: webScannerShim,
      network: {
        http: {
          fetch: createFetch(),
        },
        ws: createWsAdapter(),
      },
      documents: persistentDocumentsAdapter,
      crypto: {
        async hash(data: Uint8Array): Promise<Uint8Array> {
          return hash(data);
        },
        async sign(_data: Uint8Array, _keyRef: string): Promise<Uint8Array> {
          throw new Error('Signing is not supported in the demo client.');
        },
      },
      analytics: {
        trackEvent: (_event: string, _payload?: TrackEventParams) => {
          // No-op analytics for the demo application
        },
      },
      auth: {
        async getPrivateKey(): Promise<string | null> {
          try {
            return await getOrCreateSecret();
          } catch (error) {
            console.error('Failed to get/create secret:', error);
            return null;
          }
        },
      },
    }),
    [],
  );

  const listeners = useMemo(() => {
    const { map } = createListenersMap();
    return map;
  }, []);

  return (
    <SdkSelfClientProvider config={config} adapters={adapters} listeners={listeners}>
      {children}
    </SdkSelfClientProvider>
  );
}

export default SelfClientProvider;
