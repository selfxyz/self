import { Linking } from 'react-native';

import { decode } from 'msgpack-lite';
import { inflate } from 'pako';

import { SelfApp } from '../../../common/src/utils/appType';
import { loadPassportData } from '../stores/passportDataProvider';

export default async function handleQRCodeScan(
  result: string,
  setApp: (app: SelfApp) => void,
) {
  try {
    const passportData = await loadPassportData();
    if (passportData) {
      const decodedResult = atob(result);
      const uint8Array = new Uint8Array(
        decodedResult.split('').map(char => char.charCodeAt(0)),
      );
      const decompressedData = inflate(uint8Array);
      const unpackedData = decode(decompressedData);
      const openPassportApp: SelfApp = unpackedData;

      setApp(openPassportApp);
      console.log('✅', {
        message: 'QR code scanned',
        customData: {
          type: 'success',
        },
      });
    } else {
      console.log('Welcome', {
        message: 'Please register your passport first',
        type: 'info',
      });
    }
  } catch (error) {
    console.error('Error parsing QR code result:', error);
    console.log('Try again', {
      message: 'Error reading QR code: ' + (error as Error).message,
      customData: {
        type: 'error',
      },
    });
  }
}

const handleUniversalLink = (url: string, setApp: (app: SelfApp) => void) => {
  const encodedData = new URL(url).searchParams.get('data');
  console.log('Encoded data:', encodedData);
  if (encodedData) {
    handleQRCodeScan(encodedData, setApp);
  } else {
    console.error('No data found in the Universal Link');
  }
};

export const setupUniversalLinkListener = (setApp: (app: SelfApp) => void) => {
  Linking.getInitialURL().then(url => {
    if (url) {
      handleUniversalLink(url, setApp);
    }
  });

  const linkingEventListener = Linking.addEventListener('url', ({ url }) => {
    handleUniversalLink(url, setApp);
  });

  return () => {
    linkingEventListener.remove();
  };
};
