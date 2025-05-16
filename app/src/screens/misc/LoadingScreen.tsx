import { StaticScreenProps, useIsFocused } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, YStack } from 'tamagui';

import failAnimation from '../../assets/animations/loading/fail.json';
import proveLoadingAnimation from '../../assets/animations/loading/prove.json';
import successAnimation from '../../assets/animations/loading/success.json';
import CloseWarningIcon from '../../images/icons/close-warning.svg';
import { loadPassportDataAndSecret } from '../../stores/passportDataProvider';
import { black, slate400, white, zinc500, zinc900 } from '../../utils/colors';
import { advercase, dinot } from '../../utils/fonts';
import { loadingScreenProgress } from '../../utils/haptic';
import {
  getStateMessage,
  setupNotifications,
} from '../../utils/notifications/notificationService';
import {
  ProvingStateType,
  useProvingStore,
} from '../../utils/proving/provingMachine';
import { getLoadingScreenText } from '../../utils/proving/stateLoadingScreenText';

type LoadingScreenProps = StaticScreenProps<{}>;

const LoadingScreen: React.FC<LoadingScreenProps> = ({}) => {
  const [animationSource, setAnimationSource] = useState<any>(
    proveLoadingAnimation,
  );
  const [passportData, setPassportData] = useState<any>(null);
  const [loadingText, setLoadingText] = useState<{
    actionText: string;
    estimatedTime: string;
  }>({
    actionText: '',
    estimatedTime: '',
  });
  const currentState = useProvingStore(state => state.currentState) ?? 'idle';
  const fcmToken = useProvingStore(state => state.fcmToken);
  const isFocused = useIsFocused();
  const { bottom } = useSafeAreaInsets();

  // Initialize notifications when component mounts
  useEffect(() => {
    if (isFocused) {
      const unsubscribe = setupNotifications();
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [isFocused]);

  // Load passport data only once
  useEffect(() => {
    const loadData = async () => {
      if (passportData) return;

      try {
        const result = await loadPassportDataAndSecret();
        if (result) {
          const { passportData: _passportData } = JSON.parse(result);
          setPassportData(_passportData);
        }
      } catch (error) {
        console.error('Error loading passport data:', error);
      }
    };
    loadData();
  }, [passportData]);

  // Update UI based on state changes
  useEffect(() => {
    if (isFocused) {
      console.log('[LoadingScreen] Current proving state:', currentState);
      console.log('[LoadingScreen] FCM token available:', !!fcmToken);
    }

    // Update loading text
    const { actionText, estimatedTime } = getLoadingScreenText(
      currentState as ProvingStateType,
      passportData?.metadata,
    );
    setLoadingText({ actionText, estimatedTime });

    // Update animation
    if (currentState === 'completed') {
      setAnimationSource(successAnimation);
    } else if (currentState === 'error' || currentState === 'failure') {
      setAnimationSource(failAnimation);
    } else {
      setAnimationSource(proveLoadingAnimation);
    }
  }, [currentState, isFocused, fcmToken, passportData?.metadata]);

  // Handle haptic feedback
  useEffect(() => {
    if (!isFocused) {
      loadingScreenProgress(false);
      return;
    }

    // Check if we're in a terminal state
    const terminalStates: ProvingStateType[] = [
      'completed',
      'error',
      'failure',
      'passport_not_supported',
      'account_recovery_choice',
      'passport_data_not_found',
    ];

    if (terminalStates.includes(currentState as ProvingStateType)) {
      loadingScreenProgress(false);
      return;
    }

    // Start haptic feedback
    loadingScreenProgress(true);

    // Cleanup on unmount
    return () => {
      loadingScreenProgress(false);
    };
  }, [isFocused, currentState]);

  // Determine if we should show the "you can close the app" message
  const canCloseApp = ['proving', 'post_proving', 'completed'].includes(
    currentState,
  );

  return (
    <YStack
      bg={black}
      gap={20}
      jc="space-between"
      flex={1}
      paddingHorizontal={20}
      paddingBottom={bottom}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.animationAndTitleGroup}>
            <LottieView
              autoPlay
              loop={animationSource === proveLoadingAnimation}
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
          <Text style={styles.stateMessage}>
            {getStateMessage(currentState)}
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
