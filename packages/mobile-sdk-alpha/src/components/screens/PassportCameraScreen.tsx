// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { PassportCameraProps } from '../../types/ui';
import { MRZScannerView } from '../MRZScannerView';

// Simple placeholder component - this would be replaced with actual camera UI
export const PassportCameraScreen = ({ onMRZDetected }: PassportCameraProps) => (
  <View style={styles.container}>
    <Text style={styles.title}>Passport Camera</Text>

    <MRZScannerView onMRZDetected={onMRZDetected} />

    <TouchableOpacity
      style={styles.button}
      onPress={() =>
        onMRZDetected({
          documentNumber: 'L898902C3',
          dateOfBirth: '740812',
          dateOfExpiry: '120415',
          issuingCountry: 'UTO',
          documentType: 'P',
          validation: {
            format: true,
            passportNumberChecksum: true,
            dateOfBirthChecksum: true,
            dateOfExpiryChecksum: true,
            compositeChecksum: true,
            overall: true,
          },
        })
      }
    >
      <Text style={styles.buttonText}>Simulate MRZ Detection</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
