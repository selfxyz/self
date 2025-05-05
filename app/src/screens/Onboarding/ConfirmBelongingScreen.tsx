import messaging from '@react-native-firebase/messaging';
import { StaticScreenProps, useNavigation, usePreventRemove } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

import successAnimation from '../../assets/animations/loading/success.json';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { black, white } from '../../utils/colors';
import { impactLight, notificationSuccess } from '../../utils/haptic';
import { useProvingStore } from '../../utils/proving/provingMachine';
import { styles } from '../ProveFlow/ProofRequestStatusScreen';

// Attempt to get FCM token directly
const getFCMToken = async () => {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const hasPermission = await requestAndroidNotificationPermissions();
      if (!hasPermission) {
        console.log('Android notification permission denied');
        return null;
      }
    }

    if (Platform.OS === 'ios') {
      console.log('Requesting iOS notification permissions...');

      try {
        await messaging().registerDeviceForRemoteMessages();
        console.log('Successfully registered for remote messages');
      } catch (regError) {
        console.warn('Error registering for remote messages:', regError);
      }

      const authStatus = await messaging().requestPermission({
        announcement: true,
        badge: true,
        carPlay: false,
        provisional: false,
        sound: true,
      });

      console.log('iOS permission request result:', authStatus);

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('iOS notification permission not enabled');
        return null;
      }
    }

    // Get token using the new modular API
    console.log('Attempting to get FCM token...');
    const token = await messaging().getToken();
    console.log('FCM token obtained successfully:', token ? 'yes' : 'no');
    if (token) {
      console.log('Token starts with:', token.substring(0, 10));
    }
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Request Android notification permissions directly using the Android Permissions API
const requestAndroidNotificationPermissions = async () => {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message: 'The app needs permission to send you notifications',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      console.log('POST_NOTIFICATIONS permission result:', granted);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // For Android < 33, no runtime permission needed
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return false;
  }
};

type ConfirmBelongingScreenProps = StaticScreenProps<
  | {
      mockPassportFlow?: boolean;
    }
  | undefined
>;

const ConfirmBelongingScreen: React.FC<ConfirmBelongingScreenProps> = ({
  route,
}) => {
  const mockPassportFlow = route.params?.mockPassportFlow;
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [sessionId] = useState(() => uuidv4());

  const navigation = useNavigation();

  const handleConfirm = useCallback(async () => {
    if (!permissionRequested) {
      setPermissionRequested(true);
      console.log('Confirming belonging, requesting notification permissions...');

      try {
        const token = await getFCMToken();
        if (token) {
          // Clean the token if it contains spaces
          let cleanedToken = token;
          if (typeof token === 'string' && token.includes(' ')) {
            console.warn(
              'FCM token contains spaces, which may cause issues. Cleaning token...',
            );
            cleanedToken = token.trim().split(' ').pop() || token.trim();
          }

          setFcmToken(cleanedToken);
          console.log('Successfully obtained FCM token, navigating to LoadingScreen');

          impactLight();
          navigation.navigate('LoadingScreen', {
            mockPassportFlow,
            sessionId,
            deviceToken: cleanedToken,
          });
          return;
        } else {
          console.log('Failed to get FCM token, proceeding without it');
        }
      } catch (error) {
        console.error(
          'Failed in notification permission or token flow:',
          error,
        );
      }
    }

    impactLight();
    console.log('Navigating to LoadingScreen without FCM token');
    navigation.navigate('LoadingScreen', {
      mockPassportFlow,
      sessionId,
    });
  }, [permissionRequested, navigation, mockPassportFlow, sessionId]);

  useEffect(() => {
    notificationSuccess();

    const checkNotificationPermission = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          const hasPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          console.log('Already has notification permission:', hasPermission);
        } catch (error) {
          console.error('Error checking notification permission:', error);
        }
      }

      if (Platform.OS === 'ios') {
        try {
          const authStatus = await messaging().hasPermission();
          console.log('Current iOS notification permission status:', authStatus);
        } catch (error) {
          console.error('Error checking iOS notification permission status:', error);
        }
      }
    };

    checkNotificationPermission();
    provingStore.init('dsc');
  const navigate = useHapticNavigation('LoadingScreen', {
    params: {
      mockPassportFlow,
    },
  });
  const provingStore = useProvingStore();
  }, []);

  const onOkPress = async () => {
    // Initialize the proving process just before navigation
    // This ensures a fresh start each time
    try {
      // Initialize the state machine

      // Mark as user confirmed - proving will start automatically when ready
      provingStore.setUserConfirmed();

      // Navigate to loading screen
      navigate();
    } catch (error) {
      console.error('Error initializing proving process:', error);
    }
  };

  // Prevents back navigation
  usePreventRemove(true, () => {});

  return (
    <>
      <ExpandableBottomLayout.Layout backgroundColor={black}>
        <ExpandableBottomLayout.TopSection backgroundColor={black}>
          <LottieView
            autoPlay
            loop={false}
            source={successAnimation}
            style={styles.animation}
            cacheComposition={true}
            renderMode="HARDWARE"
          />
        </ExpandableBottomLayout.TopSection>
        <ExpandableBottomLayout.BottomSection
          gap={20}
          paddingBottom={20}
          backgroundColor={white}
        >
          <Title textAlign="center">Confirm your identity</Title>
          <Description textAlign="center" paddingBottom={20}>
            By continuing, you certify that this passport belongs to you and is
            not stolen or forged.
          </Description>
          <PrimaryButton onPress={handleConfirm}>Confirm</PrimaryButton>
        </ExpandableBottomLayout.BottomSection>
      </ExpandableBottomLayout.Layout>
    </>
  );
};

export default ConfirmBelongingScreen;
