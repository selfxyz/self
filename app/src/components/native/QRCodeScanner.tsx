// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { useCallback } from 'react';
import {
  Dimensions,
  NativeSyntheticEvent,
  Platform,
  requireNativeComponent,
} from 'react-native';

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
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const { error, errorMessage, stackTrace } = event.nativeEvent;
      const e = new Error(errorMessage);
      e.stack = stackTrace;
      onQRData(e);
    },
    [onQRData, isMounted],
  );

  const _onQRData = useCallback(
    (event: NativeSyntheticEvent<{ data: string }>) => {
      if (!isMounted) {
        return;
      }
      console.log(event.nativeEvent.data);
      onQRData(null, event.nativeEvent.data);
    },
    [onQRData, isMounted],
  );

  if (Platform.OS === 'ios') {
    return (
      <QRCodeNativeComponent
        onQRData={_onQRData}
        onError={_onError}
        style={{
          width: '110%',
          height: '110%',
        }}
      />
    );
  } else {
    // For Android, wrap the native component inside your RCTFragment to preserve existing functionality.
    const Fragment = RCTFragment as React.FC<
      React.ComponentProps<typeof RCTFragment> & NativeQRCodeScannerViewProps
    >;

    // Use optimized dimensions for wide screen camera view
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const cameraWidth = Math.round(screenWidth * 1.3);
    const cameraHeight = Math.round(screenHeight * 0.8);

    return (
      <Fragment
        RCTFragmentViewManager={
          QRCodeNativeComponent as ReturnType<typeof requireNativeComponent>
        }
        fragmentComponentName="QRCodeScannerViewManager"
        isMounted={isMounted}
        style={{
          width: cameraWidth,
          height: cameraHeight,
        }}
        onError={_onError}
        onQRData={_onQRData}
      />
    );
  }
};
