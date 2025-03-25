import React, { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import splashAnimation from '../assets/animations/splash.json';
import { useAuth } from '../stores/authProvider';
import { loadPassportDataAndSecret } from '../stores/passportDataProvider';
import { useSettingStore } from '../stores/settingStore';
import { black } from '../utils/colors';
import { impactLight } from '../utils/haptic';
import { isRegistrationPending, isUserRegistered } from '../utils/proving/payload';
import { ProofStatusEnum } from '../stores/proofProvider';

const SplashScreen: React.FC = ({}) => {
  const navigation = useNavigation();
  const { checkBiometricsAvailable } = useAuth();
  const { setBiometricsAvailable, registrationSessionId, setRegistrationSessionId } = useSettingStore();

  useEffect(() => {
    checkBiometricsAvailable()
      .then(setBiometricsAvailable)
      .catch(err => {
        console.warn('Error checking biometrics availability', err);
      });
  }, []);

  const handleAnimationFinish = useCallback(() => {
    setTimeout(async () => {
      impactLight();
      const passportDataAndSecret = await loadPassportDataAndSecret();

      if (!passportDataAndSecret) {
        navigation.navigate('Launch');
        return;
      }

      const { passportData, secret } = JSON.parse(passportDataAndSecret);

      console.log('registrationSessionId', registrationSessionId);

      if (registrationSessionId) {
        try {
          const isMock = passportData.documentType === 'mock_passport';
          const status = await isRegistrationPending(registrationSessionId, isMock);
          if (status === ProofStatusEnum.PENDING) {
            navigation.navigate('LoadingScreen', { });
            return;
          } else if (status === ProofStatusEnum.SUCCESS) {
            setRegistrationSessionId(null);
            navigation.navigate('AccountVerifiedSuccess');
            return;
          } else {
            setRegistrationSessionId(null);
            navigation.navigate('Launch');
          }
        } catch (error) {
          console.error('Error verifying session:', error);
          setRegistrationSessionId(null);
          navigation.navigate('Launch');
        }
      }

      const isRegistered = await isUserRegistered(passportData, secret);
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
  }, [navigation, registrationSessionId, setRegistrationSessionId]);

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
