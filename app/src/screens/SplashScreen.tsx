import React, { useCallback } from 'react';

import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import useUserStore from '../stores/userStore';
import { black } from '../utils/colors';

interface SplashScreenProps {}

const SplashScreen: React.FC<SplashScreenProps> = ({}) => {
  const navigation = useNavigation();
  const { userLoaded, passportData } = useUserStore();

  const redirect = useCallback(() => {
    if (passportData) {
      navigation.navigate('Home');
    } else {
      navigation.navigate('Launch');
    }
  }, [passportData, userLoaded]);

  return (
    <LottieView
      autoPlay
      loop={false}
      source={require('../assets/animations/splash.json')}
      style={{
        backgroundColor: black,
        marginLeft: -5,
        marginTop: -5,
        width: '105%',
        height: '105%',
      }}
      onAnimationFinish={redirect}
    />
  );
};

export default SplashScreen;
