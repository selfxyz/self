// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ScreenLayout from './ScreenLayout';

type Props = {
  title: string;
  onBack: () => void;
  description: string;
  features: string[];
};

export default function PlaceholderScreen({ title, onBack, description, features }: Props) {
  return (
    <ScreenLayout title={title} onBack={onBack}>
      <View style={styles.content}>
        <Text style={styles.description}>{description}</Text>

        <View style={styles.features}>
          <Text style={styles.featureTitle}>Features (Not Implemented):</Text>
          {features.map((f, idx) => (
            <Text key={`${idx}-${f}`} style={styles.feature}>
              • {f}
            </Text>
          ))}
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
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
