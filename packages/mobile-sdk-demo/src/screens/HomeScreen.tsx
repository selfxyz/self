// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Logo from '../assets/images/logo.svg';
import SafeAreaScrollView from '../components/SafeAreaScrollView';
import MenuButton from '../components/MenuButton';
import type { ScreenContext } from './index';
import { orderedSectionEntries } from './index';

type Props = {
  screenContext: ScreenContext;
};

export default function HomeScreen({ screenContext }: Props) {
  const { navigate } = screenContext;

  // MenuButton moved to components/MenuButton for reuse

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
  // MenuButton styles moved into the component
});
