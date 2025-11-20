// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  DelayedLottieView,
  hasAnyValidRegisteredDocument,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import { black } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import splashAnimation from '@/assets/animations/splash.json';
import { impactLight } from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation';
import {
  getAndClearQueuedUrl,
  handleUrl,
  setDeeplinkParentScreen,
} from '@/navigation/deeplinks';
import { migrateToSecureKeychain, useAuth } from '@/providers/authProvider';
import {
  checkAndUpdateRegistrationStates,
  checkIfAnyDocumentsNeedMigration,
  initializeNativeModules,
  migrateFromLegacyStorage,
} from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';
import { IS_DEV_MODE } from '@/utils/devUtils';

const SplashScreen: React.FC = ({}) => {
  const selfClient = useSelfClient();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { checkBiometricsAvailable } = useAuth();
  const { setBiometricsAvailable } = useSettingStore();
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);
  const [nextScreen, setNextScreen] = useState<keyof RootStackParamList | null>(
    null,
  );
  const [queuedDeepLink, setQueuedDeepLink] = useState<string | null>(null);
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
            await checkAndUpdateRegistrationStates(selfClient);
          }

          await hasAnyValidRegisteredDocument(selfClient);
          const parentScreen = 'Home';

          // Migrate keychain to secure storage with biometric protection
          try {
            await migrateToSecureKeychain();
          } catch (error) {
            console.warn('Keychain migration failed, continuing:', error);
          }

          setDeeplinkParentScreen(parentScreen);

          const queuedUrl = getAndClearQueuedUrl();
          if (queuedUrl) {
            if (IS_DEV_MODE) {
              console.log('Processing queued deeplink:', queuedUrl);
            }
            setQueuedDeepLink(queuedUrl);
          } else {
            setNextScreen(parentScreen);
          }
        } catch (error) {
          console.error(`Error in SplashScreen data loading: ${error}`);
          setDeeplinkParentScreen('Home');
          setNextScreen('Home');
        }
      };

      loadDataAndDetermineNextScreen();
    }
  }, [checkBiometricsAvailable, setBiometricsAvailable, selfClient]);

  const handleAnimationFinish = useCallback(() => {
    impactLight();
    setIsAnimationFinished(true);
  }, []);

  useEffect(() => {
    if (isAnimationFinished) {
      if (queuedDeepLink) {
        requestAnimationFrame(() => {
          handleUrl(selfClient, queuedDeepLink);
        });
      } else if (nextScreen) {
        requestAnimationFrame(() => {
          navigation.navigate(nextScreen as never);
        });
      }
    }
  }, [isAnimationFinished, nextScreen, queuedDeepLink, navigation, selfClient]);

  return (
    <DelayedLottieView
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
