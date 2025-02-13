import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import LottieView from 'lottie-react-native';

// Import passport data generation and payload functions from common
import { genMockPassportData } from '../../../../common/src/utils/passports/genMockPassportData';
import { initPassportDataParsing } from '../../../../common/src/utils/passports/passport';
import { PassportData } from '../../../../common/src/utils/types';
// Import animations
import failAnimation from '../../assets/animations/loading/fail.json';
import miscAnimation from '../../assets/animations/loading/misc.json';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ProofStatusEnum, useProofInfo } from '../../stores/proofProvider';
import useUserStore from '../../stores/userStore';
import { sendDscPayload } from '../../utils/proving/payload';

const LoadingScreen: React.FC = () => {
  const goToSuccessScreen = useHapticNavigation(
    'AccountVerifiedSuccess',
    'default',
  );
  const [animationSource, setAnimationSource] = useState<any>(miscAnimation);
  const { status, setStatus } = useProofInfo();

  // Ensure we only set the initial status once on mount (if needed)
  useEffect(() => {
    setStatus(ProofStatusEnum.PENDING);
  }, []);

  useEffect(() => {
    // Change animation based on the global proof status.
    if (status === ProofStatusEnum.SUCCESS) {
      goToSuccessScreen();
    } else if (
      status === ProofStatusEnum.FAILURE ||
      status === ProofStatusEnum.ERROR
    ) {
      setAnimationSource(failAnimation);
    }
  }, [status]);

  useEffect(() => {
    const processPayload = async () => {
      try {
        // Generate passport data and update the store.
        const passportData = genMockPassportData(
          'sha1',
          'sha256',
          'rsa_sha256_65537_2048',
          'FRA',
          '000101',
          '300101',
        );
        const passportDataInit = initPassportDataParsing(passportData);
        await useUserStore.getState().registerPassportData(passportDataInit);
        // This will trigger sendPayload(), which updates global status via your tee.ts code.
        await sendDscPayload(
          useUserStore.getState().passportData as PassportData,
        );
      } catch (error) {
        console.error('Error processing payload:', error);
        setStatus(ProofStatusEnum.ERROR);
      }
    };
    processPayload();
  }, []);

  return (
    <LottieView
      autoPlay
      // Loop only the misc animation. Once payload processing completes,
      // success or error animations will display without looping.
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
