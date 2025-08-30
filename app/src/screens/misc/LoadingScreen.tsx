// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, YStack } from 'tamagui';
import type { StaticScreenProps } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/native';

import type { PassportData } from '@selfxyz/common/types';

import failAnimation from '@/assets/animations/loading/fail.json';
import proveLoadingAnimation from '@/assets/animations/loading/prove.json';
import successAnimation from '@/assets/animations/loading/success.json';
import CloseWarningIcon from '@/images/icons/close-warning.svg';
import { loadPassportDataAndSecret } from '@/providers/passportDataProvider';
import { black, slate400, white, zinc500, zinc900 } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';
import { advercase, dinot } from '@/utils/fonts';
import { loadingScreenProgress } from '@/utils/haptic';
import { setupNotifications } from '@/utils/notifications/notificationService';
import { getLoadingScreenText } from '@/utils/proving/loadingScreenStateText';
import type { ProvingStateType } from '@/utils/proving/provingMachine';
import { useProvingStore } from '@/utils/proving/provingMachine';

type LoadingScreenProps = StaticScreenProps<Record<string, never>>;

// Define all terminal states that should stop animations and haptics
const terminalStates: ProvingStateType[] = [
  'completed',
  'error',
  'failure',
  'passport_not_supported',
  'account_recovery_choice',
  'passport_data_not_found',
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({}) => {
  // Animation states
  const [animationSource, setAnimationSource] = useState<
    LottieView['props']['source']
  >(proveLoadingAnimation);

  // Passport data state
  const [passportData, setPassportData] = useState<PassportData | null>(null);

  // Loading text state
  const [loadingText, setLoadingText] = useState<{
    actionText: string;
    estimatedTime: string;
  }>({
    actionText: '',
    estimatedTime: '',
  });

  // Get current state from proving machine, default to 'idle' if undefined
  const currentState = useProvingStore(state => state.currentState) ?? 'idle';
  const fcmToken = useProvingStore(state => state.fcmToken);
  const isFocused = useIsFocused();
  const { bottom } = useSafeAreaInsets();

  // States where it's safe to close the app
  const safeToCloseStates = ['proving', 'post_proving', 'completed'];
  const canCloseApp = safeToCloseStates.includes(currentState);

  // Initialize notifications and load passport data
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (!isFocused) return;

      // Setup notifications
      const unsubscribe = setupNotifications();

      // Load passport data if not already loaded
      if (!passportData) {
        try {
          const result = await loadPassportDataAndSecret();
          if (result && isMounted) {
            const { passportData: _passportData } = JSON.parse(result);
            setPassportData(_passportData);
          }
        } catch (error: unknown) {
          console.error('Error loading passport data:', error);
        }
      }

      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    };

    initialize();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]); // Only depend on isFocused

  // Handle UI updates and haptic feedback based on state changes
  useEffect(() => {
    // Stop haptics if screen is not focused
    if (!isFocused) {
      loadingScreenProgress(false);
      return;
    }

    // Update UI if passport data is available
    if (passportData?.passportMetadata) {
      // Update loading text based on current state
      const { actionText, estimatedTime } = getLoadingScreenText(
        currentState as ProvingStateType,
        passportData?.passportMetadata,
      );
      setLoadingText({ actionText, estimatedTime });

      // Update animation based on state
      switch (currentState) {
        case 'completed':
          setAnimationSource(successAnimation);
          break;
        case 'error':
        case 'failure':
        case 'passport_not_supported':
          setAnimationSource(failAnimation);
          break;
        case 'account_recovery_choice':
        case 'passport_data_not_found':
          setAnimationSource(failAnimation);
          break;
        default:
          setAnimationSource(proveLoadingAnimation);
      }
    }

    // Stop haptics if we're in a terminal state
    if (terminalStates.includes(currentState as ProvingStateType)) {
      loadingScreenProgress(false);
      return;
    }

    // Start haptic feedback for non-terminal states
    loadingScreenProgress(true);

    // Cleanup on unmount or state change
    return () => {
      loadingScreenProgress(false);
    };
  }, [currentState, isFocused, fcmToken, passportData?.passportMetadata]);

  // Determine if animation should loop based on terminal states
  const shouldLoopAnimation = !terminalStates.includes(
    currentState as ProvingStateType,
  );

  return (
    <YStack
      backgroundColor={black}
      gap={20}
      justifyContent="space-between"
      flex={1}
      paddingHorizontal={20}
      paddingBottom={bottom + extraYPadding}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.animationAndTitleGroup}>
            <LottieView
              autoPlay
              loop={shouldLoopAnimation}
              source={animationSource}
              style={styles.animation}
              resizeMode="cover"
              renderMode="HARDWARE"
            />
            <Text style={styles.title}>{loadingText.actionText}</Text>
          </View>
          <View style={styles.estimatedTimeSection}>
            <View style={styles.estimatedTimeBorder} />
            <View style={styles.estimatedTimeRow}>
              <Text style={styles.estimatedTimeLabel}>ESTIMATED TIME:</Text>
              <Text style={styles.estimatedTimeValue}>
                {loadingText.estimatedTime}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.warningSection}>
          <CloseWarningIcon color={zinc500} height={40} />
          <Text style={styles.warningText}>
            {canCloseApp
              ? 'You can now safely close the app'
              : 'Closing the app will cancel this process'}
          </Text>
        </View>
      </View>
    </YStack>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '92%',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: zinc900,
    shadowColor: black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    color: white,
    fontSize: 24,
    fontFamily: advercase,
    textAlign: 'center',
    letterSpacing: 1,
    fontWeight: '100',
    marginVertical: 30,
  },
  animation: {
    width: 60,
    height: 60,
    marginTop: 30,
    marginBottom: 0,
  },
  animationAndTitleGroup: {
    alignItems: 'center',
  },
  estimatedTimeSection: {
    width: '100%',
    alignItems: 'center',
  },
  estimatedTimeBorder: {
    width: '100%',
    height: 1,
    backgroundColor: '#232329',
  },
  estimatedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    textTransform: 'uppercase',
    marginTop: 18,
  },
  estimatedTimeLabel: {
    color: slate400,
    marginRight: 8,
    fontSize: 11,
    letterSpacing: 0.44,
    fontFamily: dinot,
  },
  estimatedTimeValue: {
    color: white,
    fontSize: 11,
    letterSpacing: 0.44,
    fontFamily: dinot,
  },
  warningSection: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningText: {
    color: slate400,
    fontSize: 11,
    paddingTop: 16,
    letterSpacing: 0.44,
    textTransform: 'uppercase',
    fontFamily: dinot,
    textAlign: 'center',
  },
  stateMessage: {
    color: slate400,
    fontSize: 14,
    paddingTop: 8,
    textAlign: 'center',
  },
});

export default LoadingScreen;
