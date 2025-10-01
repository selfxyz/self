// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

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
        {document && (
          <View style={styles.documentSection}>
            <Text style={styles.documentTitle}>Mock Document Data:</Text>
            <ScrollView style={styles.documentDataContainer} nestedScrollEnabled>
              <Text style={styles.documentData} selectable>
                {JSON.stringify(document, null, 2)}
              </Text>
            </ScrollView>
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
  documentDataContainer: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  documentData: {
    fontSize: 12,
    fontFamily: 'monospace',
    padding: 12,
  },
});
