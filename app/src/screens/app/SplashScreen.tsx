// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
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
  peekQueuedUrl,
  setDeeplinkParentScreen,
} from '@/navigation/deeplinks';
import {
  hasSecretStored,
  migrateToSecureKeychain,
  useAuth,
} from '@/providers/authProvider';
import {
  checkAndUpdateRegistrationStates,
  checkIfAnyDocumentsNeedMigration,
  initializeNativeModules,
  migrateFromLegacyStorage,
} from '@/providers/passportDataProvider';
import {
  getStartupNavigationTarget,
  hasStartupRecoverySignal,
} from '@/screens/app/startupRouting';
import { initializeSupportUuidContext } from '@/services/supportUuid';
import {
  useSettingStore,
  waitForSettingStoreHydration,
} from '@/stores/settingStore';
import { IS_DEV_MODE } from '@/utils/devUtils';

const INIT_TIMEOUT_MS = 30_000;

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
  const settledRef = useRef(false);

  useEffect(() => {
    if (!dataLoadInitiatedRef.current) {
      dataLoadInitiatedRef.current = true;

      checkBiometricsAvailable()
        .then(setBiometricsAvailable)
        .catch(err => {
          console.warn('Error checking biometrics availability', err);
        });

      const loadDataAndDetermineNextScreen = async () => {
        const startTime = Date.now();
        const elapsed = () => `${Date.now() - startTime}ms`;

        try {
          const modulesReady = await initializeNativeModules();
          console.log(
            `SplashScreen: initializeNativeModules complete (${elapsed()})`,
          );
          if (!modulesReady) {
            console.warn(
              'Native modules not ready, proceeding with limited functionality',
            );
          }

          await migrateFromLegacyStorage();
          console.log(
            `SplashScreen: migrateFromLegacyStorage complete (${elapsed()})`,
          );
          await waitForSettingStoreHydration();
          try {
            initializeSupportUuidContext();
          } catch (error) {
            console.warn(
              'SplashScreen: failed to initialize support UUID context',
              error,
            );
          }

          const needsMigration = await checkIfAnyDocumentsNeedMigration();
          console.log(
            `SplashScreen: checkIfAnyDocumentsNeedMigration complete (${elapsed()})`,
          );
          if (needsMigration) {
            await checkAndUpdateRegistrationStates(selfClient);
            console.log(
              `SplashScreen: checkAndUpdateRegistrationStates complete (${elapsed()})`,
            );
          }

          const [hasRegisteredDocument, hasStoredSecret] = await Promise.all([
            hasAnyValidRegisteredDocument(selfClient),
            hasSecretStored(),
          ]);
          console.log(
            `SplashScreen: hasAnyValidRegisteredDocument complete (${elapsed()})`,
          );
          const settings = useSettingStore.getState();
          const startupTarget = getStartupNavigationTarget({
            hasPrivacyNoteBeenDismissed: settings.hasPrivacyNoteBeenDismissed,
            hasRecoverySignal: hasStartupRecoverySignal({
              cloudBackupEnabled: settings.cloudBackupEnabled,
              hasViewedRecoveryPhrase: settings.hasViewedRecoveryPhrase,
              pointsAddress: settings.pointsAddress,
            }),
            hasSecretStored: hasStoredSecret,
            hasValidRegisteredDocument: hasRegisteredDocument,
          });
          const parentScreen = startupTarget.route;

          try {
            await migrateToSecureKeychain();
            console.log(
              `SplashScreen: migrateToSecureKeychain complete (${elapsed()})`,
            );
          } catch (error) {
            console.warn('Keychain migration failed, continuing:', error);
          }

          if (settledRef.current) return;
          settledRef.current = true;

          setDeeplinkParentScreen(parentScreen);

          const queuedUrl = startupTarget.allowQueuedDeepLink
            ? getAndClearQueuedUrl()
            : peekQueuedUrl();
          if (queuedUrl && startupTarget.allowQueuedDeepLink) {
            if (IS_DEV_MODE) {
              console.log('Processing queued deeplink:', queuedUrl);
            }
            setQueuedDeepLink(queuedUrl);
          } else {
            setNextScreen('WebViewHost' as keyof RootStackParamList);
          }
        } catch (error) {
          if (settledRef.current) return;
          settledRef.current = true;

          console.error(
            `SplashScreen: initialization failed (${elapsed()})`,
            error,
          );
          const fallbackScreen = useSettingStore.getState()
            .hasPrivacyNoteBeenDismissed
            ? 'Home'
            : 'Disclaimer';
          setDeeplinkParentScreen(fallbackScreen);
          setNextScreen('WebViewHost' as keyof RootStackParamList);
        }
      };

      const timeoutId = setTimeout(() => {
        if (settledRef.current) return;
        settledRef.current = true;

        console.error(
          `SplashScreen: initialization timed out after ${INIT_TIMEOUT_MS}ms`,
        );
        const fallbackScreen = useSettingStore.getState()
          .hasPrivacyNoteBeenDismissed
          ? 'Home'
          : 'Disclaimer';
        setDeeplinkParentScreen(fallbackScreen);
        setNextScreen(fallbackScreen);
      }, INIT_TIMEOUT_MS);

      loadDataAndDetermineNextScreen().finally(() => {
        clearTimeout(timeoutId);
      });
    }
  }, [checkBiometricsAvailable, setBiometricsAvailable, selfClient]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsAnimationFinished(prev => {
        if (!prev) {
          console.warn('SplashScreen: animation timeout, proceeding');
        }
        return true;
      });
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  const handleAnimationFinish = useCallback(() => {
    impactLight();
    setIsAnimationFinished(true);
  }, []);

  useEffect(() => {
    if (isAnimationFinished) {
      if (queuedDeepLink) {
        requestAnimationFrame(() => {
          handleUrl(selfClient, queuedDeepLink).catch(error => {
            console.error('Error handling queued deep link:', error);
          });
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
