import { NativeModules, Platform } from 'react-native';

import useNavigationStore from '../stores/navigationStore';
import useUserStore from '../stores/userStore';
import { extractMRZInfo, formatDateToYYMMDD } from './utils';

export const startCameraScan = async () => {
  const { toast, setSelectedTab, trackEvent } = useNavigationStore.getState();
  const startTime = Date.now();

  trackEvent('Camera Launched');

  if (Platform.OS === 'ios') {
    try {
      const result = await NativeModules.MRZScannerModule.startScanning();
      setSelectedTab('nfc');
      trackEvent('Camera Success', {
        duration_ms: Date.now() - startTime,
      });
      useUserStore.setState({
        passportNumber: result.documentNumber,
        dateOfBirth: formatDateToYYMMDD(result.birthDate),
        dateOfExpiry: formatDateToYYMMDD(result.expiryDate),
      });
      trackEvent('MRZ Success');
      toast.show('✔︎', { message: 'Scan successful', customData: { type: 'success' } });
    } catch (e) {
      console.error(e);
      trackEvent('Camera Failed', {
        duration_ms: Date.now() - startTime,
        error: e?.toString(),
      });
    }
  } else {
    NativeModules.CameraActivityModule.startCameraActivity()
      .then((mrzInfo: string) => {
        try {
          trackEvent('Camera Success', {
            duration_ms: Date.now() - startTime,
          });
          const { documentNumber, birthDate, expiryDate } = extractMRZInfo(mrzInfo);
          useUserStore.setState({
            passportNumber: documentNumber,
            dateOfBirth: birthDate,
            dateOfExpiry: expiryDate,
          });
          setSelectedTab('nfc');
          trackEvent('MRZ Success');
          toast.show('✔︎', { message: 'Scan successful', customData: { type: 'success' } });
        } catch (error: any) {
          console.error('Invalid MRZ format:', error.message);
          trackEvent('MRZ Error', {
            error: error.message,
          });
        }
      })
      .catch((error: any) => {
        console.error('Camera Activity Error:', error);
        trackEvent('Camera Failed', {
          duration_ms: Date.now() - startTime,
          error: error.message,
        });
      });
  }
};
