// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

type Props = {
  title: string;
  onBack: () => void;
  rightAction?: React.ReactNode;
};

export default function StandardHeader({ title, onBack, rightAction }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="chevron-back" size={20} color="#0550ae" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        {rightAction}
      </View>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: -12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#0550ae',
    fontWeight: '500',
    marginLeft: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d1117',
    textAlign: 'center',
  },
});
