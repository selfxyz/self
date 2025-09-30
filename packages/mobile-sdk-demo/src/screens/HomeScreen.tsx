// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import SafeAreaScrollView from '../components/SafeAreaScrollView';
import { orderedSectionEntries, screenMap, type ScreenContext } from './index';

type Props = {
  screenContext: ScreenContext;
};

export default function HomeScreen({ screenContext }: Props) {
  const { navigate } = screenContext;

  const MenuButton = ({
    title,
    subtitle,
    onPress,
    isWorking = false,
    disabled = false,
  }: {
    title: string;
    subtitle?: string;
    onPress: () => void;
    isWorking?: boolean;
    disabled?: boolean;
  }) => (
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
          style={[styles.menuButtonSubtitle, disabled ? styles.disabledSubtitleText : styles.placeholderButtonSubtitle]}
        >
          {subtitle}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaScrollView contentContainerStyle={styles.container} backgroundColor="#f8f9fa">
      <View style={styles.header}>
        <Text style={styles.title}>Self Demo App</Text>
        <Text style={styles.subtitle}>Mobile SDK Alpha - Available Screens</Text>
      </View>

      {orderedSectionEntries.map(({ title, items }) => (
        <View key={title} style={styles.section}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {items.map(descriptor => {
            const status = descriptor.getStatus?.(screenContext) ?? descriptor.status;
            const disabled = descriptor.isDisabled?.(screenContext) ?? false;
            const subtitleValue =
              typeof descriptor.subtitle === 'function' ? descriptor.subtitle(screenContext) : descriptor.subtitle;

            return (
              <MenuButton
                key={descriptor.id}
                title={descriptor.title}
                subtitle={subtitleValue}
                onPress={() => navigate(descriptor.id)}
                isWorking={status === 'working'}
                disabled={disabled}
              />
            );
          })}
        </View>
      ))}
    </SafeAreaScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  menuButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  workingButton: {
    backgroundColor: '#007AFF',
  },
  placeholderButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  menuButtonSubtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  workingButtonText: {
    color: '#fff',
  },
  placeholderButtonText: {
    color: '#666',
  },
  placeholderButtonSubtitle: {
    color: '#666',
  },
  disabledButton: {
    backgroundColor: '#f2f4f6',
    borderColor: '#d0d7de',
  },
  disabledButtonText: {
    color: '#9aa1a9',
  },
  disabledSubtitleText: {
    color: '#b0b7bf',
  },
});
