// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useNavigation } from '@react-navigation/native';
import { PassportData } from '@selfxyz/common';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';

import splashAnimation from '../../assets/animations/splash.json';
import { useAuth } from '../../providers/authProvider';
import {
  loadPassportDataAndSecret,
  storePassportData,
} from '../../providers/passportDataProvider';
import {
  loadSelectedDocument,
  migrateFromLegacyStorage,
} from '../../providers/passportDataProvider';
import { useProtocolStore } from '../../stores/protocolStore';
import { useSettingStore } from '../../stores/settingStore';
import { black } from '../../utils/colors';
import { impactLight } from '../../utils/haptic';
import { isUserRegistered } from '../../utils/proving/validateDocument';

const SplashScreen: React.FC = ({}) => {
  const navigation = useNavigation();
  const { checkBiometricsAvailable } = useAuth();
  const { setBiometricsAvailable } = useSettingStore();
  const [isAnimationFinished, setIsAnimationFinished] = React.useState(false);
  const [nextScreen, setNextScreen] = React.useState<string | null>(null);
  const dataLoadInitiatedRef = useRef(false);

  useEffect(() => {
    if (!dataLoadInitiatedRef.current) {
      dataLoadInitiatedRef.current = true;
      console.log('Starting data loading and validation...');

      checkBiometricsAvailable()
        .then(setBiometricsAvailable)
        .catch(err => {
          console.warn('Error checking biometrics availability', err);
        });

      const loadDataAndDetermineNextScreen = async () => {
        try {
          await migrateFromLegacyStorage();
          const selectedDocument = await loadSelectedDocument();

          if (!selectedDocument) {
            console.log('No document found, navigating to Launch');
            setNextScreen('Launch');
            return;
          }
          const { data: passportData } = selectedDocument;
          if (!isPassportDataValid(passportData)) {
            console.log('Invalid passport data, navigating to Launch');
            setNextScreen('Launch');
            return;
          }
          const migratedPassportData = migratePassportData(passportData);
          if (migratedPassportData !== passportData) {
            await storePassportData(migratedPassportData);
          }
          const environment = (migratedPassportData as PassportData).mock
            ? 'stg'
            : 'prod';
          const documentCategory = (migratedPassportData as PassportData)
            .documentCategory;
          await useProtocolStore
            .getState()
            [
              documentCategory
            ].fetch_all(environment, (migratedPassportData as PassportData).dsc_parsed!.authorityKeyIdentifier);

          // Get secret and check registration
          const passportDataAndSecret = await loadPassportDataAndSecret();
          if (!passportDataAndSecret) {
            setNextScreen('Launch');
            return;
          }

          const { secret } = JSON.parse(passportDataAndSecret);
          const isRegistered = await isUserRegistered(
            migratedPassportData,
            secret,
          );
          console.log('User is registered:', isRegistered);
          if (isRegistered) {
            console.log(
              'Passport is registered already. Setting next screen to Home',
            );
            setNextScreen('Home');
            return;
          }
          // Currently, we dont check isPassportNullified(passportData);
          // This could lead to AccountRecoveryChoice just like in LoadingScreen
          // But it looks better right now to keep the LaunchScreen flow
          // In case user wants to try with another passport.
          // Long term, we could also show a modal instead that prompts the user to recover or scan a new passport.

          // Rest of the time, keep the LaunchScreen flow

          setNextScreen('Launch');
        } catch (error) {
          console.error(`Error in SplashScreen data loading: ${error}`);
          setNextScreen('Launch');
        }
      };

      loadDataAndDetermineNextScreen();
    }
  }, []);

  const handleAnimationFinish = useCallback(() => {
    impactLight();
    setIsAnimationFinished(true);
  }, []);

  useEffect(() => {
    if (isAnimationFinished && nextScreen) {
      console.log(`Navigating to ${nextScreen}`);
      requestAnimationFrame(() => {
        navigation.navigate(nextScreen as any);
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

function isPassportDataValid(passportData: PassportData) {
  if (!passportData) {
    return false;
  }
  if (!passportData.passportMetadata) {
    return false;
  }
  if (!passportData.passportMetadata.dg1HashFunction) {
    return false;
  }
  if (!passportData.passportMetadata.eContentHashFunction) {
    return false;
  }
  if (!passportData.passportMetadata.signedAttrHashFunction) {
    return false;
  }
  return true;
}

function migratePassportData(passportData: PassportData): PassportData {
  const migratedData = { ...passportData } as any;
  if (!('documentCategory' in migratedData) || !('mock' in migratedData)) {
    if ('documentType' in migratedData && migratedData.documentType) {
      migratedData.mock = migratedData.documentType.startsWith('mock');
      migratedData.documentCategory = migratedData.documentType.includes(
        'passport',
      )
        ? 'passport'
        : 'id_card';
    } else {
      migratedData.documentType = 'passport';
      migratedData.documentCategory = 'passport';
      migratedData.mock = false;
    }

    console.log('Migrated passport data:', {
      documentType: migratedData.documentType,
      documentCategory: migratedData.documentCategory,
      mock: migratedData.mock,
    });
  }

  return migratedData as PassportData;
}
