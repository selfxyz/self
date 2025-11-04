// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Image, Text, View, XStack, YStack, ZStack } from 'tamagui';
import { BlurView } from '@react-native-community/blur';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PointHistoryList } from '@/components/PointHistoryList';
import BellWhiteIcon from '@/images/icons/bell_white.svg';
import ClockIcon from '@/images/icons/clock.svg';
import LockWhiteIcon from '@/images/icons/lock_white.svg';
import StarBlackIcon from '@/images/icons/star_black.svg';
import LogoInversed from '@/images/logo_inversed.svg';
import MajongImage from '@/images/majong.png';
import type { RootStackParamList } from '@/navigation';
import { usePointEventStore } from '@/stores/pointEventStore';
import { useSettingStore } from '@/stores/settingStore';
import {
  black,
  blue600,
  slate50,
  slate200,
  slate500,
  white,
} from '@/utils/colors';
import { registerModalCallbacks } from '@/utils/modalCallbackRegistry';
import {
  isTopicSubscribed,
  requestNotificationPermission,
  subscribeToTopics,
} from '@/utils/notifications/notificationService';
import {
  formatTimeUntilDate,
  getIncomingPoints,
  getTotalPoints,
  getUserAddress,
  type IncomingPoints,
  recordBackupPointEvent,
  recordNotificationPointEvent,
} from '@/utils/points';

const Points: React.FC = () => {
  const [selfPoints, setSelfPoints] = useState(0);
  const { bottom } = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isNovaSubscribed, setIsNovaSubscribed] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [incomingPoints, setIncomingPoints] = useState<IncomingPoints | null>(
    null,
  );
  const loadEvents = usePointEventStore(state => state.loadEvents);
  const { hasCompletedBackupForPoints, setBackupForPointsCompleted } =
    useSettingStore();
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Ref to trigger list refresh
  const listRefreshRef = useRef<(() => Promise<void>) | null>(null);

  // Mock function to check if user has backed up their account
  const hasUserBackedUpAccount = (): boolean => {
    return hasCompletedBackupForPoints;
  };

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const fetchPoints = async () => {
      const address = await getUserAddress();
      const points = await getTotalPoints(address);
      setSelfPoints(points);
    };
    fetchPoints();
  }, []);

  useEffect(() => {
    const checkSubscription = async () => {
      const subscribed = await isTopicSubscribed('nova');
      setIsNovaSubscribed(subscribed);
    };
    checkSubscription();
  }, []);

  useEffect(() => {
    const fetchIncomingPoints = async () => {
      const incoming = await getIncomingPoints();
      setIncomingPoints(incoming);
    };
    fetchIncomingPoints();
  }, []);

  const handleEnableNotifications = async () => {
    if (isEnabling) {
      return;
    }

    setIsEnabling(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        const result = await subscribeToTopics(['nova']);
        if (result.successes.length > 0) {
          const response = await recordNotificationPointEvent();
          if (response.success) {
            setIsNovaSubscribed(true);

            if (listRefreshRef.current) {
              await listRefreshRef.current();
            }

            const callbackId = registerModalCallbacks({
              onButtonPress: () => {},
              onModalDismiss: () => {},
            });
            navigation.navigate('Modal', {
              titleText: 'Success!',
              bodyText:
                'Push notifications enabled! You earned 20 points.\n\nPoints will be distributed to your wallet on the next Sunday at noon UTC.',
              buttonText: 'OK',
              callbackId,
            });
          } else {
            const callbackId = registerModalCallbacks({
              onButtonPress: () => {},
              onModalDismiss: () => {},
            });
            navigation.navigate('Modal', {
              titleText: 'Verification Failed',
              bodyText:
                response.error ||
                'Failed to register points. Please try again.',
              buttonText: 'OK',
              callbackId,
            });
          }
        } else {
          const callbackId = registerModalCallbacks({
            onButtonPress: () => {},
            onModalDismiss: () => {},
          });
          navigation.navigate('Modal', {
            titleText: 'Error',
            bodyText: `Failed to enable: ${result.failures.map(f => f.error).join(', ')}`,
            buttonText: 'OK',
            callbackId,
          });
        }
      } else {
        const callbackId = registerModalCallbacks({
          onButtonPress: () => {},
          onModalDismiss: () => {},
        });
        navigation.navigate('Modal', {
          titleText: 'Permission Required',
          bodyText:
            'Could not enable notifications. Please enable them in your device Settings.',
          buttonText: 'OK',
          callbackId,
        });
      }
    } catch (error) {
      const callbackId = registerModalCallbacks({
        onButtonPress: () => {},
        onModalDismiss: () => {},
      });
      navigation.navigate('Modal', {
        titleText: 'Error',
        bodyText:
          error instanceof Error
            ? error.message
            : 'Failed to enable notifications',
        buttonText: 'OK',
        callbackId,
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const handleBackupSecret = async () => {
    if (isBackingUp) {
      return;
    }

    setIsBackingUp(true);
    try {
      const response = await recordBackupPointEvent();
      console.log('response backup point event', response);

      if (response.success) {
        setBackupForPointsCompleted();

        const address = await getUserAddress();
        const points = await getTotalPoints(address);
        setSelfPoints(points);

        if (listRefreshRef.current) {
          await listRefreshRef.current();
        }

        const callbackId = registerModalCallbacks({
          onButtonPress: () => {},
          onModalDismiss: () => {},
        });
        navigation.navigate('Modal', {
          titleText: 'Success!',
          bodyText:
            'Account backed up successfully! You earned 100 points.\n\nPoints will be distributed to your wallet on the next Sunday at noon UTC.',
          buttonText: 'OK',
          callbackId,
        });
      } else {
        const callbackId = registerModalCallbacks({
          onButtonPress: () => {},
          onModalDismiss: () => {},
        });
        navigation.navigate('Modal', {
          titleText: 'Verification Failed',
          bodyText:
            response.error || 'Failed to register points. Please try again.',
          buttonText: 'OK',
          callbackId,
        });
      }
    } catch (error) {
      const callbackId = registerModalCallbacks({
        onButtonPress: () => {},
        onModalDismiss: () => {},
      });
      navigation.navigate('Modal', {
        titleText: 'Error',
        bodyText:
          error instanceof Error ? error.message : 'Failed to backup account',
        buttonText: 'OK',
        callbackId,
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const ListHeader = (
    <YStack paddingHorizontal={5} gap={20} paddingTop={20}>
      <YStack
        backgroundColor="white"
        borderRadius={10}
        borderWidth={1}
        borderColor={slate200}
        overflow="hidden"
      >
        <YStack
          paddingVertical={30}
          paddingHorizontal={40}
          alignItems="center"
          gap={20}
        >
          <View
            width={68}
            height={68}
            borderRadius={12}
            borderWidth={1}
            borderColor={slate200}
            alignItems="center"
            justifyContent="center"
            backgroundColor="white"
          >
            <LogoInversed width={33} height={33} />
          </View>
          <YStack gap={12} alignItems="center">
            <XStack gap={4} alignItems="center">
              <Text
                color={black}
                fontFamily="DIN OT"
                fontWeight="500"
                fontSize={32}
                lineHeight="100%"
                letterSpacing={-1}
              >
                {`${selfPoints} Self `}
              </Text>
              <Text
                fontFamily="DIN OT"
                fontWeight="500"
                fontSize={32}
                lineHeight="100%"
                letterSpacing={-1}
              >
                points
              </Text>
            </XStack>
            <Text
              color={black}
              fontFamily="DIN OT"
              fontSize={18}
              fontWeight="500"
              textAlign="center"
              paddingHorizontal={20}
            >
              Earn points by referring friends, disclosing proof requests, and
              more.
            </Text>
          </YStack>
        </YStack>
        {incomingPoints && (
          <XStack
            backgroundColor={slate50}
            borderTopWidth={1}
            borderTopColor={slate200}
            paddingVertical={10}
            paddingHorizontal={10}
            alignItems="center"
            gap={4}
          >
            <ClockIcon width={16} height={16} />
            <Text
              flex={1}
              fontFamily="DIN OT"
              fontWeight="500"
              fontSize={14}
              color={black}
            >
              {`${incomingPoints.amount} incoming points`}
            </Text>
            <Text
              fontFamily="DIN OT"
              fontWeight="500"
              fontSize={14}
              color={blue600}
            >
              {`Expected in ${formatTimeUntilDate(incomingPoints.expectedDate)}`}
            </Text>
          </XStack>
        )}
      </YStack>
      {!isNovaSubscribed && (
        <Pressable onPress={handleEnableNotifications} disabled={isEnabling}>
          <XStack
            gap={22}
            backgroundColor="white"
            padding={16}
            borderRadius={17}
            borderWidth={1}
            borderColor={slate200}
            opacity={isEnabling ? 0.5 : 1}
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
                {isEnabling
                  ? 'Enabling notifications...'
                  : 'Turn on push notifications'}
              </Text>
              <Text color={slate500} fontFamily="DIN OT" fontSize={14}>
                Earn 20 points
              </Text>
            </YStack>
          </XStack>
        </Pressable>
      )}
      {!hasUserBackedUpAccount() && (
        <Pressable onPress={handleBackupSecret} disabled={isBackingUp}>
          <XStack
            gap={22}
            backgroundColor="white"
            padding={16}
            borderRadius={17}
            borderWidth={1}
            borderColor={slate200}
            opacity={isBackingUp ? 0.5 : 1}
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
              <Text
                color={black}
                fontFamily="DIN OT"
                fontWeight="500"
                fontSize={16}
              >
                {isBackingUp ? 'Processing backup...' : 'Backup your account'}
              </Text>
              <Text color={slate500} fontFamily="DIN OT" fontSize={14}>
                Earn 100 points
              </Text>
            </YStack>
          </XStack>
        </Pressable>
      )}
      <Pressable onPress={() => navigation.navigate('Referral')}>
        <YStack
          height={270}
          backgroundColor="white"
          borderRadius={16}
          borderWidth={1}
          borderColor={slate200}
        >
          <ZStack
            borderBottomWidth={1}
            borderBottomColor={slate200}
            height={170}
          >
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
      </Pressable>
    </YStack>
  );

  return (
    <YStack flex={1} backgroundColor={slate50}>
      <ZStack flex={1}>
        <PointHistoryList
          ListHeaderComponent={ListHeader}
          onRefreshRef={listRefreshRef}
        />
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
