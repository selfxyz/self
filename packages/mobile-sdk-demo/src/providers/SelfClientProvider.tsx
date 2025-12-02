// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { sha256 } from '@noble/hashes/sha256';
import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';

import {
  SelfClientProvider as SdkSelfClientProvider,
  createListenersMap,
  SdkEvents,
  type Adapters,
  type RouteName,
  type TrackEventParams,
  type WsConn,
  reactNativeScannerAdapter,
} from '@selfxyz/mobile-sdk-alpha';

import { persistentDocumentsAdapter } from '../utils/documentStore';
import { getOrCreateSecret } from '../utils/secureStorage';
import type { ScreenName } from '../navigation/NavigationProvider';
import { useNavigation } from '../navigation/NavigationProvider';

/**
 * Maps SDK RouteName values to demo app ScreenName values.
 * Routes not in this map are not supported in the demo app.
 */
const ROUTE_TO_SCREEN_MAP: Partial<Record<RouteName, ScreenName>> = {
  Home: 'Home',
  CountryPicker: 'CountrySelection',
  IDPicker: 'IDSelection',
  DocumentCamera: 'MRZ',
  DocumentNFCScan: 'NFC',
  ManageDocuments: 'Documents',
  AccountVerifiedSuccess: 'Success',
  // Routes not implemented in demo app:
  // 'DocumentOnboarding': null,
  // 'SaveRecoveryPhrase': null,
  // 'AccountRecoveryChoice': null,
  // 'ComingSoon': null,
  // 'DocumentDataNotFound': null,
  // 'Settings': null,
} as const;

/**
 * Translates SDK RouteName to demo app ScreenName.
 *
 * @param routeName - The route name from the SDK
 * @returns The corresponding demo app screen name, or null if not supported
 */
function translateRouteToScreen(routeName: RouteName): ScreenName | null {
  return ROUTE_TO_SCREEN_MAP[routeName] ?? null;
}

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

type SelfClientProviderProps = PropsWithChildren<{
  onNavigate?: (screen: string) => void;
}>;

export function SelfClientProvider({ children, onNavigate }: SelfClientProviderProps) {
  const config = useMemo(() => ({}), []);
  const navigation = useNavigation();

  const adapters: Adapters = useMemo(
    () => ({
      scanner: reactNativeScannerAdapter,
      network: {
        http: {
          fetch: createFetch(),
        },
        ws: createWsAdapter(),
      },
      navigation: {
        goBack: () => {
          navigation.goBack();
        },
        goTo: (routeName, params) => {
          const screenName = translateRouteToScreen(routeName);
          if (screenName) {
            // SDK passes generic Record<string, unknown>, but demo navigation expects specific types
            // This is safe because we control the route mapping
            navigation.navigate(screenName, params as any);
          } else {
            console.warn(
              `[SelfClientProvider] SDK route "${routeName}" is not mapped to a demo screen. Ignoring navigation request.`,
            );
          }
        },
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

    // Auto-navigate from MRZ scan to NFC scan
    addListener(SdkEvents.DOCUMENT_MRZ_READ_SUCCESS, () => {
      onNavigate?.('nfc');
    });

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

    addListener(SdkEvents.DOCUMENT_NFC_SCAN_SUCCESS, () => {
      onNavigate?.('success');
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
