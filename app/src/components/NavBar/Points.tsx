// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Image,
  ScrollView,
  Text,
  View,
  XStack,
  YStack,
  ZStack,
} from 'tamagui';
import { BlurView } from '@react-native-community/blur';

import { PointHistoryList } from '@/components/PointHistoryList';
import BellWhiteIcon from '@/images/icons/bell_white.svg';
import LockWhiteIcon from '@/images/icons/lock_white.svg';
import StarBlackIcon from '@/images/icons/star_black.svg';
import LogoInversed from '@/images/logo_inversed.svg';
import MajongImage from '@/images/majong.png';
import {
  black,
  blue600,
  slate50,
  slate200,
  slate300,
  slate500,
  white,
} from '@/utils/colors';

const Points: React.FC = () => {
  const [selfPoints] = useState(312);
  const { bottom } = useSafeAreaInsets();

  const ListHeader = (
    <YStack paddingHorizontal={20} gap={20} paddingTop={20}>
      <XStack gap={22}>
        <View
          width={68}
          height={68}
          borderRadius={12}
          borderWidth={1}
          borderColor={slate300}
          alignItems="center"
          justifyContent="center"
          backgroundColor="white"
        >
          <LogoInversed width={33} height={33} />
        </View>
        <YStack gap={4}>
          <Text
            color={black}
            fontFamily="DIN OT"
            fontWeight="500"
            fontSize={32}
            lineHeight="100%"
            letterSpacing={-1}
            verticalAlign="middle"
          >
            {`${selfPoints} Self Points`}
          </Text>
          <Text
            color={black}
            width="60%"
            fontFamily="DIN OT"
            fontSize={16}
            fontStyle="normal"
            fontWeight="500"
            lineHeight="normal"
          >
            Earn points by referring friends, disclosing proof requests, and
            more.
          </Text>
        </YStack>
      </XStack>
      <XStack
        gap={22}
        backgroundColor="white"
        padding={16}
        borderRadius={17}
        borderWidth={1}
        borderColor={slate200}
      >
        <View
          width={60}
          height={60}
          borderRadius={16}
          alignItems="center"
          justifyContent="center"
          backgroundColor="black"
        >
          <BellWhiteIcon width={30} height={26} />
        </View>
        <YStack gap={4} justifyContent="center">
          <Text
            color={black}
            fontFamily="DIN OT"
            fontWeight="500"
            fontSize={16}
          >
            Turn on push notifications
          </Text>
          <Text color={slate500} fontFamily="DIN OT" fontSize={14}>
            Earn 20 points
          </Text>
        </YStack>
      </XStack>
      <XStack
        gap={22}
        backgroundColor="white"
        padding={16}
        borderRadius={17}
        borderWidth={1}
        borderColor={slate200}
      >
        <View
          width={60}
          height={60}
          borderRadius={16}
          alignItems="center"
          justifyContent="center"
          backgroundColor="black"
        >
          <LockWhiteIcon width={30} height={26} />
        </View>
        <YStack gap={4} justifyContent="center">
          <Text color={black} fontFamily="DIN OT" fontSize={16}>
            Backup your account
          </Text>
          <Text color={slate500} fontFamily="DIN OT" fontSize={14}>
            Earn 100 points
          </Text>
        </YStack>
      </XStack>
      <YStack
        height={270}
        backgroundColor="white"
        borderRadius={16}
        borderWidth={1}
        borderColor={slate200}
      >
        <ZStack borderBottomWidth={1} borderBottomColor={slate200} height={170}>
          <Image
            source={MajongImage}
            style={{
              width: '80%',
              height: '100%',
              position: 'absolute',
              right: 0,
              top: 0,
            }}
          />
          <StarBlackIcon
            width={24}
            height={24}
            style={{ marginLeft: 16, marginTop: 16 }}
          />
        </ZStack>
        <YStack padding={16} paddingBottom={32} gap={10}>
          <Text fontFamily="DIN OT" fontSize={16} color={black}>
            Refer friends and earn rewards
          </Text>
          <Text fontFamily="DIN OT" fontSize={16} color={blue600}>
            Refer now
          </Text>
        </YStack>
      </YStack>
    </YStack>
  );

  return (
    <YStack flex={1} backgroundColor={slate50}>
      <ZStack flex={1}>
        <ScrollView flex={1}>
          {ListHeader}
          <PointHistoryList />
        </ScrollView>
        <BlurView
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 100,
          }}
          blurType="light"
          blurAmount={4}
          reducedTransparencyFallbackColor={slate50}
          pointerEvents="none"
        />
        <YStack position="absolute" bottom={bottom + 20} left={20} right={20}>
          <Button
            backgroundColor={black}
            paddingHorizontal={20}
            paddingVertical={14}
            borderRadius={5}
            height={52}
          >
            <Text
              fontFamily="DIN OT"
              fontSize={16}
              color={white}
              textAlign="center"
            >
              Explore apps
            </Text>
          </Button>
        </YStack>
      </ZStack>
    </YStack>
  );
};

export default Points;
