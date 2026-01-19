// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type LottieView from 'lottie-react-native';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { StaticScreenProps } from '@react-navigation/native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

import type { DocumentCategory } from '@selfxyz/common/utils/types';
import type { ProvingStateType } from '@selfxyz/mobile-sdk-alpha';
import {
  advercase,
  dinot,
  loadSelectedDocument,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import failAnimation from '@selfxyz/mobile-sdk-alpha/animations/loading/fail.json';
import proveLoadingAnimation from '@selfxyz/mobile-sdk-alpha/animations/loading/prove.json';
import {
  black,
  slate400,
  white,
  zinc900,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import LoadingUI from '@/components/LoadingUI';
import { loadingScreenProgress } from '@/integrations/haptics';
import { getLoadingScreenText } from '@/proving/loadingScreenStateText';
import { setupNotifications } from '@/services/notifications/notificationService';
import { useSettingStore } from '@/stores/settingStore';

type LoadingScreenParams = {
  documentCategory?: DocumentCategory;
  signatureAlgorithm?: string;
  curveOrExponent?: string;
};

type LoadingScreenProps = StaticScreenProps<LoadingScreenParams>;

// Define all terminal states that should stop animations and haptics
const terminalStates: ProvingStateType[] = [
  'completed',
  'error',
  'failure',
  'passport_not_supported',
  'account_recovery_choice',
  'passport_data_not_found',
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ route }) => {
  const { useProvingStore } = useSelfClient();
  // Track if we're initializing to show clean state
  const [isInitializing, setIsInitializing] = useState(false);

  // Animation states
  const [animationSource, setAnimationSource] = useState<
    LottieView['props']['source']
  >(proveLoadingAnimation);

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

  // Get document metadata from navigation params
  const {
    signatureAlgorithm: paramSignatureAlgorithm,
    curveOrExponent: paramCurveOrExponent,
  } = route?.params || {};

  // Get current state from proving machine, default to 'idle' if undefined
  // Get proving store and self client
  const selfClient = useSelfClient();
  const currentState = useProvingStore(state => state.currentState) ?? 'idle';
  const fcmToken = useSettingStore(state => state.fcmToken);
  const init = useProvingStore(state => state.init);
  const circuitType = useProvingStore(state => state.circuitType);
  const isFocused = useIsFocused();

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
      } catch {
        console.error('Error loading selected document:');
        await init(selfClient, 'dsc', true);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeProving();
  }, [isFocused, init, selfClient]);

  // Initialize notifications and load passport data
  useEffect(() => {
    if (!isFocused) return;

    // Setup notifications
    const unsubscribe = setupNotifications();

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isFocused]);

  // Handle UI updates based on state changes
  useEffect(() => {
    // Stop haptics if screen is not focused
    if (!isFocused) {
      loadingScreenProgress(false);
      return;
    }

    // Use params from navigation or fallback to defaults
    let signatureAlgorithm = 'rsa';
    let curveOrExponent = '65537';

    // Use provided params if available (only relevant for passport/id_card)
    if (paramSignatureAlgorithm && paramCurveOrExponent) {
      signatureAlgorithm = paramSignatureAlgorithm;
      curveOrExponent = paramCurveOrExponent;
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
  }, [
    currentState,
    fcmToken,
    isInitializing,
    circuitType,
    paramCurveOrExponent,
    paramSignatureAlgorithm,
    isFocused,
  ]);

  // Handle haptic feedback using useFocusEffect for immediate response
  useFocusEffect(
    useCallback(() => {
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
