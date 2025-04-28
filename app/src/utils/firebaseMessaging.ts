import { Platform } from 'react-native';
import { PermissionsAndroid } from 'react-native';

import messaging from '@react-native-firebase/messaging';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

// Firebase Messagingが初期化されたかどうかのフラグ
let isInitialized = false;

/**
 * 現在の通知許可状態を確認する
 * システム設定でプッシュ通知が無効にされているかどうかも確認
 * @returns {Promise<{granted: boolean, reason?: string}>}
 */
export const checkNotificationPermissionStatus = async (): Promise<{
  granted: boolean;
  reason?: string;
}> => {
  try {
    // Androidの場合
    if (Platform.OS === 'android') {
      // Android 13 (API 33)以上の場合
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (!granted) {
          return {
            granted: false,
            reason:
              'Android notification permission not granted in system settings',
          };
        }
      }
      // Androidは古いバージョンまたは権限がある場合、メッセージングの初期化状態を確認
      return { granted: true };
    }

    // iOSの場合
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().hasPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        let reason = 'iOS notification permission not granted';

        if (authStatus === messaging.AuthorizationStatus.DENIED) {
          reason = 'iOS notifications are disabled in system settings';
        } else if (
          authStatus === messaging.AuthorizationStatus.NOT_DETERMINED
        ) {
          reason = 'iOS notification permission not requested yet';
        }

        return { granted: false, reason };
      }

      return { granted: true };
    }

    // サポートされていないプラットフォーム
    return {
      granted: false,
      reason: `Notifications not supported on platform: ${Platform.OS}`,
    };
  } catch (error: any) {
    console.error('Error checking notification permission status:', error);
    return {
      granted: false,
      reason: `Error checking permission: ${error.message || 'Unknown error'}`,
    };
  }
};

/**
 * Firebase Messagingのハンドラを設定する
 * 注意: この関数はプッシュ通知の許可を求めません
 */
export const initializeMessagingHandlers = async (): Promise<void> => {
  // 既に初期化済みの場合は何もしない
  if (isInitialized) {
    console.log('Firebase messaging handlers already initialized');
    return;
  }

  try {
    // Register background handler (doesn't request permissions)
    messaging().setBackgroundMessageHandler(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log('Message handled in the background!', remoteMessage);
      },
    );

    // Configure foreground notifications (doesn't request permissions)
    messaging().onMessage(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log('Foreground message received:', remoteMessage);

        if (Platform.OS === 'android') {
          // For Android, notifications in foreground must be handled manually
          console.log(
            'Android foreground notification:',
            remoteMessage.notification,
          );
        } else if (Platform.OS === 'ios') {
          // iOS can show foreground notifications with permissions
          console.log(
            'iOS foreground notification:',
            remoteMessage.notification,
          );
        }
      },
    );

    // Token更新時のリスナー
    messaging().onTokenRefresh((token: string) => {
      console.log('FCM token refreshed:', token);
    });

    isInitialized = true;
    console.log(
      'Firebase messaging handlers initialized (without requesting permissions)',
    );
  } catch (error) {
    console.error('Error initializing Firebase messaging handlers:', error);
  }
};

/**
 * iOSでプッシュ通知の許可を直接リクエストする
 * この関数は許可ダイアログを表示する
 */
export const requestiOSNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return true; // iOSでない場合は何もしない
  }

  try {
    // 現在の許可状態を確認
    const currentStatus = await messaging().hasPermission();

    // すでに拒否されている場合は、システム設定に誘導するべき
    if (currentStatus === messaging.AuthorizationStatus.DENIED) {
      console.log(
        'iOS notifications are denied in system settings - user should be directed to settings',
      );
      return false;
    }

    // iOSデバイス向けにリモートメッセージ受信の登録
    await messaging().registerDeviceForRemoteMessages();
    console.log('Registered device for remote messages on iOS');

    // 許可リクエスト
    const authStatus = await messaging().requestPermission({
      announcement: true, // 通知サウンド再生の許可をリクエスト
      badge: true, // アプリバッジ更新の許可をリクエスト
      carPlay: false, // ほとんどのアプリには不要
      criticalAlert: false, // ほとんどのアプリには不要
      provisional: false, // 仮の許可（最初はサイレント通知）ではなく完全な許可をリクエスト
      sound: true, // サウンド再生の許可をリクエスト
    });

    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log(
      'iOS notification permission status:',
      authStatus === messaging.AuthorizationStatus.AUTHORIZED
        ? 'AUTHORIZED'
        : authStatus === messaging.AuthorizationStatus.PROVISIONAL
        ? 'PROVISIONAL'
        : authStatus === messaging.AuthorizationStatus.DENIED
        ? 'DENIED'
        : 'UNKNOWN',
    );

    return enabled;
  } catch (error) {
    console.error('Error requesting iOS notification permission:', error);
    return false;
  }
};

/**
 * FCMトークンを取得する前に、必要な許可を得る
 * この関数は必要に応じて通知の許可を要求する
 */
export const getFCMTokenWithPermissions = async (): Promise<string | null> => {
  try {
    // 現在の許可状態を確認
    const permissionStatus = await checkNotificationPermissionStatus();
    if (!permissionStatus.granted) {
      console.log(
        'Notification permission not granted:',
        permissionStatus.reason,
      );
      return null;
    }

    // 最初にメッセージングのハンドラを初期化
    await initializeMessagingHandlers();

    // トークンを取得
    const token = await messaging().getToken();
    console.log(
      'FCM token obtained successfully:',
      token.substring(0, 10) + '...',
    );
    return token;
  } catch (error) {
    console.error('Error getting FCM token with permissions:', error);
    return null;
  }
};
