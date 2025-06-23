//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import React from 'react';
import { ScrollView, YStack } from 'tamagui';

import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { SecondaryButton } from '../components/buttons/SecondaryButton';
import { Title } from '../components/typography/Title';
import { white } from '../utils/colors';
import { ExpandableBottomLayout } from './ExpandableBottomLayout';

interface DetailListProps
  extends React.PropsWithChildren<{
    title: string;
    onDismiss: () => void;
    secondaryButtonText?: string;
    onSecondaryButtonPress?: () => void;
  }> {}

export default function SimpleScrolledTitleLayout({
  title,
  children,
  onDismiss,
  secondaryButtonText,
  onSecondaryButtonPress,
}: DetailListProps) {
  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.FullSection paddingTop={0} flex={1}>
        <ScrollView flex={1}>
          <YStack paddingTop={20}>
            <Title>{title}</Title>
            <YStack paddingVertical={20} flex={1}>
              {children}
            </YStack>
          </YStack>
        </ScrollView>

        {secondaryButtonText && onSecondaryButtonPress && (
          <SecondaryButton onPress={onSecondaryButtonPress} mb="$2">
            {secondaryButtonText}
          </SecondaryButton>
        )}
        <PrimaryButton onPress={onDismiss}>Dismiss</PrimaryButton>
      </ExpandableBottomLayout.FullSection>
    </ExpandableBottomLayout.Layout>
  );
}
