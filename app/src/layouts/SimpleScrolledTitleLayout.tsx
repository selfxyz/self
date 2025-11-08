// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, YStack } from 'tamagui';

import {
  PrimaryButton,
  SecondaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';

type DetailListProps = PropsWithChildren<{
  title: string;
  onDismiss: () => void;
  secondaryButtonText?: string;
  onSecondaryButtonPress?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}>;

export default function SimpleScrolledTitleLayout({
  title,
  children,
  onDismiss,
  secondaryButtonText,
  onSecondaryButtonPress,
  header,
  footer,
}: DetailListProps) {
  const insets = useSafeAreaInsets();
  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.FullSection paddingTop={0} flex={1}>
        <YStack paddingTop={insets.top + 12}>
          <Title>{title}</Title>
          {header}
        </YStack>
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack paddingTop={0} paddingBottom={12} flex={1}>
            {children}
          </YStack>
        </ScrollView>
        {footer && (
          <YStack marginTop={8} marginBottom={12}>
            {footer}
          </YStack>
        )}
        {secondaryButtonText && onSecondaryButtonPress && (
          <SecondaryButton
            onPress={onSecondaryButtonPress}
            style={{ marginBottom: 12 }}
          >
            {secondaryButtonText}
          </SecondaryButton>
        )}
        {/* Anchor the Dismiss button to bottom with only safe area padding */}
        <YStack paddingBottom={insets.bottom + 8}>
          <PrimaryButton onPress={onDismiss}>Dismiss</PrimaryButton>
        </YStack>
      </ExpandableBottomLayout.FullSection>
    </ExpandableBottomLayout.Layout>
  );
}
