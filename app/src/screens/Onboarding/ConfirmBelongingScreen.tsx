import React, { useEffect, useCallback, useState } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';

import { StaticScreenProps, usePreventRemove, useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import messaging from '@react-native-firebase/messaging';
import firebase from '@react-native-firebase/app';

import successAnimation from '../../assets/animations/loading/success.json';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { usePassport } from '../../stores/passportDataProvider';
import { black, white } from '../../utils/colors';
import { notificationSuccess, impactLight } from '../../utils/haptic';
import { styles } from '../ProveFlow/ProofRequestStatusScreen';

// Attempt to get FCM token directly
const getFCMToken = async () => {
  try {
    // Android 13+ (API 33+)の場合は通知権限をリクエスト
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const hasPermission = await requestAndroidNotificationPermissions();
      if (!hasPermission) {
        console.log('Android notification permission denied');
        return null;
      }
    }
    
    // iOSの場合は通知許可を求める
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled = 
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      if (!enabled) {
        console.log('iOS notification permission not enabled');
        return null;
      }
    }
    
    // Get token using the new modular API
    const token = await messaging().getToken();
    console.log('FCM Token obtained:', token);
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
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      console.log('POST_NOTIFICATIONS permission:', granted);
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
  const { getPassportDataAndSecret } = usePassport();
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  
  // 直接navigationを使う
  const navigation = useNavigation();
  
  const handleConfirm = useCallback(async () => {
    if (!permissionRequested) {
      setPermissionRequested(true);
      
      try {
        const token = await getFCMToken();
        console.log("token1: ", token);
        if (token) {
          console.log("setFcmToken");
          setFcmToken(token);
          
          // トークンを取得したら、直接ナビゲーションを実行
          console.log('直接ナビゲーション実行 - FCM token:', token);
          impactLight(); // ハプティックフィードバック
          navigation.navigate('LoadingScreen', {
            mockPassportFlow,
            fcmToken: token, // 直接tokenを使用
          });
          return; // ここで処理を終了
        }
      } catch (error) {
        console.error('Failed in notification permission or token flow:', error);
      }
    }
    
    // トークンが取得できなかった場合は、undefined でナビゲーション
    console.log('トークンなしでナビゲーション実行');
    impactLight(); // ハプティックフィードバック
    navigation.navigate('LoadingScreen', {
      mockPassportFlow,
      fcmToken: undefined,
    });
  }, [permissionRequested, navigation, mockPassportFlow]);
  
  useEffect(() => {
    notificationSuccess();
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
