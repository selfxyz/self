// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import { PixelRatio, Platform, requireNativeComponent } from 'react-native';

import { RCTFragment } from '@/components/native/RCTFragment';

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
      const {
        error: nativeError,
        errorMessage,
        stackTrace,
      } = event.nativeEvent;
      const e = new Error(errorMessage);
      e.name = nativeError;
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
    return (
      <Fragment
        RCTFragmentViewManager={
          QRCodeNativeComponent as ReturnType<typeof requireNativeComponent>
        }
        fragmentComponentName="QRCodeScannerViewManager"
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
