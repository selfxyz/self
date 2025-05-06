import { Platform } from 'react-native';
import { getFCMToken, requestNotificationPermission } from '../utils/notifications/notificationService';

export async function initializeFirebase(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await requestNotificationPermission();
    }

    const token = await getFCMToken();
    if (token) {
      console.log('Firebase initialized with token');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}
