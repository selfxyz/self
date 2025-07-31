// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { PropsWithChildren } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, YStack } from 'tamagui';

import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { SecondaryButton } from '../components/buttons/SecondaryButton';
import { Title } from '../components/typography/Title';
import { white } from '../utils/colors';
import { ExpandableBottomLayout } from './ExpandableBottomLayout';

interface DetailListProps
  extends PropsWithChildren<{
    title: string;
    onDismiss: () => void;
    secondaryButtonText?: string;
    onSecondaryButtonPress?: () => void;
    header?: React.ReactNode;
    footer?: React.ReactNode;
  }> {}

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
          <YStack paddingTop={0} paddingBottom={20} flex={1}>
            {children}
          </YStack>
        </ScrollView>
        {footer && <YStack marginBottom={18}>{footer}</YStack>}
        {secondaryButtonText && onSecondaryButtonPress && (
          <SecondaryButton onPress={onSecondaryButtonPress} marginBottom={16}>
            {secondaryButtonText}
          </SecondaryButton>
        )}
        <YStack paddingBottom={insets.bottom + 12}>
          <PrimaryButton onPress={onDismiss}>Dismiss</PrimaryButton>
        </YStack>
      </ExpandableBottomLayout.FullSection>
    </ExpandableBottomLayout.Layout>
  );
}
