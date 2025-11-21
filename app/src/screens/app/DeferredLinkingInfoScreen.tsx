// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';

import {
  Description,
  PrimaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { confirmTap } from '@/integrations/haptics';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';

const DeferredLinkingInfoScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <YStack flex={1} justifyContent="flex-end" paddingBottom="$4">
          <Title style={{ color: white }}>Deferred linking</Title>
        </YStack>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={white}>
        <YStack gap="$2.5">
          <Description style={{ textAlign: 'left' }}>
            To use this feature, you need to come from a website implementing
            Self deferred linking. This will copy the request to your clipboard.
          </Description>
          <Description style={{ textAlign: 'left', marginTop: 10 }}>
            Right now, the clipboard is empty or what's inside is not related to
            Self. You may also see this if your token was already consumed or
            has expired.
          </Description>
          <PrimaryButton
            style={{ marginVertical: 30 }}
            onPress={() => {
              confirmTap();
              navigation.goBack();
            }}
          >
            Got it
          </PrimaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default DeferredLinkingInfoScreen;
