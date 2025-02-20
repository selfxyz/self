import React, { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import splashAnimation from '../assets/animations/splash.json';
import { loadSecret, useAuth } from '../stores/authProvider';
import { loadPassportData } from '../stores/passportDataProvider';
import { useSettingStore } from '../stores/settingStore';
import { black } from '../utils/colors';
import { impactLight } from '../utils/haptic';

const SplashScreen: React.FC = ({}) => {
  const navigation = useNavigation();
  const { createSigningKeyPair } = useAuth();
  const { setBiometricsAvailable } = useSettingStore();

  useEffect(() => {
    createSigningKeyPair()
      .then(setBiometricsAvailable)
      .catch(err => {
        console.warn(
          'Something ELSE and totally unexpected went wrong during keypair creation',
          err,
        );
      });
  }, [createSigningKeyPair]);

  const handleAnimationFinish = useCallback(() => {
    setTimeout(async () => {
      impactLight();
      const secret = await loadSecret();
      const passportData = await loadPassportData();

      if (secret && passportData) {
        navigation.navigate('Home');
      } else {
        navigation.navigate('Launch');
      }
    }, 1000);
  }, [loadSecret, loadPassportData, navigation]);

  return (
    <LottieView
      autoPlay
      loop={false}
      source={splashAnimation}
      style={styles.animation}
      onAnimationFinish={handleAnimationFinish}
      resizeMode="cover"
      cacheComposition={true}
      renderMode="HARDWARE"
    />
  );
};

const styles = StyleSheet.create({
  animation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    width: '100%',
    backgroundColor: black,
  },
});

export default SplashScreen;
