// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import SafeAreaScrollView from './SafeAreaScrollView';
import StandardHeader from './StandardHeader';

type Props = {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  rightAction?: React.ReactNode;
};

export default function ScreenLayout({ title, onBack, children, contentStyle, rightAction }: Props) {
  return (
    <SafeAreaScrollView contentContainerStyle={styles.container} backgroundColor="#fafbfc">
      <StandardHeader title={title} onBack={onBack} rightAction={rightAction} />
      <View style={[styles.content, contentStyle]}>{children}</View>
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
  content: {
    flex: 1,
  },
});
