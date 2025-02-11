import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import splashAnimation from '../assets/animations/splash.json';
import useUserStore from '../stores/userStore';
import { black } from '../utils/colors';
import { impactLight } from '../utils/haptic';

const SplashScreen: React.FC = ({}) => {
  const navigation = useNavigation();
  const { userLoaded } = useUserStore();

  // TODO: Uncomment when we are done testing
  // const redirect = useCallback(() => {
  //   if (passportData) {
  //     navigation.navigate('Home');
  //   } else {
  //     navigation.navigate('Launch');
  //   }
  // }, [passportData, userLoaded]);

  const handleAnimationFinish = useCallback(() => {
    setTimeout(() => {
      impactLight();
      navigation.navigate('Launch');
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
