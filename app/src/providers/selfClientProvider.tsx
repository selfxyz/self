// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { type PropsWithChildren, useMemo } from 'react';
import { Platform } from 'react-native';

import {
  Adapters,
  createListenersMap,
  reactNativeScannerAdapter,
  SdkEvents,
  SelfClientProvider as SDKSelfClientProvider,
  type TrackEventParams,
  webScannerShim,
  type WsConn,
} from '@selfxyz/mobile-sdk-alpha';

import { navigationRef } from '@/navigation';
import { unsafe_getPrivateKey } from '@/providers/authProvider';
import { selfClientDocumentsAdapter } from '@/providers/passportDataProvider';
import analytics from '@/utils/analytics';

type GlobalCrypto = { crypto?: { subtle?: Crypto['subtle'] } };

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
  const adapters: Adapters = useMemo(
    () => ({
      scanner:
        Platform.OS === 'web' ? webScannerShim : reactNativeScannerAdapter,
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
      documents: selfClientDocumentsAdapter,
      crypto: {
        async hash(
          data: Uint8Array,
          algo: 'sha256' = 'sha256',
        ): Promise<Uint8Array> {
          const subtle = (globalThis as GlobalCrypto)?.crypto?.subtle;
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
      analytics: {
        trackEvent: (event: string, data?: TrackEventParams) => {
          analytics().trackEvent(event, data);
        },
      },
      auth: {
        getPrivateKey: () => unsafe_getPrivateKey(),
      },
    }),
    [],
  );

  const appListeners = useMemo(() => {
    const { map, addListener } = createListenersMap();

    addListener(SdkEvents.PROVING_PASSPORT_DATA_NOT_FOUND, () => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('DocumentDataNotFound');
      }
    });

    addListener(SdkEvents.PROVING_ACCOUNT_VERIFIED_SUCCESS, () => {
      setTimeout(() => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('AccountVerifiedSuccess');
        }
      }, 3000);
    });

    addListener(
      SdkEvents.PROVING_REGISTER_ERROR_OR_FAILURE,
      async ({ hasValidDocument }) => {
        setTimeout(() => {
          if (navigationRef.isReady()) {
            if (hasValidDocument) {
              navigationRef.navigate('Home');
            } else {
              navigationRef.navigate('Launch');
            }
          }
        }, 3000);
      },
    );

    addListener(
      SdkEvents.PROVING_PASSPORT_NOT_SUPPORTED,
      ({ countryCode, documentCategory }) => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('UnsupportedDocument', {
            countryCode,
            documentCategory,
          } as any);
        }
      },
    );

    addListener(SdkEvents.PROVING_ACCOUNT_RECOVERY_REQUIRED, () => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('AccountRecoveryChoice');
      }
    });

    return map;
  }, []);

  return (
    <SDKSelfClientProvider
      config={config}
      adapters={adapters}
      listeners={appListeners}
    >
      {children}
    </SDKSelfClientProvider>
  );
};

export default SelfClientProvider;
