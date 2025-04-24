import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';

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

// Firebaseアプリの初期化
const initializeMessaging = async () => {
  try {
    // Androidのみで実行
    if (Platform.OS === 'android') {
      // 背景メッセージハンドラを設定して初期化する
      messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Message handled in the background!', remoteMessage);
      });
      console.log('Firebase messaging initialized for Android in LoadingScreen');
    } else {
      console.log('Firebase messaging initialization skipped for iOS in LoadingScreen');
    }
  } catch (error) {
    console.error('Firebase messaging initialization error in LoadingScreen:', error);
  }
};

type LoadingScreenProps = StaticScreenProps<{
  fcmToken?: string;
  mockPassportFlow?: boolean;
}>;

const LoadingScreen: React.FC<LoadingScreenProps> = ({ route }) => {
  console.log("fcmToken2: ", route.params?.fcmToken);
  const fcmToken = route.params?.fcmToken;
  console.log("fcmToken3: ", fcmToken);
  const mockPassportFlow = route.params?.mockPassportFlow;
  const [sessionId] = useState(() => uuidv4());
  
  // Firebaseの初期化
  useEffect(() => {
    initializeMessaging();
  }, []);
  
  const goToSuccessScreen = useHapticNavigation('AccountVerifiedSuccess');
  const goToErrorScreen = useHapticNavigation('Launch');
  const goToUnsupportedScreen = useHapticNavigation('UnsupportedPassport');
  const navigation = useNavigation();

  // FCMトークン送信用関数
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
        ? 'https://b60c-133-3-201-45.ngrok-free.app' 
        : 'https://api.self.xyz';
      
      const deviceTokenRegistration = {
        session_id: sessionId,
        device_token: deviceToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android'
      };
      
      console.log('Sending FCM token with session_id as tee_uuid:', sessionId);
      
      const response = await fetch(`${API_URL}/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deviceTokenRegistration),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(`FCM token registration failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('FCM token registered successfully with session_id:', result);
      
    } catch (error) {
      console.error('Failed to send FCM token to server:', error);
    }
  };

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

  const processPayloadCalled = useRef(false);

  useEffect(() => {
    if (!processPayloadCalled.current) {
      processPayloadCalled.current = true;
      const processPayload = async () => {
        try {
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
          
          // 登録処理を実行し、TEE UUIDを受け取る
          await registerPassport(
            passportData, 
            secret, 
            sessionId // 生成したUUIDをTEE通信に使用
          );

          console.log("Send fcm token");
          console.log("fcmToken", fcmToken);
          console.log("sessionId", sessionId);
          console.log("Platform.OS", Platform.OS);
          
          // FCMトークンをサーバーに送信
          if (fcmToken && sessionId && Platform.OS === 'android') {
            console.log('Using session_id for both TEE and FCM:', sessionId);
            await sendFCMTokenToServer(fcmToken, sessionId);
          }
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
