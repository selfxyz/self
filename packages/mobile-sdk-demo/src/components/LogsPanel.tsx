// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  logs: string[];
  show: boolean;
  onToggle: () => void;
};

export default function LogsPanel({ logs, show, onToggle }: Props) {
  if (logs.length === 0) return null;
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onToggle} style={styles.toggle}>
        <Text style={styles.toggleText}>{show ? `▼ Hide Logs (${logs.length})` : `▶ Show Logs (${logs.length})`}</Text>
      </TouchableOpacity>
      {show && (
        <ScrollView style={styles.logs} nestedScrollEnabled>
          {logs.map((log, idx) => (
            <Text key={idx} style={styles.entry}>
              {log}
            </Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  toggle: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  toggleText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '600',
  },
  logs: {
    marginTop: 8,
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffc107',
    padding: 8,
  },
  entry: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#333',
    marginBottom: 4,
  },
});
