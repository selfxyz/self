/**
 * WebView-internal navigation adapter.
 *
 * Navigation stays entirely within the WebView using React Router.
 * No bridge round-trip needed — this adapter calls the router directly.
 */

/** Route names matching the SDK's RouteName type. */
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

/** Mirrors NavigationAdapter from mobile-sdk-alpha */
export interface NavigationAdapter {
  goBack(): void;
  goTo(routeName: RouteName, params?: Record<string, unknown>): void;
  enableKeychainErrorModal?(): void;
  disableKeychainErrorModal?(): void;
}

/** Route name to URL path mapping. */
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

/**
 * Creates a navigation adapter that uses the provided navigate function
 * (from React Router or similar) for WebView-internal navigation.
 */
export function webNavigationAdapter(
  navigate: (path: string, state?: Record<string, unknown>) => void,
  goBack: () => void,
): NavigationAdapter {
  return {
    goBack,
    goTo(routeName: RouteName, params?: Record<string, unknown>): void {
      const path = routeMap[routeName] ?? '/';
      navigate(path, params);
    },
  };
}
