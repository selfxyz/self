// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { useCallback } from 'react';
import {
  NativeSyntheticEvent,
  Platform,
  requireNativeComponent,
  useWindowDimensions,
} from 'react-native';

import { useCameraPermission } from '../../hooks/useCameraPermission';
import { RCTFragment } from './RCTFragment';

interface NativeQRCodeScannerViewProps {
  onQRData: (event: NativeSyntheticEvent<{ data: string }>) => void;
  onError: (
    event: NativeSyntheticEvent<{
      error: string;
      errorMessage: string;
      stackTrace: string;
    }>,
  ) => void;
  style?: any; // Or a more specific style type
}

const QRCodeNativeComponent = Platform.select({
  ios: requireNativeComponent<NativeQRCodeScannerViewProps>(
    'QRCodeScannerView',
  ),
  android: requireNativeComponent<NativeQRCodeScannerViewProps>(
    'QRCodeScannerViewManager',
  ),
});

if (!QRCodeNativeComponent) {
  throw new Error('QRCodeScannerView not registered for this platform');
}

export interface QRCodeScannerViewProps {
  isMounted: boolean;
  onQRData: (error: Error | null, uri?: string) => void;
}

export const QRCodeScannerView: React.FC<QRCodeScannerViewProps> = ({
  onQRData,
  isMounted,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { hasPermission } = useCameraPermission({
    isMounted,
    onError: onQRData,
  });

  console.log('[QRCodeScannerView] Render:', {
    isMounted,
    hasPermission,
    screenWidth,
    screenHeight,
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
        console.log('[QRCodeScannerView] Ignoring error - not mounted');
        return;
      }

      const { error, errorMessage, stackTrace } = event.nativeEvent;
      console.log('[QRCodeScannerView] Error event:', { error, errorMessage });
      const e = new Error(errorMessage);
      e.stack = stackTrace;
      onQRData(e);
    },
    [onQRData, isMounted],
  );

  const _onQRData = useCallback(
    (event: NativeSyntheticEvent<{ data: string }>) => {
      if (!isMounted) {
        console.log('[QRCodeScannerView] Ignoring QR data - not mounted');
        return;
      }
      console.log(
        '[QRCodeScannerView] QR data received:',
        event.nativeEvent.data,
      );
      onQRData(null, event.nativeEvent.data);
    },
    [onQRData, isMounted],
  );

  // Don't render the camera component until permission is granted
  if (hasPermission === null) {
    console.log('[QRCodeScannerView] Permission still loading');
    // Still loading permission status
    return null;
  }

  if (hasPermission === false) {
    console.log('[QRCodeScannerView] Permission denied');
    // Permission denied, don't render camera
    return null;
  }

  console.log('[QRCodeScannerView] Permission granted, rendering camera');

  // Permission granted, render camera component
  if (Platform.OS === 'ios') {
    return (
      <QRCodeNativeComponent
        onQRData={_onQRData}
        onError={_onError}
        style={{
          width: '110%',
          height: '110%',
          backgroundColor: 'transparent',
        }}
      />
    );
  } else {
    // For Android, properly type the Fragment component
    const FragmentWithProps = RCTFragment as React.FC<
      React.ComponentProps<typeof RCTFragment> & NativeQRCodeScannerViewProps
    >;

    // Use optimized dimensions for wide screen camera view
    const cameraWidth = Math.round(screenWidth * 3);
    const cameraHeight = Math.round(screenHeight * 2);

    console.log(
      '[QRCodeScannerView] Rendering Android camera with dimensions:',
      { cameraWidth, cameraHeight },
    );

    return (
      <FragmentWithProps
        RCTFragmentViewManager={
          QRCodeNativeComponent as ReturnType<typeof requireNativeComponent>
        }
        fragmentComponentName="QRCodeScannerViewManager"
        isMounted={isMounted}
        style={{
          width: cameraWidth,
          height: cameraHeight,
          backgroundColor: 'transparent',
        }}
        onError={_onError}
        onQRData={_onQRData}
      />
    );
  }
};
