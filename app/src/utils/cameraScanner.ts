import { NativeModules, Platform } from 'react-native';
import { formatDateToYYMMDD, extractMRZInfo } from './utils';
import * as amplitude from '@amplitude/analytics-react-native';
import useUserStore from '../stores/userStore';
import useNavigationStore from '../stores/navigationStore';

export const startCameraScan = async () => {
  const { toast, setSelectedTab } = useNavigationStore.getState();

  if (Platform.OS === 'ios') {
    try {
      const result = await NativeModules.MRZScannerModule.startScanning();
      console.log("Scan result:", result);
      console.log(`Document Number: ${result.documentNumber}, Expiry Date: ${result.expiryDate}, Birth Date: ${result.birthDate}`);

      useUserStore.setState({
        passportNumber: result.documentNumber,
        dateOfBirth: formatDateToYYMMDD(result.birthDate),
        dateOfExpiry: formatDateToYYMMDD(result.expiryDate),
      })

      setSelectedTab("nfc");
      toast.show("✔︎", {
        message: 'Scan successful',
        customData: {
          type: "success",
        },
      })
    } catch (e) {
      console.error(e);
      amplitude.track('camera_scan_error', { error: e });
    }
  } else {
    NativeModules.CameraActivityModule.startCameraActivity()
      .then((mrzInfo: string) => {
        try {
          const { documentNumber, birthDate, expiryDate } = extractMRZInfo(mrzInfo);

          useUserStore.setState({
            passportNumber: documentNumber,
            dateOfBirth: birthDate,
            dateOfExpiry: expiryDate,
          })

          setSelectedTab("nfc");
          toast.show("✔︎", {
            message: 'Scan successful',
            customData: {
              type: "success",
            },
          })
        } catch (error: any) {
          console.error('Invalid MRZ format:', error.message);
          amplitude.track('invalid_mrz_format', { error: error.message });
        }
      })
      .catch((error: any) => {
        console.error('Camera Activity Error:', error);
        amplitude.track('camera_scan_error', { error: error.message });
      });
  }
};