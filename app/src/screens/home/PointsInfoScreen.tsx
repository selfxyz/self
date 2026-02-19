// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { useResponsiveScale } from '@/hooks/useResponsiveScale';
import {
  getModalCallbacks,
  unregisterModalCallbacks,
} from '@/utils/modalCallbackRegistry';

type PointsInfoScreenProps = StaticScreenProps<
  | {
      showNextButton?: boolean;
      callbackId?: number;
    }
  | undefined
>;

interface EarnPointsItemProps {
  s: (value: number) => number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const EarnPointsItem = ({
  title,
  description,
  icon,
  s,
}: EarnPointsItemProps) => {
  const localStyles = React.useMemo(() => createStyles(s), [s]);

  return (
    <XStack
      padding={s(10)}
      backgroundColor={slate50}
      borderRadius={s(10)}
      gap={s(20)}
      alignItems="center"
    >
      <View
        style={localStyles.iconContainer}
        alignItems="center"
        justifyContent="center"
      >
        {icon}
      </View>
      <YStack gap={s(4)} flex={1}>
        <Text style={localStyles.pointsItemTitle}>{title}</Text>
        <Text style={localStyles.pointsItemDescription}>{description}</Text>
      </YStack>
    </XStack>
  );
};

const EARN_POINTS_ITEMS = [
  {
    title: 'Inviting friends to Self',
    description:
      "You'll both receive Self Points after your friend signs their first proof.",
    iconType: 'star' as const,
  },
  {
    title: 'Signing proof requests',
    description:
      'Every successful proof that you sign will reward you with Self Points.',
    iconType: 'checkmark' as const,
  },
  {
    title: 'Enabling push notifications',
    description: 'Instantly earn Self Points by activating push notifications.',
    iconType: 'push' as const,
  },
  {
    title: 'Activate cloud back up',
    description:
      'Securely back up your account in settings to earn Self Points instantly.',
    iconType: 'cloud' as const,
  },
];

const PointsInfoScreen: React.FC<PointsInfoScreenProps> = ({
  route: { params },
}) => {
  const { showNextButton, callbackId } = params || {};
  const s = useResponsiveScale();
  const localStyles = React.useMemo(() => createStyles(s), [s]);
  const { left, right, bottom } = useSafeAreaInsets();
  const callbacks = useMemo(
    () => (callbackId ? getModalCallbacks(callbackId) : undefined),
    [callbackId],
  );
  const buttonPressedRef = useRef(false);

  const handleNextPress = useCallback(() => {
    if (callbackId !== undefined) {
      buttonPressedRef.current = true;
    }
    callbacks?.onButtonPress();
  }, [callbackId, callbacks]);

  useEffect(() => {
    return () => {
      if (callbackId !== undefined) {
        if (!buttonPressedRef.current) {
          callbacks?.onModalDismiss();
        }
        unregisterModalCallbacks(callbackId);
      }
    };
  }, [callbackId, callbacks]);

  const renderIcon = (
    iconType: (typeof EARN_POINTS_ITEMS)[number]['iconType'],
  ) => {
    const size = s(40);
    switch (iconType) {
      case 'star':
        return <StarIcon width={size} height={size} color={black} />;
      case 'checkmark':
        return <CheckmarkSquareIcon width={size} height={size} color={black} />;
      case 'push':
        return (
          <PushNotificationsIcon width={size} height={size} color={black} />
        );
      case 'cloud':
        return <CloudBackupIcon width={size} height={size} color={black} />;
    }
  };

  return (
    <YStack flex={1} gap={s(40)} paddingBottom={bottom} backgroundColor={white}>
      <Image
        source={Referral}
        style={{
          width: '100%',
          height: s(300),
          resizeMode: 'cover',
        }}
      />
      <ScrollView paddingLeft={s(20) + left} paddingRight={s(20) + right}>
        <YStack gap={s(20)}>
          <YStack gap={s(2)}>
            <Title>How it works</Title>
            <Text style={localStyles.description}>
              Self Points are rewards you earn for engaging with the Self
              platform. You can earn Points by:
            </Text>
          </YStack>
          <YStack gap={s(10)}>
            {EARN_POINTS_ITEMS.map(item => (
              <EarnPointsItem
                key={item.title}
                title={item.title}
                description={item.description}
                icon={renderIcon(item.iconType)}
                s={s}
              />
            ))}
          </YStack>
          <YStack gap={s(2)}>
            <Title>Points are deposited at noon UTC every Sunday</Title>
            <Text style={localStyles.description}>
              To ensure privacy and security on-chain, points are deposited into
              your wallet every Sunday at noon UTC.
            </Text>
          </YStack>
          <YStack style={localStyles.instructionsContainer} gap={s(12)}>
            <Text style={localStyles.instructionsText}>
              Any points that you earn during the week will be added to your
              account on the following Sunday.
            </Text>
            <Text style={localStyles.instructionsText}>
              You can track your incoming points in the Self app along with the
              countdown to Self Sunday every week.
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
      {showNextButton && (
        <View
          paddingTop={s(20)}
          paddingLeft={s(20) + left}
          paddingRight={s(20) + right}
        >
          <PrimaryButton onPress={handleNextPress}>Next</PrimaryButton>
        </View>
      )}
    </YStack>
  );
};

export default PointsInfoScreen;

const createStyles = (s: (value: number) => number) =>
  StyleSheet.create({
    description: {
      fontFamily: dinot,
      fontSize: s(18),
      fontWeight: '500',
      color: black,
    },
    instructionsContainer: {
      fontFamily: dinot,
      fontSize: s(16),
      fontWeight: '500',
      color: slate500,
      backgroundColor: slate50,
      paddingVertical: s(20),
      paddingHorizontal: s(10),
      borderRadius: s(10),
    },
    instructionsText: {
      fontFamily: dinot,
      fontSize: s(16),
      fontWeight: '500',
      color: slate500,
    },
    iconContainer: {
      width: s(40),
      height: s(40),
      alignItems: 'center',
      justifyContent: 'center',
    },
    pointsItemTitle: {
      fontFamily: dinot,
      fontSize: s(18),
      fontWeight: '500',
      color: black,
    },
    pointsItemDescription: {
      fontFamily: dinot,
      fontSize: s(16),
      fontWeight: '500',
      color: slate500,
    },
  });
