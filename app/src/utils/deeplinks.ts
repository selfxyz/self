// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { parseUrl } from 'query-string';
import { Linking, Platform } from 'react-native';

import { navigationRef } from '../navigation';
import { useSelfAppStore } from '../stores/selfAppStore';
import useUserStore from '../stores/userStore';

// Validation patterns for each expected parameter
const VALIDATION_PATTERNS = {
  sessionId: /^[a-zA-Z0-9_-]+$/,
  selfApp: /^[\s\S]*$/, // JSON strings can contain any characters, we'll validate JSON parsing separately
  mock_passport: /^[\s\S]*$/, // JSON strings can contain any characters, we'll validate JSON parsing separately
} as const;

type ValidatedParams = {
  sessionId?: string;
  selfApp?: string;
  mock_passport?: string;
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
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.error(`Error decoding parameter ${key}:`, error);
    }
    return undefined;
  }

  // Validate against pattern if we have one for this key
  if (key in VALIDATION_PATTERNS) {
    const pattern =
      VALIDATION_PATTERNS[key as keyof typeof VALIDATION_PATTERNS];
    if (!pattern.test(decodedValue)) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.error(`Parameter ${key} failed validation:`, decodedValue);
      }
      return undefined;
    }
  }

  return decodedValue;
};

export const handleUrl = (uri: string) => {
  const validatedParams = parseAndValidateUrlParams(uri);
  const { sessionId, selfApp: selfAppStr, mock_passport } = validatedParams;

  if (selfAppStr) {
    try {
      const selfAppJson = JSON.parse(selfAppStr);
      useSelfAppStore.getState().setSelfApp(selfAppJson);
      useSelfAppStore.getState().startAppListener(selfAppJson.sessionId);
      navigationRef.navigate('ProveScreen');

      return;
    } catch (error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.error('Error parsing selfApp:', error);
      }
      navigationRef.navigate('QRCodeTrouble');
    }
  } else if (sessionId && typeof sessionId === 'string') {
    useSelfAppStore.getState().cleanSelfApp();
    useSelfAppStore.getState().startAppListener(sessionId);
    navigationRef.navigate('ProveScreen');
  } else if (mock_passport) {
    try {
      const data = JSON.parse(mock_passport);
      type MockDataDeepLinkRawParams = {
        name?: string;
        surname?: string;
        nationality?: string;
        birth_date?: string;
        gender?: string;
      };
      const rawParams = data as MockDataDeepLinkRawParams;

      useUserStore.getState().setDeepLinkUserDetails({
        name: rawParams.name,
        surname: rawParams.surname,
        nationality: rawParams.nationality,
        birthDate: rawParams.birth_date,
        gender: rawParams.gender,
      });

      navigationRef.navigate('MockDataDeepLink');
    } catch (error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.error('Error parsing mock_passport data or navigating:', error);
      }
      navigationRef.navigate('QRCodeTrouble');
    }
  } else if (Platform.OS === 'web') {
    // TODO: web handle links if we need to idk if we do
    // For web, we can handle the URL some other way if we dont do this loading app in web always navigates to QRCodeTrouble
  } else {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.error('No sessionId or selfApp found in the data');
    }
    navigationRef.navigate('QRCodeTrouble');
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

  const validatedParams: ValidatedParams = {};

  // Only process expected parameters and validate them
  for (const [key, value] of Object.entries(query)) {
    if (key in VALIDATION_PATTERNS && typeof value === 'string') {
      const sanitizedValue = validateAndSanitizeParam(key, value);
      if (sanitizedValue !== undefined) {
        validatedParams[key as keyof ValidatedParams] = sanitizedValue;
      }
    } else if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // Log unexpected parameters in development
      console.warn(`Unexpected or invalid parameter ignored: ${key}`);
    }
  }

  return validatedParams;
};

export const setupUniversalLinkListenerInNavigation = () => {
  const handleNavigation = (url: string) => {
    handleUrl(url);
  };

  Linking.getInitialURL().then(url => {
    if (url) {
      handleNavigation(url);
    }
  });

  const linkingEventListener = Linking.addEventListener('url', ({ url }) => {
    handleNavigation(url);
  });

  return () => {
    linkingEventListener.remove();
  };
};
