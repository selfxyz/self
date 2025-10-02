// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, YStack } from 'tamagui';
import type { StaticScreenProps } from '@react-navigation/native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

import { IDDocument } from '@selfxyz/common/utils/types';
import { loadSelectedDocument, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProvingStateType } from '@selfxyz/mobile-sdk-alpha/browser';

import failAnimation from '@/assets/animations/loading/fail.json';
import proveLoadingAnimation from '@/assets/animations/loading/prove.json';
import LoadingUI from '@/components/loading/LoadingUI';
import CloseWarningIcon from '@/images/icons/close-warning.svg';
import { loadPassportDataAndSecret } from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';
import { black, slate400, white, zinc500, zinc900 } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';
import { advercase, dinot } from '@/utils/fonts';
import { loadingScreenProgress } from '@/utils/haptic';
import { setupNotifications } from '@/utils/notifications/notificationService';
import { getLoadingScreenText } from '@/utils/proving/loadingScreenStateText';

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
  const { useProvingStore } = useSelfClient();
  // Track if we're initializing to show clean state
  const [isInitializing, setIsInitializing] = useState(false);

  // Animation states
  const [animationSource, setAnimationSource] = useState<
    LottieView['props']['source']
  >(proveLoadingAnimation);

  // Passport data state
  const [passportData, setPassportData] = useState<IDDocument | null>(null);

  // Loading text state
  const [loadingText, setLoadingText] = useState<{
    actionText: string;
    actionSubText: string;
    estimatedTime: string;
    statusBarProgress: number;
  }>({
    actionText: '',
    actionSubText: '',
    estimatedTime: '',
    statusBarProgress: 0,
  });

  // Get proving store and self client
  const selfClient = useSelfClient();
  const currentState = useProvingStore(state => state.currentState) ?? 'idle';
  const fcmToken = useSettingStore(state => state.fcmToken);
  const init = useProvingStore(state => state.init);
  const circuitType = useProvingStore(state => state.circuitType);
  const isFocused = useIsFocused();
  const { bottom } = useSafeAreaInsets();

  // States where it's safe to close the app
  const safeToCloseStates = ['proving', 'post_proving', 'completed'];
  const canCloseApp = safeToCloseStates.includes(currentState);

  // Initialize proving process
  useEffect(() => {
    if (!isFocused) return;

    setIsInitializing(true);

    // Always initialize when screen becomes focused, regardless of current state
    // This ensures proper reset between proving sessions
    const initializeProving = async () => {
      try {
        const selectedDocument = await loadSelectedDocument(selfClient);
        if (selectedDocument?.data?.documentCategory === 'aadhaar') {
          await init(selfClient, 'register', true);
        } else {
          await init(selfClient, 'dsc', true);
        }
      } catch (error) {
        console.error('Error loading selected document:', error);
        await init(selfClient, 'dsc', true);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeProving();
  }, [isFocused, init, selfClient]);

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

  // Handle UI updates based on state changes
  useEffect(() => {
    let { signatureAlgorithm, curveOrExponent } = {
      signatureAlgorithm: 'rsa',
      curveOrExponent: '65537',
    };
    switch (passportData?.documentCategory) {
      case 'passport':
      case 'id_card':
        if (passportData?.passportMetadata) {
          signatureAlgorithm =
            passportData?.passportMetadata?.cscaSignatureAlgorithm;
          curveOrExponent = passportData?.passportMetadata?.cscaCurveOrExponent;
        }
        break;
      case 'aadhaar':
        break; // keep the default values for aadhaar
    }

    // Use clean initial state if we're initializing, otherwise use current state
    const displayState = isInitializing ? 'idle' : currentState;
    const displayCircuitType = isInitializing ? 'dsc' : circuitType || 'dsc';

    const { actionText, actionSubText, estimatedTime, statusBarProgress } =
      getLoadingScreenText(
        displayState as ProvingStateType,
        signatureAlgorithm,
        curveOrExponent,
        displayCircuitType,
      );
    setLoadingText({
      actionText,
      actionSubText,
      estimatedTime,
      statusBarProgress,
    });

    // Update animation based on state (use clean state if initializing)
    const animationState = isInitializing ? 'idle' : currentState;
    switch (animationState) {
      case 'completed':
        // setAnimationSource(successAnimation);
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
        break;
    }
  }, [currentState, fcmToken, passportData, isInitializing]);

  // Handle haptic feedback using useFocusEffect for immediate response
  useFocusEffect(
    React.useCallback(() => {
      // Start haptic feedback as soon as the screen is focused
      loadingScreenProgress(true);

      // Cleanup function to stop haptics when the screen is unfocused
      return () => {
        loadingScreenProgress(false);
      };
    }, []),
  );

  // Determine if animation should loop based on terminal states
  const shouldLoopAnimation = !terminalStates.includes(
    currentState as ProvingStateType,
  );

  return (
    <LoadingUI
      animationSource={animationSource}
      shouldLoopAnimation={shouldLoopAnimation}
      actionText={loadingText.actionText}
      actionSubText={loadingText.actionSubText}
      estimatedTime={loadingText.estimatedTime}
      canCloseApp={canCloseApp}
      statusBarProgress={loadingText.statusBarProgress}
    />
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
