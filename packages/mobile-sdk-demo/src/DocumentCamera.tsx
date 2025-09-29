// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  onBack: () => void;
};

export default function DocumentCamera({ onBack }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Document Camera</Text>
      <Text style={styles.subtitle}>Passport/ID Scanning</Text>

      <View style={styles.content}>
        <Text style={styles.description}>
          This screen would handle camera-based document scanning for passports and ID cards.
        </Text>

        <View style={styles.features}>
          <Text style={styles.featureTitle}>Features (Not Implemented):</Text>
          <Text style={styles.feature}>• Camera integration for document scanning</Text>
          <Text style={styles.feature}>• MRZ (Machine Readable Zone) detection</Text>
          <Text style={styles.feature}>• Document validation and parsing</Text>
          <Text style={styles.feature}>• Real-time feedback and guidance</Text>
        </View>
      </View>

      <Button title="Back to Menu" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  features: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  feature: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
});
