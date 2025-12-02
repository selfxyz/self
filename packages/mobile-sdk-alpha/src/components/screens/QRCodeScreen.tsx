// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { ScreenProps } from '../../types/ui';

export const QRCodeScreen = ({ onSuccess, onFailure }: ScreenProps) => (
  <View style={styles.container}>
    <Text style={styles.title}>QR Code Scanner</Text>
    <TouchableOpacity style={styles.button} onPress={onSuccess}>
      <Text style={styles.buttonText}>Simulate Success</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.outlinedButton} onPress={() => onFailure(new Error('QR scan failed'))}>
      <Text style={styles.outlinedButtonText}>Simulate Failure</Text>
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
  outlinedButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  outlinedButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
