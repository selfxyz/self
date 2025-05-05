import messaging from '@react-native-firebase/messaging';
import { StaticScreenProps, useIsFocused, useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, StyleSheet, Text, View } from 'react-native';

import failAnimation from '../../assets/animations/loading/fail.json';
import miscAnimation from '../../assets/animations/loading/misc.json';
import successAnimation from '../../assets/animations/loading/success.json';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import analytics from '../../utils/analytics';
import { useProvingStore } from '../../utils/proving/provingMachine';

const { trackEvent } = analytics();

// Initialize Firebase Messaging
const initializeMessaging = async () => {
  try {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log(
        'Message handled in the background in LoadingScreen!',
        remoteMessage,
      );
    });

    messaging().onMessage(async remoteMessage => {
      console.log(
        'Foreground message received in LoadingScreen:',
        remoteMessage,
      );

      if (remoteMessage && remoteMessage.notification) {
        console.log('Notification title:', remoteMessage.notification.title);
        console.log('Notification body:', remoteMessage.notification.body);
        console.log('Notification data:', remoteMessage.data);
      }
    });

    messaging().onTokenRefresh(token => {
      console.log('FCM token refreshed:', token);
    });

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      console.log('Current notification permission status:', hasPermission);
    }

    console.log('Firebase messaging initialized for', Platform.OS);
  } catch (error) {
    console.error('Firebase messaging initialization error:', error);
  }
};

type LoadingScreenProps = StaticScreenProps<{
  sessionId: string;
  mockPassportFlow?: boolean;
  deviceToken?: string;
}>;

const LoadingScreen: React.FC<LoadingScreenProps> = ({ route }) => {
  const sessionId = route.params?.sessionId;
  const deviceToken = route.params?.deviceToken;
  const mockPassportFlow = route.params?.mockPassportFlow;

  // Animation states
  const [animationSource, setAnimationSource] = useState<any>(miscAnimation);

  // Navigation hooks
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  // ProvingMachine state
  const currentState = useProvingStore(state => state.currentState);
  const errorCode = useProvingStore(state => state.error_code);
  const errorReason = useProvingStore(state => state.reason);

  // Status text that will be shown to the user
  const [processingStatus, setProcessingStatus] = useState<string>("Initializing...");
  const [canCloseApp, setCanCloseApp] = useState<boolean>(false);

  const goToSuccessScreen = useHapticNavigation('AccountVerifiedSuccess');
  const goToErrorScreen = useHapticNavigation('Launch');
  const goToUnsupportedScreen = useHapticNavigation('UnsupportedPassport');
  const goToAccountRecoveryScreen = useHapticNavigation('AccountRecoveryChoice');

  // Initialize messaging system when component mounts
  useEffect(() => {
    initializeMessaging();
  }, []);

  // Configure proving store with sessionId and deviceToken
  useEffect(() => {
    if (sessionId && deviceToken) {
      console.log("Setting session ID and device token in proving store");
      useProvingStore.getState().setSessionId(sessionId);
      useProvingStore.getState().setDeviceToken(deviceToken);

      // If proving machine is in the 'idle' state, start the process
      if (currentState === 'idle') {
        // This will start the proving process now that we have the sessionId and deviceToken
        useProvingStore.getState().init('register');
      }
    } else if (sessionId) {
      // Set just the sessionId if that's all we have
      useProvingStore.getState().setSessionId(sessionId);

      if (currentState === 'idle') {
        useProvingStore.getState().init('register');
      }
    }
  }, [sessionId, deviceToken, currentState]);

  // Monitor the proving machine state and update UI accordingly
  useEffect(() => {
    if (isFocused) {
      console.log('[LoadingScreen] Current proving state:', currentState);

      if (currentState) {
        // Update UI based on state
        switch (currentState) {
          case 'checking_passport':
            setProcessingStatus('Checking if your passport is supported...');
            break;
          case 'checking_registration':
            setProcessingStatus('Checking your registration status...');
            break;
          case 'checking_dsc':
            setProcessingStatus('Checking if your DSC is registered...');
            break;
          case 'sending_dsc':
            setProcessingStatus('Your DSC is not registered. Sending DSC payload...');
            break;
          case 'dsc_processing':
            setProcessingStatus('DSC verification started. You can close the app now.');
            setCanCloseApp(true);
            break;
          case 'sending_registration':
            setProcessingStatus('Sending your passport payload...');
            break;
          case 'registration_processing':
            setProcessingStatus('Passport registration started. You can close the app now.');
            setCanCloseApp(true);
            break;
          case 'passport_unsupported':
            setAnimationSource(failAnimation);
            trackEvent('Passport not supported', {
              reason: errorCode || 'unknown',
              details: errorReason || 'No details available',
            });
            setTimeout(() => goToUnsupportedScreen(), 2000);
            break;
          case 'already_registered':
            setAnimationSource(successAnimation);
            setTimeout(() => navigation.navigate('AccountVerifiedSuccess'), 2000);
            break;
          case 'needs_recovery':
            setAnimationSource(miscAnimation);
            setTimeout(() => goToAccountRecoveryScreen(), 2000);
            break;
          case 'completed':
            setAnimationSource(successAnimation);
            setTimeout(() => goToSuccessScreen(), 3000);
            break;
          case 'error':
          case 'failure':
            setAnimationSource(failAnimation);
            setTimeout(() => goToErrorScreen(), 3000);
            break;
          default:
            setAnimationSource(miscAnimation);
            setProcessingStatus('Processing your request...');
            break;
        }
      }
    }
  }, [currentState, errorCode, errorReason, isFocused, navigation, goToSuccessScreen, goToErrorScreen, goToUnsupportedScreen, goToAccountRecoveryScreen]);

  return (
    <View style={styles.container}>
      <LottieView
        autoPlay
        loop={animationSource === miscAnimation}
        source={animationSource}
        style={styles.animation}
        resizeMode="cover"
        renderMode="HARDWARE"
      />
      <Text style={styles.statusText}>{processingStatus}</Text>
      <Text style={styles.warningText}>
        {canCloseApp
          ? "Processing has started. You can close the app now."
          : "This can take up to one minute, don't close the app"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  animation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  warningText: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    padding: 16,
  },
  statusText: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    padding: 16,
  },
});

export default LoadingScreen;
