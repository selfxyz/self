// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { IDDocument } from '@selfxyz/common/dist/esm/src/utils/types.js';

import SafeAreaScrollView from '../components/SafeAreaScrollView';
import StandardHeader from '../components/StandardHeader';

type Props = {
  document: IDDocument | null;
  onBack: () => void;
};

export default function RegisterDocument({ document, onBack }: Props) {
  return (
    <SafeAreaScrollView contentContainerStyle={styles.container} backgroundColor="#fafbfc">
      <StandardHeader title="Register Document" subtitle="Document Registration Flow" onBack={onBack} />

      <View style={styles.content}>
        <Text style={styles.description}>
          This screen would handle document registration with the Self network for identity verification.
        </Text>

        <View style={styles.features}>
          <Text style={styles.featureTitle}>Features (Not Implemented):</Text>
          <Text style={styles.feature}>• Document validation and verification</Text>
          <Text style={styles.feature}>• Zero-knowledge proof generation</Text>
          <Text style={styles.feature}>• Blockchain registration</Text>
          <Text style={styles.feature}>• OFAC compliance checks</Text>
          <Text style={styles.feature}>• Identity attestation</Text>
        </View>

        {document && (
          <View style={styles.documentSection}>
            <Text style={styles.documentTitle}>Mock Document Data:</Text>
            <Text style={styles.documentData} selectable>
              {JSON.stringify(document, null, 2)}
            </Text>
          </View>
        )}
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
  documentSection: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  documentData: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
});
