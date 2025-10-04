// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { type MRZInfo, type MRZValidation } from '@selfxyz/mobile-sdk-alpha';
import { MRZScannerView } from '@selfxyz/mobile-sdk-alpha/components';
import { useReadMRZ } from '@selfxyz/mobile-sdk-alpha/onboarding/read-mrz';

import ScreenLayout from '../components/ScreenLayout';
import {
  type NormalizedMRZResult,
  normalizeMRZPayload,
} from './documentCameraUtils';

type Props = {
  onBack: () => void;
};

type PermissionState = 'loading' | 'granted' | 'denied';
type ScanState = 'idle' | 'scanning' | 'success' | 'error';

const instructionsText =
  'Align the machine-readable text with the frame and hold steady while we scan.';

const successMessage = 'Document scan successful. Review the details below.';
const errorMessage = 'We could not read your document. Adjust lighting and try again.';
const permissionDeniedMessage =
  'Camera access was denied. Enable permissions to scan your document.';

function announceForAccessibility(message: string) {
  if (!message) {
    return;
  }

  try {
    AccessibilityInfo.announceForAccessibility?.(message);
  } catch {
    // Ignore announce errors to avoid crashing accessibility users.
  }
}

function humanizeDocumentType(documentType: string): string {
  if (documentType === 'P') {
    return 'Passport';
  }

  if (documentType === 'I') {
    return 'ID Card';
  }

  if (!documentType) {
    return 'Unknown';
  }

  return documentType.trim().toUpperCase();
}

function buildValidationRows(validation?: MRZValidation) {
  if (!validation) {
    return null;
  }

  return [
    { label: 'Format', value: validation.format },
    { label: 'Document number checksum', value: validation.passportNumberChecksum },
    { label: 'Date of birth checksum', value: validation.dateOfBirthChecksum },
    { label: 'Expiry date checksum', value: validation.dateOfExpiryChecksum },
    { label: 'Composite checksum', value: validation.compositeChecksum },
    { label: 'Overall validation', value: validation.overall },
  ];
}

export default function DocumentCamera({ onBack }: Props) {
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('loading');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [mrzResult, setMrzResult] = useState<NormalizedMRZResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scanStartTimeRef = useRef<number>(Date.now());
  const { onPassportRead } = useReadMRZ(scanStartTimeRef);

  const requestPermission = useCallback(async () => {
    setPermissionStatus('loading');
    setError(null);

    if (Platform.OS === 'android') {
      try {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera permission',
            message: 'We need your permission to access the camera for MRZ scanning.',
            buttonPositive: 'Allow',
            buttonNegative: 'Cancel',
            buttonNeutral: 'Ask me later',
          },
        );

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionStatus('granted');
        } else {
          setPermissionStatus('denied');
        }
      } catch {
        setPermissionStatus('denied');
        setError('Camera permission request failed. Please try again.');
      }
    } else {
      setPermissionStatus('granted');
    }
  }, []);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    if (permissionStatus === 'granted') {
      announceForAccessibility(instructionsText);
      setScanState(current => {
        if (current === 'success') {
          return current;
        }
        scanStartTimeRef.current = Date.now();
        return 'scanning';
      });
    } else if (permissionStatus === 'denied') {
      announceForAccessibility(permissionDeniedMessage);
      setScanState('idle');
    }
  }, [permissionStatus]);

  useEffect(() => {
    if (scanState === 'success') {
      announceForAccessibility(successMessage);
    } else if (scanState === 'error') {
      announceForAccessibility(errorMessage);
    }
  }, [scanState]);

  useEffect(() => {
    if (error) {
      announceForAccessibility(error);
    }
  }, [error]);

  const handleMRZDetected = useCallback(
    (payload: MRZInfo) => {
      setError(null);

      setScanState(current => {
        if (current === 'success') {
          return current;
        }
        return 'scanning';
      });

      try {
        const normalized = normalizeMRZPayload(payload);
        setMrzResult(normalized);
        setScanState('success');
        onPassportRead(null, normalized.info);
      } catch {
        setScanState('error');
        setError('Unable to validate the MRZ data from the scan.');
      }
    },
    [onPassportRead],
  );

  const handleScannerError = useCallback((scannerError: string) => {
    setScanState('error');
    setError(scannerError || 'An unexpected camera error occurred.');
  }, []);

  const handleScanAgain = useCallback(() => {
    if (permissionStatus === 'denied') {
      requestPermission();
      return;
    }

    scanStartTimeRef.current = Date.now();
    setMrzResult(null);
    setError(null);
    setScanState('scanning');
    announceForAccessibility('Ready to scan again. Align the document in the viewfinder.');
  }, [permissionStatus, requestPermission]);

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

  const validationRows = useMemo(() => buildValidationRows(mrzResult?.info.validation), [mrzResult]);

  const renderPermissionDenied = () => (
    <View style={styles.centeredState}>
      <Text style={styles.permissionText}>{permissionDeniedMessage}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.secondaryButton}
        onPress={requestPermission}
      >
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
            <View
              style={styles.overlay}
              accessibilityLiveRegion="polite"
              pointerEvents="none"
            >
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

            {scanState === 'error' && error && (
              <Text style={[styles.statusText, styles.errorText]}>{error}</Text>
            )}
          </View>

          {mrzResult && (
            <View style={styles.resultCard} accessible accessibilityRole="summary">
              <Text style={styles.resultTitle}>Scan summary</Text>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Document number</Text>
                <Text style={styles.resultValue}>{mrzResult.info.documentNumber}</Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Document type</Text>
                <Text style={styles.resultValue}>{humanizeDocumentType(mrzResult.info.documentType)}</Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Issuing country</Text>
                <Text style={styles.resultValue}>{mrzResult.info.issuingCountry || 'Unknown'}</Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Date of birth</Text>
                <Text style={styles.resultValue}>{mrzResult.readableBirthDate}</Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Expiry date</Text>
                <Text style={styles.resultValue}>{mrzResult.readableExpiryDate}</Text>
              </View>

              <View style={styles.validationSection}>
                <Text style={styles.validationTitle}>Validation checks</Text>
                {validationRows ? (
                  validationRows.map(row => (
                    <View key={row.label} style={styles.validationRow}>
                      <Text style={styles.validationLabel}>{row.label}</Text>
                      <Text
                        style={[
                          styles.validationBadge,
                          row.value ? styles.validationPass : styles.validationFail,
                        ]}
                        accessibilityRole="text"
                      >
                        {row.value ? '✓ Pass' : '✗ Fail'}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.validationPlaceholder}>
                    Validation details are not available for this scan yet.
                  </Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleScanAgain}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Scan Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleSaveDocument}
              style={styles.primaryButton}
            >
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
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: {
    color: '#334155',
    fontWeight: '500',
    fontSize: 14,
  },
  resultValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  validationSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  validationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  validationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  validationLabel: {
    color: '#1f2937',
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  validationBadge: {
    minWidth: 90,
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    fontWeight: '600',
    fontSize: 12,
    color: '#ffffff',
  },
  validationPass: {
    backgroundColor: '#16a34a',
  },
  validationFail: {
    backgroundColor: '#b91c1c',
  },
  validationPlaceholder: {
    color: '#475569',
    fontSize: 13,
    fontStyle: 'italic',
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
