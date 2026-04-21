// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import DatePicker from 'react-native-date-picker';

import { colors } from '@selfxyz/euclid';
import {
  parseMRZBirthDate,
  parseMRZExpiryDate,
} from '@selfxyz/mobile-sdk-alpha';

import {
  birthDateToDisplay,
  expiryDateToDisplay,
  pickerDateToYYMMDD,
} from '@/utils/yymmdd';

export interface InputFieldProps {
  type: InputFieldType;
  label: string;
  value?: string;
  placeholder?: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  style?: ViewStyle;
}

export type InputFieldType = 'alphanumeric' | 'date-of-birth' | 'expiry-date';

export const InputField: React.FC<InputFieldProps> = ({
  type,
  label,
  value,
  placeholder,
  onChangeText,
  editable = true,
  style,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleChangeText = (text: string) => {
    let processedText = text;
    if (type === 'alphanumeric') {
      processedText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }
    onChangeText?.(processedText);
  };

  if (type === 'date-of-birth' || type === 'expiry-date') {
    const displayValue =
      type === 'date-of-birth'
        ? birthDateToDisplay(value ?? '')
        : expiryDateToDisplay(value ?? '');

    const pickerDate =
      type === 'date-of-birth'
        ? parseMRZBirthDate(value ?? '')
        : parseMRZExpiryDate(value ?? '');

    return (
      <Pressable
        style={[styles.container, style]}
        onPress={() => editable && setShowDatePicker(true)}
      >
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{displayValue}</Text>
        <DatePicker
          modal
          open={showDatePicker}
          date={pickerDate}
          mode="date"
          title={label}
          confirmText="Confirm"
          cancelText="Cancel"
          onConfirm={date => {
            onChangeText?.(pickerDateToYYMMDD(date));
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
          theme="light"
        />
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.textInput}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.slate500}
        onChangeText={handleChangeText}
        editable={editable}
        keyboardType="default"
        autoCapitalize={type === 'alphanumeric' ? 'characters' : 'none'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: 44,
    height: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 7,
    elevation: 7,
  },
  label: {
    color: colors.slate500,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'DIN OT',
    flexShrink: 0,
  },
  value: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'DIN OT',
    textAlign: 'right',
    flex: 1,
  },
  textInput: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'DIN OT',
    textAlign: 'right',
    flex: 1,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
