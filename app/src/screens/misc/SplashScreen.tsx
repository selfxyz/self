// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import splashAnimation from '@/assets/animations/splash.json';
import type { RootStackParamList } from '@/navigation';
import { useAuth } from '@/providers/authProvider';
import {
  checkAndUpdateRegistrationStates,
  checkIfAnyDocumentsNeedMigration,
  hasAnyValidRegisteredDocument,
  initializeNativeModules,
  migrateFromLegacyStorage,
} from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';
import { black } from '@/utils/colors';
import { impactLight } from '@/utils/haptic';

const SplashScreen: React.FC = ({}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { checkBiometricsAvailable } = useAuth();
  const { setBiometricsAvailable } = useSettingStore();
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);
  const [nextScreen, setNextScreen] = useState<keyof RootStackParamList | null>(
    null,
  );
  const dataLoadInitiatedRef = useRef(false);

  useEffect(() => {
    if (!dataLoadInitiatedRef.current) {
      dataLoadInitiatedRef.current = true;

      checkBiometricsAvailable()
        .then(setBiometricsAvailable)
        .catch(err => {
          console.warn('Error checking biometrics availability', err);
        });

      const loadDataAndDetermineNextScreen = async () => {
        try {
          // Initialize native modules first, before any data operations
          const modulesReady = await initializeNativeModules();
          if (!modulesReady) {
            console.warn(
              'Native modules not ready, proceeding with limited functionality',
            );
          }

          await migrateFromLegacyStorage();

          const needsMigration = await checkIfAnyDocumentsNeedMigration();
          if (needsMigration) {
            await checkAndUpdateRegistrationStates();
          }

          const hasValid = await hasAnyValidRegisteredDocument();
          setNextScreen(hasValid ? 'Home' : 'Launch');
        } catch (error) {
          console.error(`Error in SplashScreen data loading: ${error}`);
          setNextScreen('Launch');
        }
      };

      loadDataAndDetermineNextScreen();
    }
  }, [checkBiometricsAvailable, setBiometricsAvailable]);

  const handleAnimationFinish = useCallback(() => {
    impactLight();
    setIsAnimationFinished(true);
  }, []);

  useEffect(() => {
    if (isAnimationFinished && nextScreen) {
      requestAnimationFrame(() => {
        navigation.navigate(nextScreen as never);
      });
    }
  }, [isAnimationFinished, nextScreen, navigation]);

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
