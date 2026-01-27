// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { parseUrl } from 'query-string';
import { Linking, Platform } from 'react-native';

import { countries } from '@selfxyz/common/constants/countries';
import type { IdDocInput } from '@selfxyz/common/utils';
import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';

import type { RootStackParamList } from '@/navigation';
import { navigationRef } from '@/navigation';
import useUserStore from '@/stores/userStore';
import { IS_DEV_MODE } from '@/utils/devUtils';

// Validation patterns for each expected parameter
const VALIDATION_PATTERNS = {
  sessionId: /^[a-zA-Z0-9_-]+$/,
  selfApp: /^[\s\S]*$/, // JSON strings can contain any characters, we'll validate JSON parsing separately
  mock_passport: /^[\s\S]*$/, // JSON strings can contain any characters, we'll validate JSON parsing separately
  code: /^[a-zA-Z0-9._/-]+$/, // OAuth authorization code (may include forward slashes)
  state: /^[a-zA-Z0-9._-]+$/, // OAuth state parameter for CSRF protection
  id_token: /^[\w\-.]+$/, // JWT token format (base64url encoded segments)
  scope: /^[\w\s%:/.=&+*-]+$/, // OAuth scopes (can include spaces, encoded chars, and URL-encoded content)
  scheme: /^https?$/, // Redirect scheme (http or https)
  referrer: /^0x[a-fA-F0-9]+$/,
} as const;

type ValidatedParams = {
  sessionId?: string;
  selfApp?: string;
  mock_passport?: string;
  code?: string;
  state?: string;
  id_token?: string;
  scope?: string;
  scheme?: string;
  referrer?: string;
};

// Define proper types for the mock data structure
type MockDataDeepLinkRawParams = {
  name?: string;
  surname?: string;
  nationality?: string;
  birth_date?: string;
  gender?: string;
};

/**
 * Validates and sanitizes a query parameter value
 * @param key - The parameter key
 * @param value - The parameter value to validate
 * @returns The sanitized value or undefined if invalid
 */
const validateAndSanitizeParam = (
  key: string,
  value: string,
): string | undefined => {
  if (!value) return undefined;

  // Decode the value first
  let decodedValue: string;
  try {
    decodedValue = decodeURIComponent(value);
  } catch (error) {
    if (IS_DEV_MODE) {
      console.error(`Error decoding parameter ${key}:`, error);
    }
    return undefined;
  }

  // Validate against pattern if we have one for this key
  if (key in VALIDATION_PATTERNS) {
    const pattern =
      VALIDATION_PATTERNS[key as keyof typeof VALIDATION_PATTERNS];
    if (!pattern.test(decodedValue)) {
      if (IS_DEV_MODE) {
        console.error(`Parameter ${key} failed validation:`, decodedValue);
      }
      return undefined;
    }
  }

  return decodedValue;
};

/**
 * Creates a proper navigation stack for deeplink navigation
 * @param targetScreen - The target screen to navigate to
 * @param parentScreen - The parent screen that should appear when user goes back (default: 'Home')
 */
const createDeeplinkNavigationState = (
  targetScreen: string,
  parentScreen: string = 'Home',
) => ({
  index: 1, // Current screen index (targetScreen)
  routes: [{ name: parentScreen }, { name: targetScreen }],
});

// Store the correct parent screen determined by splash screen
let correctParentScreen: string = 'Home';

// Function for splash screen to get and clear the queued initial URL
export const getAndClearQueuedUrl = (): string | null => {
  const url = queuedInitialUrl;
  queuedInitialUrl = null;
  return url;
};

const safeNavigate = (
  navigationState: ReturnType<typeof createDeeplinkNavigationState>,
): void => {
  const targetScreen = navigationState.routes[1]?.name as
    | keyof RootStackParamList
    | undefined;

  const currentRoute = navigationRef.getCurrentRoute();
  const isColdLaunch = currentRoute?.name === 'Splash';

  if (!isColdLaunch && targetScreen) {
    // Use object syntax to satisfy TypeScript's strict typing for navigate
    // The params will be undefined for screens that don't require them
    navigationRef.navigate({
      name: targetScreen,
      params: undefined,
    } as Parameters<typeof navigationRef.navigate>[0]);
  } else {
    navigationRef.reset(navigationState);
  }
};

export const handleUrl = (selfClient: SelfClient, uri: string) => {
  const validatedParams = parseAndValidateUrlParams(uri);
  const {
    sessionId,
    selfApp: selfAppStr,
    mock_passport,
    code,
    id_token,
    referrer,
  } = validatedParams;

  if (selfAppStr) {
    try {
      const selfAppJson = JSON.parse(selfAppStr);
      selfClient.getSelfAppState().setSelfApp(selfAppJson);
      selfClient.getSelfAppState().startAppListener(selfAppJson.sessionId);

      safeNavigate(
        createDeeplinkNavigationState(
          'ProvingScreenRouter',
          correctParentScreen,
        ),
      );

      return;
    } catch (error) {
      if (IS_DEV_MODE) {
        console.error('Error parsing selfApp:', error);
      }
      safeNavigate(
        createDeeplinkNavigationState('QRCodeTrouble', correctParentScreen),
      );
    }
  } else if (sessionId && typeof sessionId === 'string') {
    selfClient.getSelfAppState().cleanSelfApp();
    selfClient.getSelfAppState().startAppListener(sessionId);

    safeNavigate(
      createDeeplinkNavigationState('ProvingScreenRouter', correctParentScreen),
    );
  } else if (mock_passport) {
    try {
      const data = JSON.parse(mock_passport);
      const rawParams = data as MockDataDeepLinkRawParams;

      // Validate nationality is a valid country code
      const isValidCountryCode = (
        nationalityCode: string | undefined,
      ): nationalityCode is IdDocInput['nationality'] => {
        if (!nationalityCode) return false;
        // Check if the code exists as a value in the countries object
        return Object.values(countries).some(
          countryCode => countryCode === nationalityCode,
        );
      };

      useUserStore.getState().setDeepLinkUserDetails({
        name: rawParams.name,
        surname: rawParams.surname,
        nationality: isValidCountryCode(rawParams.nationality)
          ? rawParams.nationality
          : undefined,
        birthDate: rawParams.birth_date,
        gender: rawParams.gender,
      });

      // Reset navigation stack with correct parent -> MockDataDeepLink
      safeNavigate(
        createDeeplinkNavigationState('MockDataDeepLink', correctParentScreen),
      );
    } catch (error) {
      if (IS_DEV_MODE) {
        console.error('Error parsing mock_passport data or navigating:', error);
      }
      safeNavigate(
        createDeeplinkNavigationState('QRCodeTrouble', correctParentScreen),
      );
    }
  } else if (referrer && typeof referrer === 'string') {
    useUserStore.getState().setDeepLinkReferrer(referrer);

    const currentRoute = navigationRef.getCurrentRoute();
    if (currentRoute?.name === 'Home') {
      // Already on Home, no navigation needed - the modal will show automatically
    } else {
      safeNavigate(createDeeplinkNavigationState('Home', 'Home'));
    }
  } else if (Platform.OS === 'web') {
    // TODO: web handle links if we need to idk if we do
    // For web, we can handle the URL some other way if we dont do this loading app in web always navigates to QRCodeTrouble
  } else if (code || id_token) {
    // Handle Turnkey OAuth redirect
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(
        '[Deeplinks] Turnkey OAuth redirect received with valid parameters',
      );
    }
    return;
  } else {
    if (IS_DEV_MODE) {
      console.error(
        'No sessionId, selfApp or valid OAuth parameters found in the data',
      );
    }
    safeNavigate(
      createDeeplinkNavigationState('QRCodeTrouble', correctParentScreen),
    );
  }
};

/**
 * Parses and validates query parameters from a URL
 * @param uri - The URL to parse
 * @returns Validated and sanitized parameters
 */
export const parseAndValidateUrlParams = (uri: string): ValidatedParams => {
  // Parse the URL directly without pre-decoding to avoid issues with fragment separators
  const parsed = parseUrl(uri);
  const query = parsed.query || {};

  if (uri.includes('#')) {
    const fragmentString = uri.split('#')[1];
    if (fragmentString) {
      try {
        const fragmentParams = new URLSearchParams(fragmentString);
        for (const [key, value] of fragmentParams.entries()) {
          query[key] = value;
        }
      } catch (error) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.error('Error parsing fragment parameters:', error);
        }
      }
    }
  }

  const validatedParams: ValidatedParams = {};

  // Only process expected parameters and validate them
  for (const [key, value] of Object.entries(query)) {
    if (key in VALIDATION_PATTERNS && typeof value === 'string') {
      const sanitizedValue = validateAndSanitizeParam(key, value);
      if (sanitizedValue !== undefined) {
        validatedParams[key as keyof ValidatedParams] = sanitizedValue;
      }
    } else if (IS_DEV_MODE) {
      // Log unexpected parameters in development
      console.warn(`Unexpected or invalid parameter ignored: ${key}`);
    }
  }

  return validatedParams;
};

// Store the initial URL for splash screen to handle after initialization
let queuedInitialUrl: string | null = null;

/**
 * Sets the correct parent screen for deeplink navigation
 * This should be called by splash screen after determining the correct screen
 */
export const setDeeplinkParentScreen = (screen: string) => {
  correctParentScreen = screen;
};

export const setupUniversalLinkListenerInNavigation = (
  selfClient: SelfClient,
) => {
  // Get the initial URL and store it for splash screen handling
  Linking.getInitialURL().then(url => {
    if (url) {
      // Check if it's an OAuth callback - if so, don't queue it, let Turnkey handle it
      // const validatedParams = parseAndValidateUrlParams(url);
      // if (!validatedParams.code && !validatedParams.id_token) {
      //   console.log(
      //     'not an OAuth callback, storing for splash screen handling',
      //   );
      // Not an OAuth callback, store for splash screen handling
      queuedInitialUrl = url;
      // }
    }
  });
  // Handle subsequent URL events normally (when app is already running)
  const linkingEventListener = Linking.addEventListener('url', ({ url }) => {
    // Check if this is an OAuth callback
    // const validatedParams = parseAndValidateUrlParams(url);
    // // console.log('validatedParams', validatedParams);
    // if (validatedParams.code || validatedParams.id_token) {
    //   // This is an OAuth callback - don't handle it, let Turnkey SDK handle it
    //   if (typeof __DEV__ !== 'undefined' && __DEV__) {
    //     console.log(
    //       '[Deeplinks] OAuth callback detected - letting Turnkey SDK handle it',
    //     );
    //   }
    //   return; // Don't call handleUrl for OAuth callbacks
    // }
    // For non-OAuth URLs, handle normally
    handleUrl(selfClient, url);
  });
  return () => {
    linkingEventListener.remove();
  };
};
