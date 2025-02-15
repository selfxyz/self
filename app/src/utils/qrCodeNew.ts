import { Linking } from 'react-native';

import msgpack from 'msgpack-lite';
import pako from 'pako';

import { SelfApp } from '../../../common/src/utils/appType';
import useNavigationStore from '../stores/navigationStore';
import useUserStore from '../stores/userStore';

export default async function handleQRCodeScan(
  result: string,
  setApp: (app: SelfApp) => void,
) {
  try {
    const { passportData } = useUserStore.getState();
    if (passportData) {
      const decodedResult = atob(result);
      const uint8Array = new Uint8Array(
        decodedResult.split('').map(char => char.charCodeAt(0)),
      );
      const decompressedData = pako.inflate(uint8Array);
      const unpackedData = msgpack.decode(decompressedData);
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
  const { toast } = useNavigationStore.getState();
  const encodedData = new URL(url).searchParams.get('data');
  console.log('Encoded data:', encodedData);
  if (encodedData) {
    handleQRCodeScan(encodedData, setApp);
  } else {
    console.error('No data found in the Universal Link');
    toast.show('Error', {
      message: 'Invalid link',
      type: 'error',
    });
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
