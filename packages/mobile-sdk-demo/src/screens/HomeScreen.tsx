// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Logo from '../assets/images/logo.svg';
import SafeAreaScrollView from '../components/SafeAreaScrollView';
import { orderedSectionEntries, type ScreenContext } from './index';

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

  return (
    <SafeAreaScrollView contentContainerStyle={styles.container} backgroundColor="#fafbfc">
      <View style={styles.header}>
        <Logo width={40} height={40} style={styles.logo} />
        <Text style={styles.title}>Self Demo App</Text>
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
    backgroundColor: '#fafbfc',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  logo: {
    marginRight: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    color: '#0d1117',
    marginBottom: 0,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#656d76',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  tagline: {
    fontSize: 15,
    color: '#8b949e',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
    color: '#656d76',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
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
