// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useMemo, useState } from 'react';
import { NativeModules, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SelfVerification, type SelfSdkError, type VerificationResult } from '@selfxyz/rn-sdk';

const defaultRequest = {
  userId: 'rn-test-user',
  scope: 'rn-sdk-test',
  disclosures: [],
};

const fallbackMrzScannerModule = {
  startScanning: async () => ({
    documentNumber: 'XK0000000',
    dateOfBirth: '900101',
    dateOfExpiry: '300101',
    documentType: 'P',
    countryCode: 'UTO',
  }),
};

function ensureMrzScannerModule(): void {
  const nativeModules = NativeModules as Record<string, unknown>;

  const selfScanner = nativeModules.SelfMRZScannerModule as
    | { startScanning?: unknown }
    | undefined;
  const legacyScanner = nativeModules.MRZScannerModule as
    | { startScanning?: unknown }
    | undefined;

  const hasScanner =
    typeof selfScanner?.startScanning === 'function' ||
    typeof legacyScanner?.startScanning === 'function';

  if (!hasScanner) {
    // Keep camera bridge round-trip testable in this harness when host-native MRZ isn't wired.
    nativeModules.SelfMRZScannerModule = fallbackMrzScannerModule;
  }
}

ensureMrzScannerModule();

function App(): React.JSX.Element {
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState('Ready');

  const request = useMemo(() => defaultRequest, []);

  const handleSuccess = (result: VerificationResult) => {
    setStatus(`Success: ${result.verificationId ?? 'no verificationId'}`);
    setIsVerifying(false);
  };

  const handleFailure = (error: SelfSdkError) => {
    setStatus(`Failure: ${error.code} - ${error.message}`);
    setIsVerifying(false);
  };

  const handleCancelled = () => {
    setStatus('Cancelled');
    setIsVerifying(false);
  };

  if (isVerifying) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <SelfVerification
          request={request}
          onSuccess={handleSuccess}
          onFailure={handleFailure}
          onCancelled={handleCancelled}
          debug={__DEV__}
          style={styles.verificationView}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Text style={styles.title}>RN SDK Test Harness</Text>
        <Text style={styles.subtitle}>Status: {status}</Text>
        <TouchableOpacity style={styles.button} onPress={() => setIsVerifying(true)}>
          <Text style={styles.buttonText}>Launch Verification</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7f8',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  verificationView: {
    flex: 1,
  },
});

export default App;
