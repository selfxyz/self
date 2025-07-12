// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { useCallback, useState } from 'react';
import {
  NativeSyntheticEvent,
  PermissionsAndroid,
  PixelRatio,
  Platform,
  requireNativeComponent,
} from 'react-native';

import { extractMRZInfo } from '../../utils/utils';
import { RCTFragment } from './RCTFragment';

interface NativePassportOCRViewProps {
  onPassportRead: (
    event: NativeSyntheticEvent<{
      data:
        | string
        | {
            documentNumber: string;
            expiryDate: string;
            birthDate: string;
            documentType: string;
            countryCode: string;
          };
    }>,
  ) => void;
  onError: (
    event: NativeSyntheticEvent<{
      error: string;
      errorMessage: string;
      stackTrace: string;
    }>,
  ) => void;
  style?: any; // Or a more specific style type if available
}

const RCTPassportOCRViewNativeComponent = Platform.select({
  ios: requireNativeComponent<NativePassportOCRViewProps>('PassportOCRView'),
  android: requireNativeComponent<NativePassportOCRViewProps>(
    'PassportOCRViewManager',
  ),
});

if (!RCTPassportOCRViewNativeComponent) {
  throw new Error('PassportOCRViewManager not registered for this platform');
}

export interface PassportCameraProps {
  isMounted: boolean;
  onPassportRead: (
    error: Error | null,
    mrzData?: ReturnType<typeof extractMRZInfo>,
  ) => void;
}

export const PassportCamera: React.FC<PassportCameraProps> = ({
  onPassportRead,
  isMounted,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionRequested, setPermissionRequested] = useState(false);

  const requestCameraPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setHasPermission(true);
      return;
    }

    if (permissionRequested) {
      return;
    }

    setPermissionRequested(true);

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message:
            'This app needs access to your camera to scan passport documents.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      const permissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      setHasPermission(permissionGranted);

      if (!permissionGranted) {
        const error = new Error('Camera permission denied');
        onPassportRead(error);
      }
    } catch (err) {
      console.warn('Camera permission error:', err);
      const error = new Error('Camera permission request failed');
      onPassportRead(error);
      setHasPermission(false);
    }
  }, [onPassportRead, permissionRequested]);

  const checkCameraPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setHasPermission(true);
      return;
    }

    try {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );

      if (hasPermission) {
        setHasPermission(true);
      } else {
        await requestCameraPermission();
      }
    } catch (err) {
      console.warn('Camera permission check error:', err);
      await requestCameraPermission();
    }
  }, [requestCameraPermission]);

  // Check permission on mount
  React.useEffect(() => {
    if (isMounted && hasPermission === null) {
      checkCameraPermission();
    }
  }, [isMounted, hasPermission, checkCameraPermission]);

  const _onError = useCallback(
    (
      event: NativeSyntheticEvent<{
        error: string;
        errorMessage: string;
        stackTrace: string;
      }>,
    ) => {
      if (!isMounted) {
        return;
      }
      const { errorMessage, stackTrace } = event.nativeEvent;
      const e = new Error(errorMessage);
      e.stack = stackTrace;
      onPassportRead(e);
    },
    [onPassportRead, isMounted],
  );

  const _onPassportRead = useCallback(
    (
      event: NativeSyntheticEvent<{
        data:
          | string
          | {
              documentNumber: string;
              expiryDate: string;
              birthDate: string;
              documentType: string;
              countryCode: string;
            };
      }>,
    ) => {
      if (!isMounted) {
        return;
      }
      if (typeof event.nativeEvent.data === 'string') {
        onPassportRead(null, extractMRZInfo(event.nativeEvent.data));
      } else {
        onPassportRead(null, {
          passportNumber: event.nativeEvent.data.documentNumber,
          dateOfBirth: event.nativeEvent.data.birthDate,
          dateOfExpiry: event.nativeEvent.data.expiryDate,
          documentType: event.nativeEvent.data.documentType,
          countryCode: event.nativeEvent.data.countryCode,
        });
      }
    },
    [onPassportRead, isMounted],
  );

  // Don't render the camera component until permission is granted
  if (hasPermission === null) {
    // Still loading permission status
    return null;
  }

  if (hasPermission === false) {
    // Permission denied, don't render camera
    return null;
  }

  // Permission granted, render camera component
  if (Platform.OS === 'ios') {
    return (
      <RCTPassportOCRViewNativeComponent
        onPassportRead={_onPassportRead}
        onError={_onError}
        style={{
          width: '130%',
          height: '130%',
        }}
      />
    );
  } else {
    // For Android, wrap the native component inside your RCTFragment to preserve existing functionality.
    const Fragment = RCTFragment as React.FC<
      React.ComponentProps<typeof RCTFragment> & NativePassportOCRViewProps
    >;
    return (
      <Fragment
        RCTFragmentViewManager={
          RCTPassportOCRViewNativeComponent as ReturnType<
            typeof requireNativeComponent
          >
        }
        fragmentComponentName="PassportOCRViewManager"
        isMounted={isMounted}
        style={{
          height: PixelRatio.getPixelSizeForLayoutSize(800),
          width: PixelRatio.getPixelSizeForLayoutSize(400),
        }}
        onError={_onError}
        onPassportRead={_onPassportRead}
      />
    );
  }
};
