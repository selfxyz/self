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
  webNFCScannerShim,
  SdkEvents,
} from '@selfxyz/mobile-sdk-alpha';

import { persistentDocumentsAdapter } from '../utils/documentStore';
import { getOrCreateSecret } from '../utils/secureStorage';
import { useNavigation } from '../navigation/NavigationProvider';

const createFetch = () => {
  const fetchImpl = globalThis.fetch;
  if (!fetchImpl) {
    return async () => {
      throw new Error('Fetch is not available in this environment. Provide a fetch polyfill.');
    };
  }

  return (input: RequestInfo | URL, init?: RequestInit) => fetchImpl(input, init);
};

const createWsAdapter = () => {
  const WebSocketImpl = globalThis.WebSocket;

  if (!WebSocketImpl) {
    return {
      connect: () => {
        throw new Error('WebSocket is not available in this environment. Provide a WebSocket implementation.');
      },
    };
  }

  return {
    connect: (url: string, opts?: { signal?: AbortSignal; headers?: Record<string, string> }): WsConn => {
      const socket = new WebSocketImpl(url);

      let abortHandler: (() => void) | null = null;

      if (opts?.signal) {
        abortHandler = () => {
          socket.close();
        };

        if (typeof opts.signal.addEventListener === 'function') {
          opts.signal.addEventListener('abort', abortHandler, { once: true });
        }
      }

      const attach = (event: 'message' | 'error' | 'close', handler: (payload?: any) => void) => {
        // Clean up abort listener when socket closes
        if (event === 'close' && abortHandler && opts?.signal) {
          const originalHandler = handler;
          handler = (payload?: any) => {
            if (typeof opts.signal!.removeEventListener === 'function') {
              opts.signal!.removeEventListener('abort', abortHandler!);
            }
            originalHandler(payload);
          };
        }

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
        send: (data: string | ArrayBufferView | ArrayBuffer) => socket.send(data),
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
  };
};

const hash = (data: Uint8Array): Uint8Array => sha256(data);

export function SelfClientProvider({ children }: PropsWithChildren) {
  const config = useMemo(() => ({}), []);
  const navigation = useNavigation();

  const adapters: Adapters = useMemo(
    () => ({
      scanner: webNFCScannerShim,
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
            const secret = await getOrCreateSecret();
            // Ensure the secret is 0x-prefixed for components expecting hex strings
            return secret.startsWith('0x') ? secret : `0x${secret}`;
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
    const { map, addListener } = createListenersMap();

    addListener(SdkEvents.DOCUMENT_COUNTRY_SELECTED, event => {
      navigation.navigate('IDSelection', {
        countryCode: event.countryCode,
        countryName: event.countryName,
        documentTypes: event.documentTypes,
      });
    });

    addListener(SdkEvents.DOCUMENT_TYPE_SELECTED, ({ documentType, countryCode }) => {
      switch (documentType) {
        case 'p':
          navigation.navigate('MRZ');
          break;
        case 'i':
          navigation.navigate('MRZ');
          break;
        case 'a':
          if (countryCode) {
            // navigation.navigate('AadhaarUpload', { countryCode });
          }
          break;
        default:
          if (countryCode) {
            // navigation.navigate('ComingSoon', { countryCode });
          }
          break;
      }
    });
    addListener(SdkEvents.DOCUMENT_MRZ_READ_SUCCESS, () => {
      // navigate('DocumentNFCScan');
    });

    return map;
  }, [navigation.navigate]);

  return (
    <SdkSelfClientProvider config={config} adapters={adapters} listeners={listeners}>
      {children}
    </SdkSelfClientProvider>
  );
}

export default SelfClientProvider;
