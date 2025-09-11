// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import { PixelRatio, Platform, requireNativeComponent } from 'react-native';

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
  style?: StyleProp<ViewStyle>;
}

const QRCodeNativeComponent = Platform.select({
  ios: requireNativeComponent<NativeQRCodeScannerViewProps>('SelfQRScannerView'),
  android: requireNativeComponent<NativeQRCodeScannerViewProps>('SelfQRScannerViewManager'),
});

export interface QRCodeScannerViewProps {
  isMounted: boolean;
  onQRData: (error: Error | null, uri?: string) => void;
}

export const QRCodeScannerView: React.FC<QRCodeScannerViewProps> = ({ onQRData, isMounted }) => {
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
      onQRData(null, event.nativeEvent.data);
    },
    [onQRData, isMounted],
  );

  if (!QRCodeNativeComponent) {
    console.error('SelfQRScannerView not registered for this platform');
    return;
  }

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
    const Fragment = RCTFragment as React.FC<React.ComponentProps<typeof RCTFragment> & NativeQRCodeScannerViewProps>;
    return (
      <Fragment
        RCTFragmentViewManager={QRCodeNativeComponent as ReturnType<typeof requireNativeComponent>}
        fragmentComponentName="SelfQRScannerViewManager"
        isMounted={isMounted}
        style={{
          height: PixelRatio.getPixelSizeForLayoutSize(800),
          width: PixelRatio.getPixelSizeForLayoutSize(400),
        }}
        onError={_onError}
        onQRData={_onQRData}
      />
    );
  }
};
