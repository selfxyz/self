// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Stack } from 'tamagui';

import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { SecondaryButton } from '@/components/buttons/SecondaryButton';
import { Title } from '@/components/typography/Title';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { white } from '@/utils/colors';

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
        <Stack paddingTop={insets.top + 12}>
          <Title>{title}</Title>
          {header}
        </Stack>
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <Stack paddingTop={0} paddingBottom={12} flex={1}>
            {children}
          </Stack>
        </ScrollView>
        {footer && (
          <Stack marginTop={8} marginBottom={12}>
            {footer}
          </Stack>
        )}
        {secondaryButtonText && onSecondaryButtonPress && (
          <SecondaryButton onPress={onSecondaryButtonPress} marginBottom={12}>
            {secondaryButtonText}
          </SecondaryButton>
        )}
        {/* Anchor the Dismiss button to bottom with only safe area padding */}
        <Stack paddingBottom={insets.bottom + 8}>
          <PrimaryButton onPress={onDismiss}>Dismiss</PrimaryButton>
        </Stack>
      </ExpandableBottomLayout.FullSection>
    </ExpandableBottomLayout.Layout>
  );
}
