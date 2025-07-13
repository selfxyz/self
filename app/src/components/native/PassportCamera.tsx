// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { useCallback } from 'react';
import {
  NativeSyntheticEvent,
  Platform,
  requireNativeComponent,
  useWindowDimensions,
} from 'react-native';

import { useCameraPermission } from '../../hooks/useCameraPermission';
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
  resetTrigger?: number; // Add reset trigger prop
}

export const PassportCamera: React.FC<PassportCameraProps> = ({
  onPassportRead,
  isMounted,
  resetTrigger = 0, // Default value
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { hasPermission } = useCameraPermission({
    isMounted,
    onError: onPassportRead,
  });

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
        key={`camera-${resetTrigger}`} // Add key to force remount
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

    // Use optimized dimensions for wide screen camera view
    const cameraWidth = Math.round(screenWidth * 1.3);
    const cameraHeight = Math.round(screenHeight * 0.8);

    return (
      <Fragment
        key={`camera-${resetTrigger}`} // Add key to force remount
        RCTFragmentViewManager={
          RCTPassportOCRViewNativeComponent as ReturnType<
            typeof requireNativeComponent
          >
        }
        fragmentComponentName="PassportOCRViewManager"
        isMounted={isMounted}
        style={{
          width: cameraWidth,
          height: cameraHeight,
        }}
        onError={_onError}
        onPassportRead={_onPassportRead}
      />
    );
  }
};
