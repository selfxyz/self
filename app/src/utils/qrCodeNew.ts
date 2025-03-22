import { Linking } from 'react-native';

import queryString from 'query-string';

import { SelfApp } from '../../../common/src/utils/appType';

/**
 * Decodes a URL-encoded string.
 * @param {string} encodedUrl
 * @returns {string}
 */
const decodeUrl = (encodedUrl: string): string => {
  try {
    return decodeURIComponent(encodedUrl);
  } catch (error) {
    console.error('Error decoding URL:', error);
    return encodedUrl;
  }
};

const handleQRCodeData = (
  uri: string,
  setApp: (app: SelfApp) => void,
  cleanSelfApp: () => void,
  startAppListener: (sessionId: string, setApp: (app: SelfApp) => void) => void,
  onNavigationNeeded?: () => void,
  onErrorCallback?: () => void,
) => {
  const decodedUri = decodeUrl(uri);
  const encodedData = queryString.parseUrl(decodedUri).query;
  const sessionId = encodedData.sessionId;
  const selfAppStr = encodedData.selfApp as string | undefined;

  if (selfAppStr) {
    try {
      const selfAppJson = JSON.parse(selfAppStr);
      setApp(selfAppJson);

      if (onNavigationNeeded) {
        setTimeout(() => {
          onNavigationNeeded();
        }, 100);
      }
      return;
    } catch (error) {
      console.error('Error parsing selfApp:', error);
      if (onErrorCallback) {
        onErrorCallback();
      }
    }
  }

  if (sessionId && typeof sessionId === 'string') {
    cleanSelfApp();
    startAppListener(sessionId, setApp);

    if (onNavigationNeeded) {
      setTimeout(() => {
        onNavigationNeeded();
      }, 100);
    }
  } else {
    console.error('No sessionId or selfApp found in the data');
    if (onErrorCallback) {
      onErrorCallback();
    }
  }
};

export const setupUniversalLinkListener = (
  setApp: (app: SelfApp) => void,
  cleanSelfApp: () => void,
  startAppListener: (sessionId: string, setApp: (app: SelfApp) => void) => void,
  onNavigationNeeded?: () => void,
  onErrorCallback?: () => void,
) => {
  Linking.getInitialURL().then(url => {
    if (url) {
      handleQRCodeData(
        url,
        setApp,
        cleanSelfApp,
        startAppListener,
        onNavigationNeeded,
        onErrorCallback,
      );
    }
  });

  const linkingEventListener = Linking.addEventListener('url', ({ url }) => {
    handleQRCodeData(
      url,
      setApp,
      cleanSelfApp,
      startAppListener,
      onNavigationNeeded,
      onErrorCallback,
    );
  });

  return () => {
    linkingEventListener.remove();
  };
};
