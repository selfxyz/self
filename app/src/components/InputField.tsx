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

export interface InputFieldProps {
  type: InputFieldType;
  label: string;
  value?: string;
  placeholder?: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  style?: ViewStyle;
}

export type InputFieldType = 'alphanumeric' | 'yymmdd';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const yymmddToDisplay = (yymmdd: string): string => {
  if (!yymmdd || yymmdd.length !== 6) return '';
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = parseInt(yymmdd.substring(2, 4), 10);
  const dd = yymmdd.substring(4, 6);
  const year = yy <= 30 ? 2000 + yy : 1900 + yy;
  return `${MONTHS[mm - 1]} ${dd} ${year}`;
};

const yymmddToPickerDate = (yymmdd: string): Date => {
  if (!yymmdd || yymmdd.length !== 6) return new Date();
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = parseInt(yymmdd.substring(2, 4), 10) - 1;
  const dd = parseInt(yymmdd.substring(4, 6), 10);
  const year = yy <= 30 ? 2000 + yy : 1900 + yy;
  return new Date(year, mm, dd);
};

const pickerDateToYYMMDD = (date: Date): string => {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
};

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

  const handleDatePress = () => {
    if (editable && type === 'yymmdd') {
      setShowDatePicker(true);
    }
  };

  const handleConfirm = (date: Date) => {
    onChangeText?.(pickerDateToYYMMDD(date));
    setShowDatePicker(false);
  };

  const handleCancel = () => {
    setShowDatePicker(false);
  };

  const handleChangeText = (text: string) => {
    let processedText = text;
    if (type === 'alphanumeric') {
      processedText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }
    onChangeText?.(processedText);
  };

  if (type === 'yymmdd') {
    return (
      <Pressable style={[styles.container, style]} onPress={handleDatePress}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{yymmddToDisplay(value ?? '')}</Text>
        <DatePicker
          modal
          open={showDatePicker}
          date={yymmddToPickerDate(value ?? '')}
          mode="date"
          title={label}
          confirmText="Confirm"
          cancelText="Cancel"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
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
        keyboardType={type === 'alphanumeric' ? 'default' : 'default'}
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
