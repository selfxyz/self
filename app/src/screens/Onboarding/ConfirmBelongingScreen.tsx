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
    
    // iOSの場合は通知許可を求める - Add additional options for better permissions
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission({
        announcement: true,  // Request permission to play notification sounds
        badge: true,         // Request permission to update app badge
        carPlay: false,      // Not needed for most apps
        criticalAlert: false, // Not needed for most apps
        provisional: true,   // Allow provisional permissions (silent notifications first)
        sound: true,         // Request permission to play sounds
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
          title: "Notification Permission",
          message: "The app needs permission to send you notifications",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
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
  const { getPassportDataAndSecret } = usePassport();
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const navigation = useNavigation();
  
  const handleConfirm = useCallback(async () => {
    if (!permissionRequested) {
      setPermissionRequested(true);
      
      try {
        const token = await getFCMToken();
        if (token) {
          setFcmToken(token);
          
          impactLight();
          navigation.navigate('LoadingScreen', {
            mockPassportFlow,
            fcmToken: token,
          });
          return;
        }
      } catch (error) {
        console.error('Failed in notification permission or token flow:', error);
      }
    }
    
    impactLight();
    navigation.navigate('LoadingScreen', {
      mockPassportFlow,
      fcmToken: undefined,
    });
  }, [permissionRequested, navigation, mockPassportFlow]);
  
  useEffect(() => {
    notificationSuccess();
    
    // 画面が表示されたら通知パーミッションを確認し、必要に応じてリクエスト
    const checkNotificationPermission = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          // チェックだけして、まだリクエストしない
          const hasPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
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
