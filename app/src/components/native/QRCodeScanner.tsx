import React, { useCallback } from 'react';
import {
  NativeSyntheticEvent,
  PixelRatio,
  Platform,
  requireNativeComponent,
} from 'react-native';

import { RCTFragment, RCTFragmentViewManagerProps } from './RCTFragment';

interface RCTQRCodeScannerViewProps extends RCTFragmentViewManagerProps {
  onQRData: (event: NativeSyntheticEvent<{ data: string }>) => void;
}

const QRCodeNativeComponent = Platform.select({
  ios: requireNativeComponent('QRCodeScannerView'),
  android: requireNativeComponent('QRCodeScannerViewManager'),
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
    const Fragment = RCTFragment as React.FC<RCTQRCodeScannerViewProps>;
    return (
      <Fragment
        RCTFragmentViewManager={QRCodeNativeComponent}
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
