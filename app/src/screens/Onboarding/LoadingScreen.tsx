import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { PermissionsAndroid } from 'react-native';

import { StaticScreenProps, useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import messaging from '@react-native-firebase/messaging';
import { v4 as uuidv4 } from 'uuid';

import failAnimation from '../../assets/animations/loading/fail.json';
import miscAnimation from '../../assets/animations/loading/misc.json';
import successAnimation from '../../assets/animations/loading/success.json';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { usePassport } from '../../stores/passportDataProvider';
import { ProofStatusEnum, useProofInfo } from '../../stores/proofProvider';
import analytics from '../../utils/analytics';
import {
  checkPassportSupported,
  isPassportNullified,
  isUserRegistered,
  registerPassport,
} from '../../utils/proving/payload';

const { trackEvent } = analytics();

const initializeMessaging = async () => {
  try {
    // バックグラウンドハンドラーの登録
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background in LoadingScreen!', remoteMessage);
    });
    
    // フォアグラウンド通知の処理を設定
    messaging().onMessage(async remoteMessage => {
      console.log('Foreground message received in LoadingScreen:', remoteMessage);
      
      // メッセージの詳細をログに記録
      if (remoteMessage && remoteMessage.notification) {
        console.log('Notification title:', remoteMessage.notification.title);
        console.log('Notification body:', remoteMessage.notification.body);
        console.log('Notification data:', remoteMessage.data);
      }
    });
    
    // トークンが変更されたときのハンドラーを設定
    messaging().onTokenRefresh(token => {
      console.log('FCM token refreshed:', token);
    });
    
    // Android 13+の場合は通知パーミッションを確認
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      console.log('Current notification permission status:', hasPermission);
    }
    
    console.log('Firebase messaging initialized for', Platform.OS);
  } catch (error) {
    console.error('Firebase messaging initialization error:', error);
  }
};

type LoadingScreenProps = StaticScreenProps<{
  fcmToken?: string;
  mockPassportFlow?: boolean;
}>;

const LoadingScreen: React.FC<LoadingScreenProps> = ({ route }) => {
  const fcmToken = route.params?.fcmToken;
  const [sessionId] = useState(() => uuidv4());
  
  // Firebaseの初期化
  useEffect(() => {
    initializeMessaging();
  }, []);
  
  const goToSuccessScreen = useHapticNavigation('AccountVerifiedSuccess');
  const goToErrorScreen = useHapticNavigation('Launch');
  const goToUnsupportedScreen = useHapticNavigation('UnsupportedPassport');
  const navigation = useNavigation();

  const sendFCMTokenToServer = async (deviceToken: string, sessionId: string) => {
    try {
      const passportDataAndSecret = await getPassportDataAndSecret()
        .catch(error => {
          console.error('Error getting passport data for FCM token registration:', error);
          return null;
        });
      
      if (!passportDataAndSecret) {
        console.error('No passport data available for FCM token registration');
        return;
      }
      
      const { passportData } = passportDataAndSecret.data;
      
      const API_URL = passportData.documentType === 'mock_passport' 
        ? 'https://2ac4-133-3-201-46.ngrok-free.app' 
        : 'https://api.self.xyz';
      
      // Ensure token is properly formatted - no spaces or unexpected characters
      const cleanedToken = deviceToken.trim();
      
      const deviceTokenRegistration = {
        session_id: sessionId,
        device_token: cleanedToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android'
      };
      
      console.log('Sending FCM token registration:');
      console.log('- Session ID:', sessionId);
      console.log('- Platform:', Platform.OS);
      // Log only the first/last few characters of the token for security/debugging
      if (cleanedToken.length > 10) {
        console.log('- Device token:', `${cleanedToken.substring(0, 5)}...${cleanedToken.substring(cleanedToken.length - 5)}`);
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
            'Accept': 'application/json'
          },
          body: requestBody,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server response error:', response.status, errorText);
          throw new Error(`FCM token registration failed: ${response.status} - ${errorText}`);
        }
        
        // Safely handle the response
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.indexOf('application/json') !== -1) {
            const result = await response.json();
            console.log('FCM token registered successfully with session_id');
          } else {
            const text = await response.text();
            console.log('FCM token registration response (non-JSON):', text);
          }
        } catch (responseError) {
          console.error('Error processing response:', responseError);
        }
      } catch (jsonError) {
        console.error('JSON processing error:', jsonError);
        // Try a simplified version if JSON stringification failed
        const simplePayload = JSON.stringify({
          session_id: sessionId,
          device_token: "token-removed-due-to-error",
          platform: Platform.OS === 'ios' ? 'ios' : 'android'
        });
        
        console.log('Attempting with simplified payload');
        
        const response = await fetch(`${API_URL}/register-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: simplePayload,
        });
        
        console.log('Simplified request result:', response.status);
      }
    } catch (error) {
      console.error('Failed to send FCM token to server:', error);
    }
  };

  const processPayloadCalled = useRef(false);
  const fcmTokenSent = useRef(false);

  const goToSuccessScreenWithDelay = () => {
    setTimeout(() => {
      goToSuccessScreen();
    }, 3000);
  };
  const goToErrorScreenWithDelay = () => {
    setTimeout(() => {
      goToErrorScreen();
    }, 3000);
  };
  const [animationSource, setAnimationSource] = useState<any>(miscAnimation);
  const { registrationStatus, resetProof } = useProofInfo();
  const { getPassportDataAndSecret, clearPassportData } = usePassport();

  useEffect(() => {
    // TODO this makes sense if reset proof was only about passport registration
    resetProof();
  }, []);

  useEffect(() => {
    console.log('registrationStatus', registrationStatus);
    if (registrationStatus === ProofStatusEnum.SUCCESS) {
      setAnimationSource(successAnimation);
      goToSuccessScreenWithDelay();
      setTimeout(() => resetProof(), 3000);
    } else if (
      registrationStatus === ProofStatusEnum.FAILURE ||
      registrationStatus === ProofStatusEnum.ERROR
    ) {
      setAnimationSource(failAnimation);
      goToErrorScreenWithDelay();
      setTimeout(() => resetProof(), 3000);
    }
  }, [registrationStatus]);

  useEffect(() => {
    if (!processPayloadCalled.current) {
      processPayloadCalled.current = true;
      const processPayload = async () => {
        try {
          if (fcmToken && sessionId && Platform.OS === 'android' && !fcmTokenSent.current) {
            console.log('FCM token before sending:', typeof fcmToken, fcmToken ? fcmToken.length : 0);
            // Validate token format
            if (typeof fcmToken === 'string' && fcmToken.includes(' ')) {
              console.warn('FCM token contains spaces, which may cause issues. Cleaning token...');
              // If the token includes spaces, it might be malformed - take only the part after the last space
              const cleanedToken = fcmToken.trim().split(' ').pop() || fcmToken.trim();
              await sendFCMTokenToServer(cleanedToken, sessionId);
            } else {
              await sendFCMTokenToServer(fcmToken, sessionId);
            }
            fcmTokenSent.current = true;
          }

          const passportDataAndSecret = await getPassportDataAndSecret();
          if (!passportDataAndSecret) {
            return;
          }
          const { passportData, secret } = passportDataAndSecret.data;
          const isSupported = await checkPassportSupported(passportData);
          if (isSupported.status !== 'passport_supported') {
            trackEvent('Passport not supported', {
              reason: isSupported.status,
              details: isSupported.details,
            });
            goToUnsupportedScreen();
            console.log('Passport not supported');
            clearPassportData();
            return;
          }
          const isRegistered = await isUserRegistered(passportData, secret);
          console.log('User is registered:', isRegistered);
          if (isRegistered) {
            console.log(
              'Passport is registered already. Skipping to AccountVerifiedSuccess',
            );
            navigation.navigate('AccountVerifiedSuccess');
            return;
          }
          const isNullifierOnchain = await isPassportNullified(passportData);
          console.log('Passport is nullified:', isNullifierOnchain);
          if (isNullifierOnchain) {
            console.log(
              'Passport is nullified, but not registered with this secret. Prompt to restore secret from iCloud or manual backup',
            );
            navigation.navigate('AccountRecoveryChoice');
            return;
          }
          
          await registerPassport(
            passportData, 
            secret, 
            sessionId
          );
          
        } catch (error) {
          console.error('Error processing payload:', error);
          setTimeout(() => resetProof(), 1000);
        }
      };
      processPayload();
    }
  }, []);

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
      <Text style={styles.warningText}>
        This can take up to one minute, don't close the app
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
});

export default LoadingScreen;
