import React, { useCallback, useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import messaging from '@react-native-firebase/messaging';
import {
  StaticScreenProps,
  useNavigation,
  usePreventRemove,
} from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { v4 as uuidv4 } from 'uuid';

import successAnimation from '../../assets/animations/loading/success.json';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { black, white } from '../../utils/colors';
import { impactLight, notificationSuccess } from '../../utils/haptic';
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
      const authStatus = await messaging().requestPermission({
        announcement: true, // Request permission to play notification sounds
        badge: true, // Request permission to update app badge
        carPlay: false, // Not needed for most apps
        criticalAlert: false, // Not needed for most apps
        provisional: true, // Allow provisional permissions (silent notifications first)
        sound: true, // Request permission to play sounds
      });

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('iOS notification permission not enabled');
        return null;
      }
    }

    // Register with APNs for iOS
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }

    // Get token using the new modular API
    const token = await messaging().getToken();
    console.log('FCM token obtained successfully:', token ? 'yes' : 'no');
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

const sendFCMTokenToServer = async (
  deviceToken: string,
  sessionId: string,
  mockPassportFlow: boolean | undefined,
) => {
  if (!deviceToken || !sessionId) {
    console.error(
      'Missing device token or session ID for FCM token registration',
    );
    return;
  }

  const API_URL = mockPassportFlow
    ? 'https://9ebd-133-3-201-46.ngrok-free.app'
    : 'https://api.self.xyz';

  // Ensure token is properly formatted - no spaces or unexpected characters
  const cleanedToken = deviceToken.trim();

  const deviceTokenRegistration = {
    session_id: sessionId,
    device_token: cleanedToken,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  };

  // Log only the first/last few characters of the token for security/debugging
  if (cleanedToken.length > 10) {
    console.log(
      '- Device token:',
      `${cleanedToken.substring(0, 5)}...${cleanedToken.substring(
        cleanedToken.length - 5,
      )}`,
    );
  } else {
    console.log('- Device token: [token too short]');
  }

  try {
    // Test that we can properly stringify this object
    const requestBody = JSON.stringify(deviceTokenRegistration);
    console.log('Request body length:', requestBody.length);

    const response = await fetch(`${API_URL}/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response error:', response.status, errorText);
      throw new Error(
        `FCM token registration failed: ${response.status} - ${errorText}`,
      );
    }

    // Safely handle the response
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
        console.log('FCM token registered successfully with session_id');
      } else {
        const text = await response.text();
        console.log('FCM token registration response (non-JSON):', text);
      }
    } catch (responseError) {
      console.error('Error processing response:', responseError);
    }
  } catch (error) {
    console.error('Failed to send FCM token to server:', error);
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
  const [_fcmToken, setFcmToken] = useState<string | null>(null);
  const [sessionId] = useState(() => uuidv4());

  const navigation = useNavigation();

  const handleConfirm = useCallback(async () => {
    if (!permissionRequested) {
      setPermissionRequested(true);

      try {
        const token = await getFCMToken();
        if (token) {
          setFcmToken(token);

          // Clean the token if it contains spaces
          let cleanedToken = token;
          if (typeof token === 'string' && token.includes(' ')) {
            console.warn(
              'FCM token contains spaces, which may cause issues. Cleaning token...',
            );
            cleanedToken = token.trim().split(' ').pop() || token.trim();
          }

          // Send FCM token to server before navigating
          await sendFCMTokenToServer(cleanedToken, sessionId, mockPassportFlow);

          impactLight();
          navigation.navigate('LoadingScreen', {
            mockPassportFlow,
            sessionId,
          });
          return;
        }
      } catch (error) {
        console.error(
          'Failed in notification permission or token flow:',
          error,
        );
      }
    }

    impactLight();
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
    };

    checkNotificationPermission();
  }, []);

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
