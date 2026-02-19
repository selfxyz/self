// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Image, Text, View, XStack, YStack, ZStack } from 'tamagui';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HelpCircle } from '@tamagui/lucide-icons';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { PointEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  blue600,
  slate50,
  slate200,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import BellWhiteIcon from '@/assets/icons/bell_white.svg';
import ClockIcon from '@/assets/icons/clock.svg';
import LockWhiteIcon from '@/assets/icons/lock_white.svg';
import StarBlackIcon from '@/assets/icons/star_black.svg';
import LogoInversed from '@/assets/images/logo_inversed.svg';
import MajongImage from '@/assets/images/majong.png';
import { PointHistoryList } from '@/components/PointHistoryList';
import { appsUrl } from '@/consts/links';
import { useIncomingPoints, usePoints } from '@/hooks/usePoints';
import { usePointsGuardrail } from '@/hooks/usePointsGuardrail';
import { useResponsiveScale } from '@/hooks/useResponsiveScale';
import type { RootStackParamList } from '@/navigation';
import { trackScreenView } from '@/services/analytics';
import {
  isTopicSubscribed,
  requestNotificationPermission,
  subscribeToTopics,
} from '@/services/notifications/notificationService';
import {
  formatTimeUntilDate,
  POINT_VALUES,
  recordBackupPointEvent,
  recordNotificationPointEvent,
} from '@/services/points';
import { usePointEventStore } from '@/stores/pointEventStore';
import { useSettingStore } from '@/stores/settingStore';
import { registerModalCallbacks } from '@/utils/modalCallbackRegistry';

const Points: React.FC = () => {
  const selfClient = useSelfClient();

  const { bottom } = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isGeneralSubscribed, setIsGeneralSubscribed] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const incomingPoints = useIncomingPoints();
  const { amount: points } = usePoints();
  const loadEvents = usePointEventStore(state => state.loadEvents);
  const { hasCompletedBackupForPoints, setBackupForPointsCompleted } =
    useSettingStore();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const s = useResponsiveScale();
  const localStyles = React.useMemo(() => createStyles(s), [s]);

  // Guard: Validate that user has registered a document and completed points disclosure
  usePointsGuardrail();

  // Track NavBar view analytics
  useFocusEffect(
    React.useCallback(() => {
      trackScreenView('Points NavBar', {
        screenName: 'Points NavBar',
      });
    }, []),
  );

  const onHelpButtonPress = () => {
    navigation.navigate('PointsInfo');
  };

  //TODO - uncomment after merging - https://github.com/selfxyz/self/pull/1363/
  // useEffect(() => {
  //   const backupEvent = usePointEventStore
  //     .getState()
  //     .events.find(
  //       event => event.type === 'backup' && event.status === 'completed',
  //     );

  //   if (backupEvent && !hasCompletedBackupForPoints) {
  //     setBackupForPointsCompleted();
  //   }
  // }, [setBackupForPointsCompleted, hasCompletedBackupForPoints]);

  // Track if we should check for backup completion on next focus
  const shouldCheckBackupRef = React.useRef(false);

  // Detect when returning from backup screen and record points if backup was completed
  useFocusEffect(
    React.useCallback(() => {
      const { cloudBackupEnabled, turnkeyBackupEnabled } =
        useSettingStore.getState();
      const currentHasCompletedBackup =
        useSettingStore.getState().hasCompletedBackupForPoints;

      // Only check if we explicitly set the flag (when navigating to backup settings)
      // This prevents false triggers when returning from other flows (like notification permissions)
      if (
        shouldCheckBackupRef.current &&
        (cloudBackupEnabled || turnkeyBackupEnabled) &&
        !currentHasCompletedBackup
      ) {
        const recordPoints = async () => {
          try {
            const response = await recordBackupPointEvent();

            if (response.success) {
              useSettingStore.getState().setBackupForPointsCompleted();
              selfClient.trackEvent(PointEvents.EARN_BACKUP_SUCCESS);

              const callbackId = registerModalCallbacks({
                onButtonPress: () => {},
                onModalDismiss: () => {},
              });
              navigation.navigate('Modal', {
                titleText: 'Success!',
                bodyText: `Account backed up successfully! You earned ${POINT_VALUES.backup} points.\n\nPoints will be distributed to your wallet on the next Sunday at noon UTC.`,
                buttonText: 'OK',
                callbackId,
              });
            } else {
              console.error(
                'Error recording backup points after return:',
                response.error,
              );
              selfClient.trackEvent(PointEvents.EARN_BACKUP_FAILED);
            }
          } catch (error) {
            selfClient.trackEvent(PointEvents.EARN_BACKUP_FAILED);
            console.error('Error recording backup points after return:', error);
          }
        };

        recordPoints();
      }

      // Reset the flag after checking
      shouldCheckBackupRef.current = false;
    }, [navigation, selfClient]),
  );

  // Mock function to check if user has backed up their account
  const hasUserBackedUpAccount = (): boolean => {
    return hasCompletedBackupForPoints;
  };

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const checkSubscription = async () => {
      const subscribed = await isTopicSubscribed('general');
      setIsGeneralSubscribed(subscribed);
    };
    checkSubscription();
  }, []);

  const handleEnableNotifications = async () => {
    if (isEnabling) {
      return;
    }
    selfClient.trackEvent(PointEvents.EARN_NOTIFICATION);
    setIsEnabling(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        const result = await subscribeToTopics(['general']);
        if (result.successes.length > 0) {
          const response = await recordNotificationPointEvent();
          if (response.success) {
            setIsGeneralSubscribed(true);
            selfClient.trackEvent(PointEvents.EARN_NOTIFICATION_SUCCESS);

            navigation.navigate('Gratification', {
              points: POINT_VALUES.notification,
            });
          } else {
            selfClient.trackEvent(PointEvents.EARN_NOTIFICATION_FAILED, {
              reason: 'Failed to record points',
            });

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
          selfClient.trackEvent(PointEvents.EARN_NOTIFICATION_FAILED, {
            reason: 'Subscription failed',
          });
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
        selfClient.trackEvent(PointEvents.EARN_NOTIFICATION_FAILED, {
          reason: 'Permission denied',
        });
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
      selfClient.trackEvent(PointEvents.EARN_NOTIFICATION_FAILED, {
        reason: 'Exception occurred',
      });
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
    selfClient.trackEvent(PointEvents.EARN_BACKUP);

    const { cloudBackupEnabled, turnkeyBackupEnabled } =
      useSettingStore.getState();

    // If either backup method is already enabled, just record points
    if (cloudBackupEnabled || turnkeyBackupEnabled) {
      setIsBackingUp(true);
      try {
        // this will add event to store and the new event will then trigger useIncomingPoints hook to refetch incoming points
        const response = await recordBackupPointEvent();

        if (response.success) {
          setBackupForPointsCompleted();
          selfClient.trackEvent(PointEvents.EARN_BACKUP_SUCCESS);

          navigation.navigate('Gratification', {
            points: POINT_VALUES.backup,
          });
        } else {
          selfClient.trackEvent(PointEvents.EARN_BACKUP_FAILED);
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
        selfClient.trackEvent(PointEvents.EARN_BACKUP_FAILED);
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
    } else {
      // Navigate to backup screen and return to Points after backup completes
      // Set flag to check for backup completion when we return
      shouldCheckBackupRef.current = true;
      navigation.navigate('CloudBackupSettings', { returnToScreen: 'Points' });
    }
  };

  const ListHeader = (
    <YStack paddingHorizontal={s(5)} gap={s(20)} paddingTop={s(20)}>
      <YStack style={localStyles.pointsCard}>
        <Pressable style={localStyles.helpButton} onPress={onHelpButtonPress}>
          <HelpCircle size={s(32)} color={blue600} />
        </Pressable>
        <YStack style={localStyles.pointsCardContent}>
          <View style={localStyles.logoContainer}>
            <LogoInversed width={s(33)} height={s(33)} />
          </View>
          <YStack gap={s(12)} alignItems="center">
            <XStack gap={s(4)} alignItems="center">
              <Text
                style={localStyles.pointsTitle}
              >{`${points} Self points`}</Text>
            </XStack>
            <Text style={localStyles.pointsDescription}>
              Earn points by referring friends, disclosing proof requests, and
              more.
            </Text>
          </YStack>
        </YStack>
        {incomingPoints && (
          <XStack style={localStyles.incomingPointsBar}>
            <ClockIcon width={s(16)} height={s(16)} />
            <Text style={localStyles.incomingPointsAmount}>
              {`${incomingPoints.amount} incoming points`}
            </Text>
            <Text style={localStyles.incomingPointsTime}>
              {`Expected in ${formatTimeUntilDate(incomingPoints.expectedDate)}`}
            </Text>
          </XStack>
        )}
      </YStack>
      {!isGeneralSubscribed && (
        <Pressable onPress={handleEnableNotifications} disabled={isEnabling}>
          <XStack
            style={[localStyles.actionCard, { opacity: isEnabling ? 0.5 : 1 }]}
          >
            <View style={localStyles.actionIconContainer}>
              <BellWhiteIcon width={s(30)} height={s(26)} />
            </View>
            <YStack gap={s(4)} justifyContent="center">
              <Text style={localStyles.actionTitle}>
                {isEnabling
                  ? 'Enabling notifications...'
                  : 'Turn on push notifications'}
              </Text>
              <Text style={localStyles.actionSubtitle}>
                Earn {POINT_VALUES.notification} points
              </Text>
            </YStack>
          </XStack>
        </Pressable>
      )}
      {!hasUserBackedUpAccount() && (
        <Pressable onPress={handleBackupSecret} disabled={isBackingUp}>
          <XStack
            style={[localStyles.actionCard, { opacity: isBackingUp ? 0.5 : 1 }]}
          >
            <View style={localStyles.actionIconContainer}>
              <LockWhiteIcon width={s(30)} height={s(26)} />
            </View>
            <YStack gap={s(4)} justifyContent="center">
              <Text style={localStyles.actionTitle}>
                {isBackingUp ? 'Processing backup...' : 'Backup your account'}
              </Text>
              <Text style={localStyles.actionSubtitle}>
                Earn {POINT_VALUES.backup} points
              </Text>
            </YStack>
          </XStack>
        </Pressable>
      )}
      <Pressable
        onPress={() => {
          selfClient.trackEvent(PointEvents.EARN_REFERRAL);
          navigation.navigate('Referral');
        }}
      >
        <YStack style={localStyles.referralCard}>
          <ZStack style={localStyles.referralImageContainer}>
            <Image source={MajongImage} style={localStyles.referralImage} />
            <StarBlackIcon
              width={s(24)}
              height={s(24)}
              style={localStyles.referralStarIcon}
            />
          </ZStack>
          <YStack padding={s(16)} paddingBottom={s(32)} gap={s(10)}>
            <Text style={localStyles.referralTitle}>
              Refer friends and earn rewards
            </Text>
            <Text style={localStyles.referralLink}>Refer now</Text>
          </YStack>
        </YStack>
      </Pressable>
    </YStack>
  );

  return (
    <YStack flex={1} backgroundColor={slate50}>
      <ZStack flex={1}>
        <PointHistoryList ListHeaderComponent={ListHeader} />
        <YStack
          style={[
            localStyles.exploreButtonContainer,
            { bottom: bottom + s(20) },
          ]}
        >
          <Button
            style={localStyles.exploreButton}
            onPress={() => {
              selfClient.trackEvent(PointEvents.EXPLORE_APPS);
              navigation.navigate('WebView', {
                url: appsUrl,
                title: 'Explore Apps',
              });
            }}
          >
            <Text style={localStyles.exploreButtonText}>Explore apps</Text>
          </Button>
        </YStack>
      </ZStack>
    </YStack>
  );
};

const createStyles = (s: (value: number) => number) =>
  StyleSheet.create({
    pointsCard: {
      backgroundColor: white,
      borderRadius: s(10),
      borderWidth: 1,
      borderColor: slate200,
      overflow: 'hidden',
    },
    pointsCardContent: {
      paddingVertical: s(30),
      paddingHorizontal: s(40),
      alignItems: 'center',
      gap: s(20),
    },
    logoContainer: {
      width: s(68),
      height: s(68),
      borderRadius: s(12),
      borderWidth: 1,
      borderColor: slate200,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: white,
    },
    pointsTitle: {
      color: black,
      textAlign: 'center',
      fontFamily: dinot,
      fontWeight: '500',
      fontSize: s(32),
      lineHeight: s(32),
      letterSpacing: s(-1),
    },
    pointsDescription: {
      color: black,
      fontFamily: dinot,
      fontSize: s(18),
      fontWeight: '500',
      textAlign: 'center',
      paddingHorizontal: s(20),
    },
    incomingPointsBar: {
      backgroundColor: slate50,
      borderTopWidth: 1,
      borderTopColor: slate200,
      paddingVertical: s(10),
      paddingHorizontal: s(10),
      alignItems: 'center',
      gap: s(4),
    },
    incomingPointsAmount: {
      flex: 1,
      fontFamily: dinot,
      fontWeight: '500',
      fontSize: s(14),
      color: black,
    },
    incomingPointsTime: {
      fontFamily: dinot,
      fontWeight: '500',
      fontSize: s(14),
      color: blue600,
    },
    actionCard: {
      gap: s(22),
      backgroundColor: white,
      padding: s(16),
      borderRadius: s(17),
      borderWidth: 1,
      borderColor: slate200,
    },
    actionIconContainer: {
      width: s(60),
      height: s(60),
      borderRadius: s(16),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: black,
    },
    actionTitle: {
      color: black,
      fontFamily: dinot,
      fontWeight: '500',
      fontSize: s(16),
    },
    actionSubtitle: {
      color: slate500,
      fontFamily: dinot,
      fontSize: s(14),
    },
    referralCard: {
      height: s(270),
      backgroundColor: white,
      borderRadius: s(16),
      borderWidth: 1,
      borderColor: slate200,
    },
    referralImageContainer: {
      borderBottomWidth: 1,
      borderBottomColor: slate200,
      height: s(170),
    },
    referralImage: {
      width: '80%',
      height: '100%',
      position: 'absolute',
      right: 0,
      top: 0,
    },
    referralStarIcon: {
      marginLeft: s(16),
      marginTop: s(16),
    },
    referralTitle: {
      fontFamily: dinot,
      fontSize: s(16),
      color: black,
    },
    referralLink: {
      fontFamily: dinot,
      fontSize: s(16),
      color: blue600,
    },
    exploreButtonContainer: {
      position: 'absolute',
      left: s(20),
      right: s(20),
    },
    exploreButton: {
      backgroundColor: black,
      paddingHorizontal: s(20),
      paddingVertical: s(14),
      borderRadius: s(5),
      height: s(52),
    },
    exploreButtonText: {
      fontFamily: dinot,
      fontSize: s(16),
      color: white,
      textAlign: 'center',
    },
    helpButton: {
      position: 'absolute',
      top: 0,
      right: 0,
      padding: s(12),
    },
  });

export default Points;
