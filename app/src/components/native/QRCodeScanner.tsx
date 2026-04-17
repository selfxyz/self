// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  type BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

export interface QRCodeScannerViewProps {
  isMounted: boolean;
  onQRData: (error: Error | null, uri?: string) => void;
}

export const QRCodeScannerView: React.FC<QRCodeScannerViewProps> = ({
  onQRData,
  isMounted,
}) => {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (permission && !permission.granted) {
      if (permission.canAskAgain) {
        requestPermission();
      } else {
        onQRData(new Error('Camera permission denied'));
      }
    }
  }, [permission, requestPermission, onQRData]);

  const hasScanned = useRef(false);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (!isMounted || hasScanned.current) {
        return;
      }
      hasScanned.current = true;
      onQRData(null, result.data);
    },
    [onQRData, isMounted],
  );

  const handleMountError = useCallback(
    (event: { message: string }) => {
      if (!isMounted) return;
      onQRData(new Error(event.message));
    },
    [isMounted, onQRData],
  );

  if (!permission?.granted) {
    return null;
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcodeScanned}
        onMountError={handleMountError}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '110%',
    height: '110%',
  },
  camera: {
    flex: 1,
  },
});
