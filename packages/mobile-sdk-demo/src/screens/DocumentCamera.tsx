// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MRZScannerView } from '@selfxyz/mobile-sdk-alpha/onboarding/read-mrz';

import ScreenLayout from '../components/ScreenLayout';
import DocumentScanResultCard from '../components/DocumentScanResultCard';
import { useMRZScanner } from '../hooks/useMRZScanner';

type Props = {
  onBack: () => void;
};

const instructionsText = 'Align the machine-readable text with the frame and hold steady while we scan.';

const successMessage = 'Document scan successful. Review the details below.';
const errorMessage = 'We could not read your document. Adjust lighting and try again.';
const permissionDeniedMessage = 'Camera access was denied. Enable permissions to scan your document.';

export default function DocumentCamera({ onBack }: Props) {
  const scannerCopy = {
    instructions: instructionsText,
    success: successMessage,
    error: errorMessage,
    permissionDenied: permissionDeniedMessage,
    resetAnnouncement: 'Ready to scan again. Align the document in the viewfinder.',
  } as const;

  const {
    permissionStatus,
    scanState,
    mrzResult,
    error,
    requestPermission,
    handleMRZDetected,
    handleScannerError,
    handleScanAgain,
  } = useMRZScanner(scannerCopy);

  const handleSaveDocument = useCallback(() => {
    if (!mrzResult) {
      Alert.alert('Save Document', 'Scan a document before attempting to save.');
      return;
    }

    Alert.alert(
      'Save Document',
      'Document storage will be available in a future release. Your scan is ready when you need it.',
    );
  }, [mrzResult]);

  const renderPermissionDenied = () => (
    <View style={styles.centeredState}>
      <Text style={styles.permissionText}>{permissionDeniedMessage}</Text>
      <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={requestPermission}>
        <Text style={styles.secondaryButtonText}>Request Permission</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.centeredState}>
      <ActivityIndicator accessibilityLabel="Loading camera" color="#0f172a" />
      <Text style={styles.statusText}>Preparing camera…</Text>
    </View>
  );

  return (
    <ScreenLayout
      title="Document Camera"
      onBack={() => {
        onBack();
      }}
      contentStyle={styles.screenContent}
      rightAction={
        <TouchableOpacity accessibilityRole="button" onPress={handleSaveDocument}>
          <Text style={styles.headerAction}>Save Document</Text>
        </TouchableOpacity>
      }
    >
      {permissionStatus === 'loading' && renderLoading()}
      {permissionStatus === 'denied' && renderPermissionDenied()}

      {permissionStatus === 'granted' && (
        <View style={styles.contentWrapper}>
          <View style={styles.cameraWrapper}>
            <MRZScannerView style={styles.scanner} onMRZDetected={handleMRZDetected} onError={handleScannerError} />
            <View style={styles.overlay} accessibilityLiveRegion="polite" pointerEvents="none">
              <Text style={styles.overlayTitle}>Position your document</Text>
              <Text style={styles.overlayText}>{instructionsText}</Text>
            </View>
          </View>

          <View style={styles.statusContainer}>
            {scanState === 'scanning' && !error && (
              <View style={styles.statusRow}>
                <ActivityIndicator accessibilityLabel="Scanning" color="#2563eb" size="small" />
                <Text style={styles.statusText}>Scanning for MRZ data…</Text>
              </View>
            )}

            {scanState === 'success' && mrzResult && (
              <Text style={[styles.statusText, styles.successText]}>{successMessage}</Text>
            )}

            {scanState === 'error' && error && <Text style={[styles.statusText, styles.errorText]}>{error}</Text>}
          </View>

          {mrzResult && <DocumentScanResultCard result={mrzResult} />}

          <View style={styles.actions}>
            <TouchableOpacity accessibilityRole="button" onPress={handleScanAgain} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Scan Again</Text>
            </TouchableOpacity>

            <TouchableOpacity accessibilityRole="button" onPress={handleSaveDocument} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Save Document</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: 16,
  },
  contentWrapper: {
    flex: 1,
  },
  cameraWrapper: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 260,
    marginBottom: 16,
  },
  scanner: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0f172a',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  overlayTitle: {
    color: '#f8fafc',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  overlayText: {
    color: '#e2e8f0',
    fontSize: 14,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: '#0f172a',
    fontSize: 14,
    marginTop: 8,
  },
  successText: {
    color: '#15803d',
    fontWeight: '600',
  },
  errorText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  headerAction: {
    color: '#2563eb',
    fontWeight: '600',
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  permissionText: {
    color: '#0f172a',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
});
