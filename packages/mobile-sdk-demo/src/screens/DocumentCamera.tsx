// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import SafeAreaScrollView from '../components/SafeAreaScrollView';
import StandardHeader from '../components/StandardHeader';

type Props = {
  onBack: () => void;
};

export default function DocumentCamera({ onBack }: Props) {
  return (
    <SafeAreaScrollView contentContainerStyle={styles.container} backgroundColor="#fafbfc">
      <StandardHeader title="Document Camera" onBack={onBack} />

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
    </SafeAreaScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#fafbfc',
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
