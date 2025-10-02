// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

type Props = {
  title: string;
  subtitle?: string;
  onPress: () => void;
  isWorking?: boolean;
  disabled?: boolean;
};

export default function MenuButton({ title, subtitle, onPress, isWorking = false, disabled = false }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.menuButton,
        isWorking ? styles.workingButton : styles.placeholderButton,
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text
        style={[
          styles.menuButtonText,
          isWorking ? styles.workingButtonText : styles.placeholderButtonText,
          disabled && styles.disabledButtonText,
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            styles.menuButtonSubtitle,
            disabled
              ? styles.disabledSubtitleText
              : isWorking
                ? styles.workingButtonSubtitle
                : styles.placeholderButtonSubtitle,
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#1f2328',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  workingButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d9e0',
  },
  placeholderButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d9e0',
  },
  menuButtonText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  menuButtonSubtitle: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.9,
  },
  workingButtonText: {
    color: '#0d1117',
  },
  placeholderButtonText: {
    color: '#0d1117',
  },
  placeholderButtonSubtitle: {
    color: '#656d76',
  },
  workingButtonSubtitle: {
    color: '#656d76',
  },
  disabledButton: {
    backgroundColor: '#f6f8fa',
    borderColor: '#d1d9e0',
    opacity: 0.7,
  },
  disabledButtonText: {
    color: '#8b949e',
  },
  disabledSubtitleText: {
    color: '#656d76',
  },
});
