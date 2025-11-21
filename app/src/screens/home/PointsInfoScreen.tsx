// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Text, View, XStack, YStack } from 'tamagui';
import type { StaticScreenProps } from '@react-navigation/native';

import { PrimaryButton, Title } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate50,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import CheckmarkSquareIcon from '@/assets/icons/checkmark_square.svg';
import CloudBackupIcon from '@/assets/icons/cloud_backup.svg';
import PushNotificationsIcon from '@/assets/icons/push_notifications.svg';
import StarIcon from '@/assets/icons/star.svg';
import Referral from '@/assets/images/referral.png';

type PointsInfoScreenProps = StaticScreenProps<
  | {
      showNextButton?: boolean;
      onNextButtonPress?: () => void;
    }
  | undefined
>;

interface EarnPointsItemProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const EarnPointsItem = ({ title, description, icon }: EarnPointsItemProps) => {
  return (
    <XStack
      padding={10}
      backgroundColor={slate50}
      borderRadius={10}
      gap={20}
      alignItems="center"
    >
      <View
        style={styles.iconContainer}
        alignItems="center"
        justifyContent="center"
      >
        {icon}
      </View>
      <YStack gap={4} flex={1}>
        <Text style={styles.pointsItemTitle}>{title}</Text>
        <Text style={styles.pointsItemDescription}>{description}</Text>
      </YStack>
    </XStack>
  );
};

const EARN_POINTS_ITEMS = [
  {
    title: 'Inviting friends to Self',
    description:
      "You'll both receive Self Points after your friend signs their first proof.",
    icon: <StarIcon width={40} height={40} color={black} />,
  },
  {
    title: 'Signing proof requests',
    description:
      'Every successful proof that you sign will reward you with Self Points.',
    icon: <CheckmarkSquareIcon width={40} height={40} color={black} />,
  },
  {
    title: 'Enabling push notifications',
    description: 'Instantly earn Self Points by activating push notifications.',
    icon: <PushNotificationsIcon width={40} height={40} color={black} />,
  },
  {
    title: 'Activate cloud back up',
    description:
      'Securely back up your account in settings to earn Self Points instantly.',
    icon: <CloudBackupIcon width={40} height={40} color={black} />,
  },
];

const PointsInfoScreen: React.FC<PointsInfoScreenProps> = ({
  route: { params },
}) => {
  const { showNextButton, onNextButtonPress } = params || {};
  const { left, right, bottom } = useSafeAreaInsets();

  return (
    <YStack flex={1} gap={40} paddingBottom={bottom} backgroundColor={white}>
      <Image
        source={Referral}
        style={{
          width: '100%',
          height: 300,
          resizeMode: 'cover',
        }}
      />
      <ScrollView paddingLeft={20 + left} paddingRight={20 + right}>
        <YStack gap={20}>
          <YStack gap={2}>
            <Title>How it works</Title>
            <Text style={styles.description}>
              Self Points are rewards you earn for engaging with the Self
              platform. You can earn Points by:
            </Text>
          </YStack>
          <YStack gap={10}>
            {EARN_POINTS_ITEMS.map(item => (
              <EarnPointsItem key={item.title} {...item} />
            ))}
          </YStack>
          <YStack gap={2}>
            <Title>Points are deposited at noon UTC every Sunday</Title>
            <Text style={styles.description}>
              To ensure privacy and security on-chain, points are deposited into
              your wallet every Sunday at noon UTC.
            </Text>
          </YStack>
          <YStack style={styles.instructionsContainer} gap={12}>
            <Text style={styles.instructionsText}>
              Any points that you earn during the week will be added to your
              account on the following Sunday.
            </Text>
            <Text style={styles.instructionsText}>
              You can track your incoming points in the Self app along with the
              countdown to Self Sunday every week.
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
      {showNextButton && (
        <View paddingTop={20} paddingLeft={20 + left} paddingRight={20 + right}>
          <PrimaryButton onPress={onNextButtonPress}>Next</PrimaryButton>
        </View>
      )}
    </YStack>
  );
};

export default PointsInfoScreen;

const styles = StyleSheet.create({
  description: {
    fontFamily: dinot,
    fontSize: 18,
    fontWeight: '500',
    color: black,
  },
  instructionsContainer: {
    fontFamily: dinot,
    fontSize: 16,
    fontWeight: '500',
    color: slate500,
    backgroundColor: slate50,
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  instructionsText: {
    fontFamily: dinot,
    fontSize: 16,
    fontWeight: '500',
    color: slate500,
  },
  nextButton: {
    textTransform: 'uppercase',
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsItemTitle: {
    fontFamily: dinot,
    fontSize: 18,
    fontWeight: '500',
    color: black,
  },
  pointsItemDescription: {
    fontFamily: dinot,
    fontSize: 16,
    fontWeight: '500',
    color: slate500,
  },
});
