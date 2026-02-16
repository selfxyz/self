// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type RouteName =
  | 'DocumentCamera'
  | 'DocumentOnboarding'
  | 'CountryPicker'
  | 'IDPicker'
  | 'DocumentNFCScan'
  | 'ManageDocuments'
  | 'Home'
  | 'AccountVerifiedSuccess'
  | 'AccountRecoveryChoice'
  | 'SaveRecoveryPhrase'
  | 'ComingSoon'
  | 'DocumentDataNotFound'
  | 'Settings';

const routeMap: Record<RouteName, string> = {
  DocumentCamera: '/onboarding/camera',
  DocumentOnboarding: '/onboarding',
  CountryPicker: '/onboarding/country',
  IDPicker: '/onboarding/id-type',
  DocumentNFCScan: '/onboarding/nfc',
  ManageDocuments: '/documents',
  Home: '/',
  AccountVerifiedSuccess: '/account/verified',
  AccountRecoveryChoice: '/account/recovery',
  SaveRecoveryPhrase: '/account/recovery/phrase',
  ComingSoon: '/coming-soon',
  DocumentDataNotFound: '/error/no-data',
  Settings: '/settings',
};

export interface BridgeNavigationAdapter {
  goBack(): void;
  goTo(routeName: RouteName, params?: Record<string, unknown>): void;
}

export function webNavigationAdapter(
  navigate: (path: string) => void,
  goBack: () => void,
): BridgeNavigationAdapter {
  return {
    goBack,
    goTo(routeName: RouteName, _params?: Record<string, unknown>): void {
      const path = routeMap[routeName];
      if (!path) {
        console.warn(`[Navigation] Unknown route: ${routeName}`);
        return;
      }
      navigate(path);
    },
  };
}
