import React, { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import splashAnimation from '../assets/animations/splash.json';
import { useAuth } from '../stores/authProvider';
import { useSettingStore } from '../stores/settingStore';
import useUserStore from '../stores/userStore';
import { black } from '../utils/colors';
import { impactLight } from '../utils/haptic';

const SplashScreen: React.FC = ({}) => {
  const navigation = useNavigation();
  const { createSigningKeyPair } = useAuth();
  const { setBiometricsAvailable } = useSettingStore();
  const { userLoaded, passportData } = useUserStore();

  useEffect(() => {
    createSigningKeyPair()
      .then(setBiometricsAvailable)
      .catch(err => {
        console.warn(
          'Something ELSE and totally unexpected went wrong during keypair creation',
          err,
        );
      });
  }, []);

  const redirect = useCallback(() => {
    if (userLoaded && passportData) {
      navigation.navigate('Home');
    } else {
      navigation.navigate('Launch');
    }
  }, [passportData, userLoaded]);

  const handleAnimationFinish = useCallback(() => {
    setTimeout(() => {
      impactLight();
      redirect();
    }, 1000);
  }, [userLoaded]);

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
