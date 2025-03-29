import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import splashAnimation from '../assets/animations/splash.json';
import { usePassport } from '../stores/passportDataProvider';
import { usePassportProcessing } from '../stores/passportProcessingProvider';
import { black } from '../utils/colors';
import { impactLight } from '../utils/haptic';

const SplashScreen: React.FC = ({}) => {
  const navigation = useNavigation();
  const { passportData, privateKey, passportAndSecretStatus } = usePassport();
  const { isRegistered } = usePassportProcessing();

  const handleAnimationFinish = useCallback(() => {
    setTimeout(async () => {
      impactLight();
      if (passportAndSecretStatus !== 'success') {
        return;
      }

      if (!passportData || !privateKey) {
        navigation.navigate('Launch');
        return;
      }

      console.log('User is registered:', isRegistered);
      if (isRegistered) {
        console.log('Passport is registered already. Skipping to HomeScreen');
        navigation.navigate('Home');
        return;
      }
      // Currently, we dont check isPassportNullified(passportData);
      // This could lead to AccountRecoveryChoice just like in LoadingScreen
      // But it looks better right now to keep the LaunchScreen flow
      // In case user wants to try with another passport.
      // Long term, we could also show a modal instead that prompts the user to recover or scan a new passport.

      // Rest of the time, keep the LaunchScreen flow
      navigation.navigate('Launch');
    }, 1000);
  }, [
    navigation,
    passportData,
    privateKey,
    passportAndSecretStatus,
    isRegistered,
  ]);

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
