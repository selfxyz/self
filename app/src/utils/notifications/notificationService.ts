import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';

const API_URL = 'https://notification.self.xyz';
const API_URL_STAGING = 'https://notification.staging.self.xyz';

export const getStateMessage = (state: string): string => {
  switch (state) {
    case 'idle':
      return 'Getting ready...';
    case 'fetching_data':
      return 'Fetching data...';
    case 'validating_document':
      return 'Validating document...';
    case 'init_tee_connexion':
      return 'Preparing secure environment...';
    case 'ready_to_prove':
      return 'Ready to prove...';
    case 'proving':
      return 'Generating proof...';
    case 'post_proving':
      return 'Finalizing...';
    case 'completed':
      return 'Verification completed!';
    case 'error':
      return 'Error occurred';
    case 'passport_not_supported':
      return 'Passport not supported';
    case 'account_recovery_choice':
      return 'Account recovery needed';
    case 'passport_data_not_found':
      return 'Passport data not found';
    case 'failure':
      return 'Verification failed';
    default:
      return 'Processing...';
  }
};

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission denied');
          return false;
        }
      }
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log('Notification permission status:', enabled);

    return enabled;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

export async function getFCMToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    if (token) {
      console.log('FCM Token received');
      return token;
    }
    return null;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

export async function registerDeviceToken(
  sessionId: string,
  deviceToken?: string,
  isMockPassport?: boolean,
): Promise<void> {
  try {
    let token = deviceToken;
    if (!token) {
      token = await messaging().getToken();
      if (!token) {
        console.log('No FCM token available');
        return;
      }
    }

    const cleanedToken = token.trim();
    const baseUrl = isMockPassport ? API_URL_STAGING : API_URL;

    const deviceTokenRegistration = {
      session_id: sessionId,
      device_token: cleanedToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    };

    if (cleanedToken.length > 10) {
      console.log(
        'Registering device token:',
        `${cleanedToken.substring(0, 5)}...${cleanedToken.substring(
          cleanedToken.length - 5,
        )}`,
      );
    }

    const response = await fetch(`${baseUrl}/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(deviceTokenRegistration),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        'Failed to register device token:',
        response.status,
        errorText,
      );
    } else {
      console.log(
        'Device token registered successfully with session_id:',
        sessionId,
      );
    }
  } catch (error) {
    console.error('Error registering device token:', error);
  }
}

export interface RemoteMessage {
  messageId?: string;
  data?: { [key: string]: string | object };
  notification?: {
    title?: string;
    body?: string;
  };
  [key: string]: any;
}

export function setupNotifications(): () => void {
  messaging().setBackgroundMessageHandler(
    async (remoteMessage: RemoteMessage) => {
      console.log('Message handled in the background!', remoteMessage);
    },
  );

  const unsubscribeForeground = messaging().onMessage(
    async (remoteMessage: RemoteMessage) => {
      console.log('Foreground message received:', remoteMessage);
    },
  );

  return unsubscribeForeground;
}
