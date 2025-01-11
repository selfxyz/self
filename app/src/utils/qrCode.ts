import msgpack from 'msgpack-lite';
import pako from 'pako';
import { Linking, NativeModules, Platform } from 'react-native';

import { Mode, OpenPassportApp } from '../../../common/src/utils/appType';
import { getCircuitNameOld } from '../../../common/src/utils/certificate_parsing/parseCertificateSimple';
import useNavigationStore from '../stores/navigationStore';
import useUserStore from '../stores/userStore';
import { downloadZkey } from './zkeyDownload';

const parseUrlParams = (url: string): Map<string, string> => {
  const [, queryString] = url.split('?');
  const params = new Map<string, string>();
  if (queryString) {
    queryString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      params.set(key, decodeURIComponent(value));
    });
  }
  return params;
};

export const scanQRCode = () => {
  const { toast, setSelectedApp, setSelectedTab } =
    useNavigationStore.getState();

  Linking.getInitialURL()
    .then(url => {
      if (url) {
        handleUniversalLink(url);
      } else {
        if (Platform.OS === 'ios') {
          console.log('Scanning QR code on iOS without Universal Link');

          const qrScanner = NativeModules.QRScannerBridge;
          if (qrScanner && qrScanner.scanQRCode) {
            qrScanner
              .scanQRCode()
              .then((result: string) => {
                const params = parseUrlParams(result);
                const encodedData = params.get('data');
                handleQRCodeScan(
                  encodedData as string,
                  toast,
                  setSelectedApp,
                  setSelectedTab,
                );
              })
              .catch((error: any) => {
                console.error('QR Scanner Error:', error);
                toast.show('Error', {
                  message: 'Failed to scan QR code',
                  type: 'error',
                });
              });
          } else {
            console.error('QR Scanner module not found for iOS');
            toast.show('Error', {
              message: 'QR Scanner not available',
              type: 'error',
            });
          }
        } else if (Platform.OS === 'android') {
          const qrScanner = NativeModules.QRCodeScanner;
          if (qrScanner && qrScanner.scanQRCode) {
            qrScanner
              .scanQRCode()
              .then((result: string) => {
                const params = parseUrlParams(result);
                const encodedData = params.get('data');
                handleQRCodeScan(
                  encodedData as string,
                  toast,
                  setSelectedApp,
                  setSelectedTab,
                );
              })
              .catch((error: any) => {
                console.error('QR Scanner Error:', error);
                toast.show('Error', {
                  message: 'Failed to scan QR code',
                  type: 'error',
                });
              });
          } else {
            console.error('QR Scanner module not found for Android');
            toast.show('Error', {
              message: 'QR Scanner not available',
              type: 'error',
            });
          }
        }
      }
    })
    .catch(err => {
      console.error('An error occurred while getting initial URL', err);
      toast.show('Error', {
        message: 'Failed to process initial link',
        type: 'error',
      });
    });
};

const handleQRCodeScan = (
  result: string,
  toast: any,
  setSelectedApp: any,
  setSelectedTab: any,
) => {
  try {
    const { passportData, passportMetadata } = useUserStore.getState();
    if (passportData && passportMetadata) {
      const decodedResult = atob(result);
      const uint8Array = new Uint8Array(
        decodedResult.split('').map(char => char.charCodeAt(0)),
      );
      const decompressedData = pako.inflate(uint8Array);
      const unpackedData = msgpack.decode(decompressedData);
      const openPassportApp: OpenPassportApp = unpackedData;
      setSelectedApp(openPassportApp);

      const circuitName =
        openPassportApp.mode === 'vc_and_disclose'
          ? 'vc_and_disclose'
          : getCircuitNameOld(
            'prove' as Mode,
            passportMetadata.signatureAlgorithm,
            passportMetadata.signedAttrHashFunction,
          );
      downloadZkey(circuitName as any);

      setSelectedTab('prove');
      toast.show('✅', {
        message: 'QR code scanned',
        customData: {
          type: 'success',
        },
      });
    } else {
      toast.show('Welcome', {
        message: 'Please register your passport first',
        type: 'info',
      });
    }
  } catch (error) {
    console.error('Error parsing QR code result:', error);
    toast.show('Try again', {
      message: 'Error reading QR code: ' + (error as Error).message,
      customData: {
        type: 'error',
      },
    });
  }
};

const handleUniversalLink = (url: string) => {
  const { toast, setSelectedApp, setSelectedTab } =
    useNavigationStore.getState();
  const params = parseUrlParams(url);
  const encodedData = params.get('data');
  console.log('Encoded data:', encodedData);
  if (encodedData) {
    handleQRCodeScan(encodedData, toast, setSelectedApp, setSelectedTab);
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
