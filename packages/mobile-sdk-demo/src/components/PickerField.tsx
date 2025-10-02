// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/Ionicons';

export type PickerItem = { label: string; value: string };

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
      <View style={styles.pickerContainer}>
        <Picker
          enabled={enabled}
          selectedValue={selectedValue}
          onValueChange={(itemValue: string) => onValueChange(itemValue)}
          style={styles.picker}
        >
          {items.map(({ label: itemLabel, value }) => (
            <Picker.Item label={itemLabel} value={value} key={value} />
          ))}
        </Picker>
        {Platform.OS === 'ios' && <Icon name="chevron-down-outline" size={20} color="#000" style={styles.pickerIcon} />}
      </View>
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
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  picker: {
    flex: 1,
    color: '#000',
    ...Platform.select({
      ios: {
        height: 40,
      },
      android: {
        height: 40,
      },
    }),
  },
  pickerIcon: {
    position: 'absolute',
    right: 12,
    top: 10,
    ...Platform.select({
      ios: {
        top: 10,
      },
    }),
  },
});
