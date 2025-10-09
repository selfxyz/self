// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { v4 as uuidv4 } from 'uuid';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import ScreenLayout from '../components/ScreenLayout';
import { useScanNFC } from '@selfxyz/mobile-sdk-alpha/onboarding/scan-nfc';

// Status to message mapping
const getStatusMessage = (status: string | null): string | null => {
  if (!status) return null;

  switch (status) {
    case 'idle':
      return null;
    case 'starting':
      return 'Initializing NFC scan...';
    case 'scanning':
      return 'Hold your device near the NFC chip...';
    case 'processing':
      return 'Processing document data...';
    case 'storing':
      return 'Storing document...';
    case 'success':
      return 'Success!';
    default:
      return status;
  }
};

type Props = {
  onBack: () => void;
  onNavigate: (screen: string, params?: any) => void;
};

export default function DocumentNFCScan({ onBack, onNavigate }: Props) {
  const sessionId = useRef(uuidv4());
  const hasAutoStartedRef = useRef(false);
  const selfClient = useSelfClient();
  const mrzData = selfClient.useMRZStore(state => state.getMRZ());

  // memoize useScanProps to avoid re-rendering the component due to inline functions
  const memoizeduseScanProps = useMemo(() => {
    return {
      sessionId: sessionId.current,
      onNFCMajorSuccess: () => {
        ReactNativeHapticFeedback.trigger('impactHeavy');
      },
      onNFCMinorSuccess: () => {
        ReactNativeHapticFeedback.trigger('impactLight');
      },
      onNFCError: (message: string) => {
        ReactNativeHapticFeedback.trigger('notificationError');

        Alert.alert('Scan Failed', `Failed to scan NFC chip: ${message}`, [
          {
            text: 'Try Again',
            onPress: () => {
              startScan();
            },
          },
          { text: 'Cancel', onPress: onBack, style: 'cancel' },
        ]);
      },
      onScanCancelled: () => {
        onBack();
      },
      onTimeout: () => {
        Alert.alert('Scan Timed Out', 'Please try again.', [
          {
            text: 'Try Again',
            onPress: () => {
              startScan();
            },
          },
          { text: 'Cancel', onPress: onBack, style: 'cancel' },
        ]);
      },
      onSuccess: () => {
        onNavigate('success');
      },
      onError: (message: string) => {
        Alert.alert('Scan Failed', `Failed to scan NFC chip: ${message}`, [
          {
            text: 'Try Again',
            onPress: () => {
              startScan();
            },
          },
          { text: 'Cancel', onPress: onBack, style: 'cancel' },
        ]);
      },
    };
  }, [onBack, onNavigate]);

  const { status, detailsMessage, startScan, cancelScan, isScanning, error } = useScanNFC(memoizeduseScanProps);

  // Auto-start scan when component mounts
  useEffect(() => {
    if (!hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      // Small delay to allow UI to settle
      const timer = setTimeout(() => {
        startScan();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <ScreenLayout title="NFC Scan" onBack={cancelScan} contentStyle={styles.screenContent}>
      <View style={styles.contentWrapper}>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Scan NFC Chip</Text>
          <Text style={styles.instructionsText}>
            Place your phone against the NFC chip in your document and keep it still until the scan completes.
          </Text>
          <Text style={styles.disclaimer}>
            The chip contains encrypted data that verifies the authenticity of your document.
          </Text>
        </View>

        {isScanning && (
          <View style={styles.scanningContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            {getStatusMessage(status) && <Text style={styles.scanningText}>{getStatusMessage(status)}</Text>}
            {detailsMessage && <Text style={styles.scanningText}>{detailsMessage}</Text>}
          </View>
        )}

        {error && !isScanning && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.mrzInfoContainer}>
          <Text style={styles.mrzInfoTitle}>Document Information</Text>
          <Text style={styles.mrzInfoText}>Document Number: {mrzData.documentNumber}</Text>
          <Text style={styles.mrzInfoText}>Date of Birth: {mrzData.dateOfBirth}</Text>
          <Text style={styles.mrzInfoText}>Date of Expiry: {mrzData.dateOfExpiry}</Text>
        </View>

        <View style={styles.actions}>
          {!isScanning && error && (
            <TouchableOpacity accessibilityRole="button" onPress={startScan} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            onPress={cancelScan}
            style={[styles.secondaryButton, isScanning && styles.disabledButton]}
            disabled={isScanning}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: 16,
  },
  contentWrapper: {
    flex: 1,
    gap: 20,
  },
  instructionsContainer: {
    gap: 8,
  },
  instructionsTitle: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 4,
  },
  instructionsText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  disclaimer: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  statusTitle: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 16,
  },
  statusText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  scanningContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  scanningText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  mrzInfoContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  mrzInfoTitle: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  mrzInfoText: {
    color: '#475569',
    fontSize: 13,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#cbd5e1',
    opacity: 0.6,
  },
});
