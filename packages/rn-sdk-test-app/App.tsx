// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useMemo, useState } from 'react';
import {
  NativeModules,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SelfVerification, type SelfSdkError, type VerificationResult } from '@selfxyz/rn-sdk';

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
    try {
      nativeModules.SelfMRZScannerModule = fallbackMrzScannerModule;
    } catch {
      // No-op: scanner stays unavailable until a native module is linked.
    }
  }
}

ensureMrzScannerModule();

type CallbackState =
  | { status: 'Idle' }
  | { status: 'Launching verification...' }
  | { status: 'Success'; payload: string }
  | { status: 'Failure'; code: string; message: string }
  | { status: 'Cancelled' };

function App(): React.JSX.Element {
  const [isVerifying, setIsVerifying] = useState(false);
  const [userId, setUserId] = useState('test-user');
  const [scope, setScope] = useState('identity');
  const [callback, setCallback] = useState<CallbackState>({ status: 'Idle' });

  const request = useMemo(
    () => ({
      userId: userId || undefined,
      scope: scope || undefined,
      disclosures: ['name', 'nationality', 'date_of_birth'],
    }),
    [userId, scope],
  );

  const handleSuccess = (result: VerificationResult) => {
    setCallback({
      status: 'Success',
      payload: JSON.stringify(result, null, 2),
    });
    setIsVerifying(false);
  };

  const handleFailure = (error: SelfSdkError) => {
    setCallback({
      status: 'Failure',
      code: error.code,
      message: error.message,
    });
    setIsVerifying(false);
  };

  const handleCancelled = () => {
    setCallback({ status: 'Cancelled' });
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
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>SDK Public API Test</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          This button validates SelfSdk.configure(...).launch(...) end-to-end.
        </Text>

        <Text style={styles.label}>User ID</Text>
        <TextInput
          style={styles.input}
          value={userId}
          onChangeText={setUserId}
          placeholder="test-user"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Scope</Text>
        <TextInput
          style={styles.input}
          value={scope}
          onChangeText={setScope}
          placeholder="identity"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            setCallback({ status: 'Launching verification...' });
            setIsVerifying(true);
          }}
        >
          <Text style={styles.primaryButtonText}>Launch Verification</Text>
        </TouchableOpacity>

        <View style={styles.callbackCard}>
          <Text style={styles.callbackLabel}>Callback Status: {callback.status}</Text>
          {callback.status === 'Failure' && (
            <>
              <Text style={styles.callbackDetail}>Error Code: {callback.code}</Text>
              <Text style={styles.callbackDetail}>Error Message: {callback.message}</Text>
            </>
          )}
          {callback.status === 'Success' && (
            <Text style={styles.callbackPayload}>{callback.payload}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7f8',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f6f7f8',
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: -8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  callbackCard: {
    backgroundColor: '#e8e5f0',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  callbackLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  callbackDetail: {
    fontSize: 13,
    color: '#374151',
  },
  callbackPayload: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#374151',
    lineHeight: 18,
  },
  verificationView: {
    flex: 1,
  },
});

export default App;
