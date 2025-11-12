// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Text, YStack } from 'tamagui';

import { black, slate500 } from '@/utils/colors';
import { dinot } from '@/utils/fonts';

const PointsInfoScreen: React.FC = () => {
  const { left, right, bottom } = useSafeAreaInsets();

  return (
    <YStack
      flex={1}
      paddingLeft={left}
      paddingRight={right}
      paddingBottom={bottom}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={32} paddingHorizontal={20}>
          <YStack gap={16}>
            <Text
              color={black}
              fontFamily={dinot}
              fontSize={24}
              fontWeight="600"
              lineHeight={28}
            >
              What are Self Points?
            </Text>
            <Text
              color={slate500}
              fontFamily={dinot}
              fontSize={16}
              fontWeight="400"
              lineHeight={24}
            >
              Self Points are rewards you earn for engaging with the Self
              platform. You can earn points by:
            </Text>
            <YStack gap={12} paddingLeft={8}>
              <Text
                color={slate500}
                fontFamily={dinot}
                fontSize={16}
                fontWeight="400"
                lineHeight={24}
              >
                - referring friends to Self
              </Text>
              <Text
                color={slate500}
                fontFamily={dinot}
                fontSize={16}
                fontWeight="400"
                lineHeight={24}
              >
                - disclosing proof requests to verified applications
              </Text>
              <Text
                color={slate500}
                fontFamily={dinot}
                fontSize={16}
                fontWeight="400"
                lineHeight={24}
              >
                - enabling notifications
              </Text>
              <Text
                color={slate500}
                fontFamily={dinot}
                fontSize={16}
                fontWeight="400"
                lineHeight={24}
              >
                - backing up your account securely
              </Text>
            </YStack>
          </YStack>
          <YStack gap={16}>
            <Text
              color={black}
              fontFamily={dinot}
              fontSize={24}
              fontWeight="600"
              lineHeight={28}
            >
              Why are Self Points Distributed Only on Sundays?
            </Text>
            <Text
              color={slate500}
              fontFamily={dinot}
              fontSize={16}
              fontWeight="400"
              lineHeight={24}
            >
              Self Points are distributed every Sunday at noon UTC to ensure
              privacy and security.
            </Text>
          </YStack>
          <Text
            color={slate500}
            fontFamily={dinot}
            fontSize={16}
            fontWeight="400"
            lineHeight={24}
          >
            Any points you earn during the week will be added to your account on
            the following Sunday. You can see pending points in your account,
            and they will be automatically credited at the next distribution
            time.
          </Text>
          <Text
            color={slate500}
            fontFamily={dinot}
            fontSize={16}
            fontWeight="400"
            lineHeight={24}
          >
            Come back every Sunday to see your total points!
          </Text>
        </YStack>
      </ScrollView>
    </YStack>
  );
};

export default PointsInfoScreen;
