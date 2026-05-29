// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type LottieView from 'lottie-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

  // Get document metadata from navigation params
  const {
    signatureAlgorithm: paramSignatureAlgorithm,
    curveOrExponent: paramCurveOrExponent,
  } = route?.params || {};

  // Get current state from proving machine, default to 'idle' if undefined
  // Get proving store and self client
  const selfClient = useSelfClient();
  const currentState = useProvingStore(state => state.currentState) ?? 'idle';
  const init = useProvingStore(state => state.init);
  const circuitType = useProvingStore(state => state.circuitType);
  const isFocused = useIsFocused();

  // States where it's safe to close the app
  const safeToCloseStates = ['proving', 'post_proving', 'completed'];
  const canCloseApp = safeToCloseStates.includes(currentState);

  // Initialize proving process
  useEffect(() => {
    if (!isFocused) return;

    // Always initialize when screen becomes focused, regardless of current state
    // This ensures proper reset between proving sessions
    const initializeProving = async () => {
      setIsInitializing(true);
      try {
        const selectedDocument = await loadSelectedDocument(selfClient);
        if (
          selectedDocument?.data?.documentCategory === 'aadhaar' ||
          selectedDocument?.data?.documentCategory === 'kyc'
        ) {
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
    if (!isFocused) return;

    // Setup notifications
    const unsubscribe = setupNotifications();

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isFocused]);

  // Use clean initial state while re-initializing, otherwise the live state.
  const displayState = (
    isInitializing ? 'idle' : currentState
  ) as ProvingStateType;
  const displayCircuitType = isInitializing ? 'dsc' : circuitType || 'dsc';
  const signatureAlgorithm =
    paramSignatureAlgorithm && paramCurveOrExponent
      ? paramSignatureAlgorithm
      : 'rsa';
  const curveOrExponent =
    paramSignatureAlgorithm && paramCurveOrExponent
      ? paramCurveOrExponent
      : '65537';

  const loadingText = useMemo(
    () =>
      getLoadingScreenText(
        displayState,
        signatureAlgorithm,
        curveOrExponent,
        displayCircuitType,
      ),
    [displayState, signatureAlgorithm, curveOrExponent, displayCircuitType],
  );

  const animationSource = useMemo<LottieView['props']['source']>(() => {
    switch (displayState) {
      case 'error':
      case 'failure':
      case 'passport_not_supported':
      case 'account_recovery_choice':
      case 'passport_data_not_found':
        return failAnimation;
      default:
        return proveLoadingAnimation;
    }
  }, [displayState]);

  // Stop haptics when the screen loses focus while still mounted.
  useEffect(() => {
    if (!isFocused) {
      loadingScreenProgress(false);
    }
  }, [isFocused]);

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
