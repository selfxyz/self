import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import LottieView from 'lottie-react-native';

// Import passport data generation and payload functions from common
import { genMockPassportData } from '../../../../common/src/utils/passports/genMockPassportData';
// Import animations
import failAnimation from '../../assets/animations/loading/fail.json';
import miscAnimation from '../../assets/animations/loading/misc.json';
import successAnimation from '../../assets/animations/loading/success.json';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { usePassport } from '../../stores/passportDataProvider';
import { ProofStatusEnum, useProofInfo } from '../../stores/proofProvider';
import { registerPassport } from '../../utils/proving/payload';

const LoadingScreen: React.FC = () => {
  const goToSuccessScreen = useHapticNavigation('AccountVerifiedSuccess');
  const goToErrorScreen = useHapticNavigation('ConfirmBelongingScreen');
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
  const { status, setStatus, resetProof } = useProofInfo();
  const { getPassportDataAndSecret } = usePassport();

  // Ensure we only set the initial status once on mount (if needed)
  useEffect(() => {
    setStatus(ProofStatusEnum.PENDING);
  }, []);

  // New effect to reset status when the screen loads
  useEffect(() => {
    resetProof();
    processPayloadCalled.current = false;
  }, []);

  useEffect(() => {
    // Change animation based on the global proof status.
    if (status === ProofStatusEnum.SUCCESS) {
      setAnimationSource(successAnimation);
      goToSuccessScreenWithDelay();
      setTimeout(() => resetProof(), 3000);
    } else if (
      status === ProofStatusEnum.FAILURE ||
      status === ProofStatusEnum.ERROR
    ) {
      setAnimationSource(failAnimation);
      goToErrorScreenWithDelay();
      setTimeout(() => resetProof(), 3000);
    }
  }, [status]);

  // Use a ref to make sure processPayload is only executed once during the component's lifecycle.
  const processPayloadCalled = useRef(false);

  useEffect(() => {
    if (!processPayloadCalled.current) {
      processPayloadCalled.current = true;
      const processPayload = async () => {
        try {
          // // Generate passport data and update the store.
          // const passportData = genMockPassportData(
          //   'sha1',
          //   'sha256',
          //   'rsa_sha256_65537_2048',
          //   'FRA',
          //   '000101',
          //   '300101',
          // );
          // await registerPassport(passportData, '0');
          const passportDataAndSecret = await getPassportDataAndSecret();
          if (!passportDataAndSecret) {
            setStatus(ProofStatusEnum.ERROR);
            return;
          }
          const { passportData, secret } = passportDataAndSecret.data;
          console.log('passportData', passportData.dsc_parsed?.tbsBytes);
          console.log('passportData', passportData.csca_parsed?.tbsBytes);

          await registerPassport(passportData, secret);
        } catch (error) {
          console.error('Error processing payload:', error);
          setStatus(ProofStatusEnum.ERROR);
          setTimeout(() => resetProof(), 1000);
        }
      };
      processPayload();
    }
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
