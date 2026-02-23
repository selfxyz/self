// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';

import {
  SelfClientProvider as SdkSelfClientProvider,
  createListenersMap,
  SdkEvents,
  type RouteName,
} from '@selfxyz/mobile-sdk-alpha';
import { createReactNativeAdapters } from '@selfxyz/mobile-sdk-alpha/adapters/react-native';

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
} as const;

function translateRouteToScreen(routeName: RouteName): ScreenName | null {
  return ROUTE_TO_SCREEN_MAP[routeName] ?? null;
}

type SelfClientProviderProps = PropsWithChildren<{
  onNavigate?: (screen: string) => void;
}>;

export function SelfClientProvider({ children, onNavigate }: SelfClientProviderProps) {
  const config = useMemo(() => ({}), []);
  const navigation = useNavigation();

  const adapters = useMemo(
    () =>
      createReactNativeAdapters({
        navigation: {
          goBack: () => {
            navigation.goBack();
          },
          goTo: (routeName, params) => {
            const screenName = translateRouteToScreen(routeName);
            if (screenName) {
              navigation.navigate(screenName, params as any);
            } else {
              console.warn(
                `[SelfClientProvider] SDK route "${routeName}" is not mapped to a demo screen. Ignoring navigation request.`,
              );
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
