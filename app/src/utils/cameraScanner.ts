import { NativeModules, Platform } from 'react-native';

import * as amplitude from '@amplitude/analytics-react-native';

import { extractMRZInfo, formatDateToYYMMDD } from './utils';

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
  if (Platform.OS === 'ios') {
    NativeModules.MRZScannerModule.startScanning()
      .then(
        (result: {
          documentNumber: string;
          birthDate: string;
          expiryDate: string;
        }) => {
          console.log('Scan result:', result);
          console.log(
            `Document Number: ${result.documentNumber}, Expiry Date: ${result.expiryDate}, Birth Date: ${result.birthDate}`,
          );

          callback(null, {
            passportNumber: result.documentNumber,
            dateOfBirth: formatDateToYYMMDD(result.birthDate),
            dateOfExpiry: formatDateToYYMMDD(result.expiryDate),
          });
        },
      )
      .catch((e: Error) => {
        console.error(e);
        amplitude.track('camera_scan_error', { error: e });
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
          const { passportNumber, dateOfBirth, dateOfExpiry } =
            extractMRZInfo(mrzInfo);

          callback(null, {
            passportNumber,
            dateOfBirth,
            dateOfExpiry,
          });
        } catch (e) {
          console.error('Invalid MRZ format:', (e as Error).message);
          amplitude.track('invalid_mrz_format', {
            error: (e as Error).message,
          });

          callback(e as Error);
        }
      })
      .catch((e: Error) => {
        console.error('Camera Activity Error:', e);
        amplitude.track('camera_scan_error', { error: e.message });

        callback(e);
      });

    return () => {
      // TODO
      // NativeModules.CameraActivityModule.cancelCameraActivity();
      console.log('this would destroy the view');
    };
  }
};
