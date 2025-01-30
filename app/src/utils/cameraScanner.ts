import { NativeModules, Platform } from 'react-native';

import { extractMRZInfo, formatDateToYYMMDD } from './utils';
import { segmentClient } from '../../App';
import { trackEvent } from './analytics';

type Callback = (
  error: Error | null,
  result?: {
    passportNumber: string;
    dateOfBirth: string;
    dateOfExpiry: string;
  },
) => void;
type CancelScan = () => void;

export const startCameraScan = (callback: Callback): CancelScan => {
  const startTime = Date.now();
  trackEvent('Camera Launched');

  if (Platform.OS === 'ios') {
    NativeModules.MRZScannerModule.startScanning()
      .then(
        (result: {
          documentNumber: string;
          birthDate: string;
          expiryDate: string;
        }) => {
          trackEvent('Camera Success', {
            duration_ms: Date.now() - startTime,
          });
          console.log('Scan result:', result);
          console.log(
            `Document Number: ${result.documentNumber}, Expiry Date: ${result.expiryDate}, Birth Date: ${result.birthDate}`,
          );

          callback(null, {
            passportNumber: result.documentNumber,
            dateOfBirth: formatDateToYYMMDD(result.birthDate),
            dateOfExpiry: formatDateToYYMMDD(result.expiryDate),
          });
          trackEvent('MRZ Success');
        },
      )
      .catch((e: Error) => {
        console.error(e);
        trackEvent('Camera Failed', {
          duration_ms: Date.now() - startTime,
          error: e?.toString(),
        });
        callback(e as Error);
      });

    return () => {
      // TODO
      NativeModules.MRZScannerModule.stopScanning();
    };
  } else {
    NativeModules.CameraActivityModule.startCameraActivity()
      .then((mrzInfo: string) => {
        try {
          trackEvent('Camera Success', {
            duration_ms: Date.now() - startTime,
          });
          const { passportNumber, dateOfBirth, dateOfExpiry } =
            extractMRZInfo(mrzInfo);

          callback(null, {
            passportNumber,
            dateOfBirth,
            dateOfExpiry,
          });
          trackEvent('MRZ Success');
        } catch (e) {
          console.error('Invalid MRZ format:', (e as Error).message);
          trackEvent('MRZ Error', {
            error: (e as Error).message,
          });

          callback(e as Error);
        }
      })
      .catch((e: Error) => {
        console.error('Camera Activity Error:', e);
        trackEvent('Camera Failed', {
          duration_ms: Date.now() - startTime,
          error: (e as Error).message,
        });

        callback(e);
      });

    return () => {
      // TODO
      // NativeModules.CameraActivityModule.cancelCameraActivity();
      console.log('this would destroy the view');
    };
  }
};
