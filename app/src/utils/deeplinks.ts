// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import queryString from 'query-string';
import { Linking, Platform } from 'react-native';

import { navigationRef } from '../navigation';
import { useSelfAppStore } from '../stores/selfAppStore';
import useUserStore from '../stores/userStore';

/**
 * Decodes a URL-encoded string.
 * @param {string} encodedUrl
 * @returns {string}
 */
const decodeUrl = (encodedUrl: string): string => {
  try {
    return decodeURIComponent(encodedUrl);
  } catch (error) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.error('Error decoding URL:', error);
    }
    return encodedUrl;
  }
};

export const handleUrl = (uri: string) => {
  const decodedUri = decodeUrl(uri);
  const encodedData = queryString.parseUrl(decodedUri).query;
  const sessionId = encodedData.sessionId;
  const selfAppStr = encodedData.selfApp as string | undefined;
  const mock_passport = encodedData.mock_passport as string | undefined;

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
