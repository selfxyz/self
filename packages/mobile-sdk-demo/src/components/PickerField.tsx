// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SimplePicker } from './SimplePicker';
import type { PickerItem } from './SimplePicker';

export { type PickerItem };

export function PickerField({
  label,
  selectedValue,
  onValueChange,
  items,
  enabled = true,
}: {
  label: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: PickerItem[];
  enabled?: boolean;
}) {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <SimplePicker enabled={enabled} selectedValue={selectedValue} onValueChange={onValueChange} items={items} />
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 10,
  },
  label: {
    marginBottom: 4,
    fontWeight: '600',
    color: '#333',
    fontSize: 14,
  },
});
