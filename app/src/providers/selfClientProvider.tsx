// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { Platform } from 'react-native';

import {
  type Adapters,
  createListenersMap,
  impactLight,
  type LogLevel,
  type NFCScanContext,
  reactNativeScannerAdapter,
  SdkEvents,
  SelfClientProvider as SDKSelfClientProvider,
  type TrackEventParams,
  webNFCScannerShim,
  type WsConn,
} from '@selfxyz/mobile-sdk-alpha';

import { logNFCEvent, logProofEvent } from '@/config/sentry';
import type { RootStackParamList } from '@/navigation';
import { navigationRef } from '@/navigation';
import {
  setKeychainCryptoFailureCallback,
  unsafe_getPrivateKey,
} from '@/providers/authProvider';
import {
  selfClientDocumentsAdapter,
  setPassportKeychainErrorCallback,
} from '@/providers/passportDataProvider';
import { trackEvent, trackNfcEvent } from '@/services/analytics';
import { useSettingStore } from '@/stores/settingStore';
import {
  registerModalCallbacks,
  unregisterModalCallbacks,
} from '@/utils/modalCallbackRegistry';

type GlobalCrypto = { crypto?: { subtle?: Crypto['subtle'] } };
/**
 * Provides a configured Self SDK client instance to all descendants.
 *
 * Adapters:
 * - `webNFCScannerShim` for basic NFC scanning stubs on web
 * - `fetch`/`WebSocket` for network communication
 * - Web Crypto hashing with a stub signer
 */
function navigateIfReady<RouteName extends keyof RootStackParamList>(
  route: RouteName,
  ...args: undefined extends RootStackParamList[RouteName]
    ? [params?: RootStackParamList[RouteName]]
    : [params: RootStackParamList[RouteName]]
): void {
  if (navigationRef.isReady()) {
    const params = args[0];
    if (params !== undefined) {
      (navigationRef.navigate as (r: RouteName, p: typeof params) => void)(
        route,
        params,
      );
    } else {
      navigationRef.navigate(route as never);
    }
  }
}

export const SelfClientProvider = ({ children }: PropsWithChildren) => {
  const config = useMemo(() => ({}), []);
  const adapters: Adapters = useMemo(
    () => ({
      scanner:
        Platform.OS === 'web' ? webNFCScannerShim : reactNativeScannerAdapter,
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
      navigation: {
        goBack: () => {
          if (navigationRef.isReady()) {
            navigationRef.goBack();
          }
        },
        goTo: (routeName, params) => {
          if (navigationRef.isReady()) {
            if (params !== undefined) {
              // @ts-expect-error
              navigationRef.navigate(routeName, params);
            } else {
              navigationRef.navigate(routeName as never);
            }
          }
        },
        enableKeychainErrorModal,
        disableKeychainErrorModal,
      },
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
          trackEvent(event, data);
        },
        trackNfcEvent: (name: string, data?: Record<string, unknown>) => {
          trackNfcEvent(name, data);
        },
        logNFCEvent: (
          level: LogLevel,
          message: string,
          context: NFCScanContext,
          details?: Record<string, unknown>,
        ) => {
          logNFCEvent(level, message, context, details);
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
          navigationRef.navigate({
            name: 'AccountVerifiedSuccess',
            params: undefined,
          });
        }
      }, 1000);
    });

    addListener(
      SdkEvents.PROVING_REGISTER_ERROR_OR_FAILURE,
      async ({ hasValidDocument: _hasValidDocument }) => {
        setTimeout(() => {
          if (navigationRef.isReady()) {
            navigationRef.navigate({ name: 'Home', params: {} });
          }
        }, 3000);
      },
    );

    addListener(
      SdkEvents.PROVING_PASSPORT_NOT_SUPPORTED,
      ({
        countryCode,
        documentCategory,
      }: {
        countryCode: string | null;
        documentCategory: string | null;
      }) => {
        navigateIfReady('ComingSoon', {
          countryCode: countryCode ?? undefined,
          documentCategory: documentCategory ?? undefined,
        });
      },
    );

    addListener(SdkEvents.PROVING_ACCOUNT_RECOVERY_REQUIRED, () => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('AccountRecoveryChoice');
      }
    });

    addListener(
      SdkEvents.PROVING_BEGIN_GENERATION,
      async ({ uuid, isMock, context }) => {
        const { fcmToken } = useSettingStore.getState();

        if (fcmToken) {
          try {
            trackEvent('DEVICE_TOKEN_REG_STARTED');
            logProofEvent('info', 'Device token registration started', context);

            const { registerDeviceToken: registerFirebaseDeviceToken } =
              await import('@/services/notifications/notificationService');
            await registerFirebaseDeviceToken(uuid, fcmToken, isMock);

            trackEvent('DEVICE_TOKEN_REG_SUCCESS');
            logProofEvent('info', 'Device token registration success', context);
          } catch (error) {
            logProofEvent('warn', 'Device token registration failed', context, {
              error: error instanceof Error ? error.message : String(error),
            });
            console.error('Error registering device token:', error);
            trackEvent('DEVICE_TOKEN_REG_FAILED', {
              message: error instanceof Error ? error.message : String(error),
            });
          }
        }
      },
    );

    addListener(SdkEvents.PROOF_EVENT, ({ level, context, event, details }) => {
      // Log proof events for monitoring/debugging
      logProofEvent(level, event, context, details);
    });

    addListener(SdkEvents.NFC_EVENT, ({ level, context, event, details }) => {
      // Log nfc events for monitoring/debugging
      logNFCEvent(level, event, context, details);
    });

    addListener(SdkEvents.DOCUMENT_MRZ_READ_SUCCESS, () => {
      navigateIfReady('DocumentNFCScan');
    });

    addListener(SdkEvents.DOCUMENT_MRZ_READ_FAILURE, () => {
      navigateIfReady('DocumentCameraTrouble');
    });

    addListener(SdkEvents.PROVING_AADHAAR_UPLOAD_SUCCESS, () => {
      navigateIfReady('AadhaarUploadSuccess');
    });
    addListener(SdkEvents.PROVING_AADHAAR_UPLOAD_FAILURE, ({ errorType }) => {
      navigateIfReady('AadhaarUploadError', { errorType });
    });

    addListener(
      SdkEvents.DOCUMENT_COUNTRY_SELECTED,
      ({
        countryCode,
        documentTypes,
      }: {
        countryCode: string;
        documentTypes: string[];
      }) => {
        navigateIfReady('IDPicker', { countryCode, documentTypes });
      },
    );
    addListener(
      SdkEvents.DOCUMENT_TYPE_SELECTED,
      ({ documentType, countryCode }) => {
        if (navigationRef.isReady()) {
          switch (documentType) {
            case 'p':
              navigationRef.navigate('DocumentOnboarding');
              break;
            case 'i':
              navigationRef.navigate('DocumentOnboarding');
              break;
            case 'a':
              if (countryCode) {
                navigationRef.navigate('AadhaarUpload', { countryCode });
              }
              break;
            default:
              if (countryCode) {
                navigationRef.navigate('ComingSoon', { countryCode });
              }
              break;
          }
        }
      },
    );

    addListener(
      SdkEvents.DOCUMENT_OWNERSHIP_CONFIRMED,
      ({ documentCategory, signatureAlgorithm, curveOrExponent }) => {
        impactLight();
        navigateIfReady('Loading', {
          documentCategory,
          signatureAlgorithm,
          curveOrExponent,
        });
      },
    );

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

export function disableKeychainErrorModal() {
  setKeychainCryptoFailureCallback(null);
  setPassportKeychainErrorCallback(null);
}

// Functions to enable/disable keychain error modals
// These should be called by the provingMachine when entering/exiting proving flows
export function enableKeychainErrorModal() {
  setKeychainCryptoFailureCallback(showKeychainErrorModal);
  setPassportKeychainErrorCallback(showKeychainErrorModal);
}

export function showKeychainErrorModal(
  errorType: 'user_cancelled' | 'crypto_failed',
) {
  if (Platform.OS !== 'android') return;
  if (!navigationRef.isReady()) return;

  const errorContent = {
    user_cancelled: {
      titleText: 'Authentication Required',
      bodyText:
        'You need to authenticate with your fingerprint, PIN or faceID to continue the verification process. Please try again.',
      buttonText: 'Try Again',
    },
    crypto_failed: {
      titleText: 'Keychain Error',
      bodyText:
        'Unable to access your keychain. This may happen if your device security settings have changed or if the encrypted data was corrupted. Please contact support if the issue persists.',
      buttonText: 'Go to Home',
    },
  };

  const content = errorContent[errorType];

  const callbackId = registerModalCallbacks({
    onButtonPress: () => {
      unregisterModalCallbacks(callbackId);
      navigationRef.navigate({ name: 'Home', params: {} });
    },
    onModalDismiss: () => {
      unregisterModalCallbacks(callbackId);
      navigationRef.navigate({ name: 'Home', params: {} });
    },
  });

  navigationRef.navigate('Modal', {
    ...content,
    callbackId,
  });
}

export default SelfClientProvider;
