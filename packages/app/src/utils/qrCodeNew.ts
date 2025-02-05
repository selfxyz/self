import { Linking } from 'react-native';

import { Mode, OpenPassportApp } from '@openpassport/common/utils/appType';
import { getCircuitNameOld } from '@openpassport/common/utils/certificate_parsing/parseCertificateSimple';
import { parsePassportData } from '@openpassport/common/utils/parsePassportData';
import msgpack from 'msgpack-lite';
import pako from 'pako';

import useNavigationStore from '../stores/navigationStore';
import useUserStore from '../stores/userStore';
import { downloadZkey } from './zkeyDownload';

export default async function handleQRCodeScan(result: string) {
  try {
    const { passportData } = useUserStore.getState();
    const { setSelectedApp } = useNavigationStore.getState();
    if (passportData) {
      const decodedResult = atob(result);
      const uint8Array = new Uint8Array(
        decodedResult.split('').map(char => char.charCodeAt(0)),
      );
      const decompressedData = pako.inflate(uint8Array);
      const unpackedData = msgpack.decode(decompressedData);
      const openPassportApp: OpenPassportApp = unpackedData;
      const passportMetadata = parsePassportData(passportData);

      const circuitName =
        openPassportApp.mode === 'vc_and_disclose'
          ? 'vc_and_disclose'
          : getCircuitNameOld(
              'prove' as Mode,
              passportMetadata.signatureAlgorithm,
              passportMetadata.signedAttrHashFunction,
            );
      await downloadZkey(circuitName as any);
      setSelectedApp(openPassportApp);
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

const handleUniversalLink = (url: string) => {
  const { toast } = useNavigationStore.getState();
  const encodedData = new URL(url).searchParams.get('data');
  console.log('Encoded data:', encodedData);
  if (encodedData) {
    handleQRCodeScan(encodedData);
  } else {
    console.error('No data found in the Universal Link');
    toast.show('Error', {
      message: 'Invalid link',
      type: 'error',
    });
  }
};

export const setupUniversalLinkListener = () => {
  Linking.getInitialURL().then(url => {
    if (url) {
      handleUniversalLink(url);
    }
  });

  const linkingEventListener = Linking.addEventListener('url', ({ url }) => {
    handleUniversalLink(url);
  });

  return () => {
    linkingEventListener.remove();
  };
};
