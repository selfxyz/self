import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import failAnimation from '../../assets/animations/loading/fail.json';
import miscAnimation from '../../assets/animations/loading/misc.json';
import successAnimation from '../../assets/animations/loading/success.json';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { usePassport } from '../../stores/passportDataProvider';
import { ProofStatusEnum, useProofInfo } from '../../stores/proofProvider';
import {
  checkPassportSupported,
  isPassportNullified,
  isUserRegistered,
  registerPassport,
} from '../../utils/proving/payload';

const LoadingScreen: React.FC = () => {
  const goToSuccessScreen = useHapticNavigation('AccountVerifiedSuccess');
  const goToErrorScreen = useHapticNavigation('ConfirmBelongingScreen');
  const goToUnsupportedScreen = useHapticNavigation('UnsupportedPassport');
  const navigation = useNavigation();

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
  const { registrationStatus, resetProof, setProofVerificationResult } =
    useProofInfo();
  const { getPassportDataAndSecret, clearPassportData } = usePassport();

  useEffect(() => {
    setProofVerificationResult(null);
    resetProof();
  }, []);

  useEffect(() => {
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
          const isSupported = checkPassportSupported(passportData);
          if (!isSupported) {
            goToUnsupportedScreen();
            console.log('Passport not supported');
            clearPassportData();
            return;
          }
          const isRegistered = await isUserRegistered(passportData, secret);
          const isNullifierOnchain = await isPassportNullified(passportData);
          console.log('User is registered:', isRegistered);
          console.log('Passport is nullified:', isNullifierOnchain);
          if (isRegistered) {
            console.log(
              'Passport is registered already. Skipping to HomeScreen',
            );
            navigation.navigate('Home');
            return;
          }
          if (isNullifierOnchain) {
            console.log(
              'Passport is nullified, but not registered with this secret. Prompt to restore secret from iCloud or manual backup',
            );
            navigation.navigate('AccountRecoveryChoice');
            return;
          }
          registerPassport(passportData, secret);
        } catch (error) {
          console.error('Error processing payload:', error);
          setTimeout(() => resetProof(), 1000);
        }
      };
      processPayload();
    }
  }, []);

  return (
    <LottieView
      autoPlay
      loop={animationSource === miscAnimation}
      source={animationSource}
      style={styles.animation}
      resizeMode="cover"
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
  },
});

export default LoadingScreen;
