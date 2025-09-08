// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useRef } from 'react';
import type { DimensionValue, NativeSyntheticEvent, ViewProps, ViewStyle } from 'react-native';
import { NativeModules, PixelRatio, Platform, requireNativeComponent, StyleSheet, View } from 'react-native';

import { extractMRZInfo, formatDateToYYMMDD } from '../mrz';
import { MRZInfo } from '../types/public';
import { RCTFragment } from './RCTFragment';

interface SelfMRZScannerViewProps extends ViewProps {
  onPassportRead?: (
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
  onError?: (
    event: NativeSyntheticEvent<{
      error: string;
      errorMessage: string;
      stackTrace: string;
    }>,
  ) => void;
  width?: number;
  height?: number;
}

const NativeMRZScannerView = requireNativeComponent<SelfMRZScannerViewProps>(
  Platform.select({
    ios: 'SelfMRZScannerView',
    android: 'SelfOCRViewManager',
  })!,
);

interface MRZScannerViewProps {
  style?: ViewStyle;
  height?: DimensionValue;
  width?: DimensionValue;
  aspectRatio?: number;
  onMRZDetected?: (data: MRZInfo) => void;
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
      const data = event.nativeEvent.data;
      if (Platform.OS === 'ios') {
        const formattedBirthDate = formatDateToYYMMDD(data.birthDate);
        const formattedExpiryDate = formatDateToYYMMDD(data.expiryDate);
        onMRZDetected?.({
          documentNumber: data.documentNumber,
          dateOfBirth: formattedBirthDate,
          dateOfExpiry: formattedExpiryDate,
          issuingCountry: data.countryCode,
          documentType: data.documentType,
        });
      } else if (Platform.OS === 'android') {
        const extractedData = extractMRZInfo(data);
        onMRZDetected?.({
          documentNumber: extractedData.documentNumber,
          dateOfBirth: extractedData.dateOfBirth,
          dateOfExpiry: extractedData.dateOfExpiry,
          issuingCountry: extractedData.issuingCountry,
          documentType: extractedData.documentType,
        });
      } else {
        throw new Error('Unsupported platform');
      }
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

  if (Platform.OS === 'ios') {
    return (
      <View style={containerStyle}>
        <NativeMRZScannerView
          ref={viewRef}
          style={{
            width: '100%',
            height: '100%',
          }}
          onPassportRead={handleMRZDetected}
          onError={handleError}
        />
      </View>
    );
  } else {
    return (
      <View style={containerStyle}>
        <RCTFragment
          RCTFragmentViewManager={NativeMRZScannerView as any}
          fragmentComponentName="PassportOCRViewManager"
          isMounted={true}
          style={{
            height: PixelRatio.getPixelSizeForLayoutSize(800),
            width: PixelRatio.getPixelSizeForLayoutSize(800),
          }}
          onError={handleError}
          onPassportRead={handleMRZDetected}
        />
      </View>
    );
  }
};

// TODO Check this
const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 200,
    aspectRatio: 1,
  },
  scanner: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export const SelfMRZScannerModule = NativeModules.SelfMRZScannerModule;
