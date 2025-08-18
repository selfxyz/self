import React, { useCallback, useRef } from 'react';
import type { DimensionValue, ViewProps, ViewStyle } from 'react-native';
import { NativeModules, requireNativeComponent, StyleSheet, View } from 'react-native';

interface SelfMRZScannerViewProps extends ViewProps {
  onPassportRead?: (event: any) => void;
  onError?: (event: any) => void;
}

const SelfMRZScannerView = requireNativeComponent<SelfMRZScannerViewProps>('SelfMRZScannerView');

interface MRZScannerViewProps {
  style?: ViewStyle;
  height?: DimensionValue;
  width?: DimensionValue;
  aspectRatio?: number;
  onMRZDetected?: (data: {
    documentNumber: string;
    birthDate: string;
    expiryDate: string;
    countryCode: string;
  }) => void;
  onError?: (error: string) => void;
}

export const MRZScannerView: React.FC<MRZScannerViewProps> = ({
  style,
  height,
  width,
  aspectRatio,
  onMRZDetected,
  onError,
}) => {
  const viewRef = useRef<any>(null);

  const handleMRZDetected = useCallback(
    (event: any) => {
      console.log('[MRZScannerView] handleMRZDetected', event);
      const { data } = event.nativeEvent;
      onMRZDetected?.({
        documentNumber: data.documentNumber,
        birthDate: data.birthDate,
        expiryDate: data.expiryDate,
        countryCode: data.countryCode,
      });
    },
    [onMRZDetected],
  );

  const handleError = useCallback(
    (event: any) => {
      const { error } = event.nativeEvent;
      onError?.(error);
    },
    [onError],
  );

  const containerStyle = [
    styles.container,
    height !== undefined && { height },
    width !== undefined && { width },
    aspectRatio !== undefined && { aspectRatio },
    style,
  ];

  return (
    <View style={containerStyle}>
      <SelfMRZScannerView
        ref={viewRef}
        style={styles.scanner}
        onPassportRead={handleMRZDetected}
        onError={handleError}
      />
    </View>
  );
};

// TODO Check this
const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 200,
    aspectRatio: 16 / 9,
  },
  scanner: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export const SelfMRZScannerModule = NativeModules.SelfMRZScannerModule;
