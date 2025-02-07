import React, { useCallback } from 'react';
import {
  NativeSyntheticEvent,
  PixelRatio,
  Platform,
  requireNativeComponent,
} from 'react-native';

import { RCTFragment, RCTFragmentViewManagerProps } from './RCTFragment';
import {
  ReactNativeScannerView,
} from '@pushpendersingh/react-native-scanner';
interface RCTQRCodeScannerViewProps extends RCTFragmentViewManagerProps {
  onQRData: (event: NativeSyntheticEvent<{ data: string }>) => void;
}
const Fragment = RCTFragment as React.FC<RCTQRCodeScannerViewProps>;
const RCT_COMPONENT_NAME = 'QRCodeScannerViewManager';
const RCTQRCodeScannerViewManager: React.ComponentType<RCTQRCodeScannerViewProps> =
  requireNativeComponent(RCT_COMPONENT_NAME);

export interface QRCodeScannerViewProps {
  isMounted: boolean;
  onQRData: (error: Error | null, uri?: string) => void;
}

export const QRCodeScannerView: React.FC<QRCodeScannerViewProps> = ({
  onQRData,
  isMounted,
}) => {
  const _onError = useCallback<RCTQRCodeScannerViewProps['onError']>(
    ({ nativeEvent: { error, errorMessage, stackTrace } }) => {
      if (!isMounted) {
        return;
      }
      const e = new Error(errorMessage);
      e.stack = stackTrace;
      e.cause = error;
      onQRData(e);
    },
    [onQRData, isMounted],
  );

  const _onQRData = useCallback<RCTQRCodeScannerViewProps['onQRData']>(
    ({ nativeEvent: { data } }) => {
      if (!isMounted) {
        return;
      }
      console.log(data);
      onQRData(null, data);
    },
    [onQRData, isMounted],
  );

  const scannerRef = React.useRef(null);

  const style = {
    // converts dpi to px, provide desired height
    height: PixelRatio.getPixelSizeForLayoutSize(800),
    // converts dpi to px, provide desired width
    width: PixelRatio.getPixelSizeForLayoutSize(400),
  }

  const handleBarcodeScanned = (event: NativeSyntheticEvent<{data: string, type: string}>) => {
    const {data, type} = event?.nativeEvent;
    console.log('Barcode / QR Code scanned:', data, type);
  };

   
  if (Platform.OS === 'android') { 
    // @ts-expect-error
    return <Fragment RCTFragmentViewManager={RCTQRCodeScannerViewManager}
      fragmentComponentName={RCT_COMPONENT_NAME}
      isMounted={isMounted}
      style={style}
      onError={_onError}
      onQRData={_onQRData}
    />
  }
  else if (Platform.OS === 'ios') {
    return <ReactNativeScannerView
      ref={scannerRef}
      style={style}
      onQrScanned={handleBarcodeScanned}
      pauseAfterCapture={true} // Pause the scanner after barcode / QR code is scanned
      isActive={true} // Start / stop the scanner using this prop
      showBox={true} // Show the box around the barcode / QR code
    />
  }
  return null;
};

