import { NativeModules, Platform } from 'react-native';
import { formatDateToYYMMDD, extractMRZInfo, Steps } from './utils';
import * as amplitude from '@amplitude/analytics-react-native';

interface CameraScannerProps {
  setPassportNumber: (value: string) => void;
  setDateOfBirth: (value: string) => void;
  setDateOfExpiry: (value: string) => void;
  setStep: (value: number) => void;
  toast: any
}

export const startCameraScan = async ({
  setPassportNumber,
  setDateOfBirth,
  setDateOfExpiry,
  setStep,
  toast
}: CameraScannerProps) => {
  if (Platform.OS === 'ios') {
    try {
      const result = await NativeModules.MRZScannerModule.startScanning();
      console.log("Scan result:", result);
      console.log(`Document Number: ${result.documentNumber}, Expiry Date: ${result.expiryDate}, Birth Date: ${result.birthDate}`);
      setPassportNumber(result.documentNumber);
      setDateOfBirth(formatDateToYYMMDD(result.birthDate));
      setDateOfExpiry(formatDateToYYMMDD(result.expiryDate));
      setStep(Steps.MRZ_SCAN_COMPLETED);
      toast.show("Scan successful", {
        message: 'Nice to meet you!',
        customData: {
          type: "success",
        },
      })
      amplitude.track('Camera scan successful');
    } catch (e) {
      console.error(e);
      amplitude.track('Camera scan unsuccessful');
    }
  } else {
    NativeModules.CameraActivityModule.startCameraActivity()
      .then((mrzInfo: string) => {
        try {
          const { documentNumber, birthDate, expiryDate } = extractMRZInfo(mrzInfo);
          setPassportNumber(documentNumber);
          setDateOfBirth(birthDate);
          setDateOfExpiry(expiryDate);
          setStep(Steps.MRZ_SCAN_COMPLETED);
          amplitude.track('Camera scan successful');
          toast.show("Scan successful", {
            message: 'Nice to meet you!',
            customData: {
              type: "success",
            },
          })    
        } catch (error: any) {
          console.error('Invalid MRZ format:', error.message);
          amplitude.track('Camera scan unsuccessful');
        }
      })
      .catch((error: any) => {
        console.error('Camera Activity Error:', error);
        amplitude.track('Camera scan unsuccessful');
      });
  }
};