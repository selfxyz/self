// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import LottieView from 'lottie-react-native';
import React, { useCallback, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { View, XStack, YStack } from 'tamagui';
import { useIsFocused, useNavigation } from '@react-navigation/native';

import {
  formatDateToYYMMDD,
  hasAnyValidRegisteredDocument,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import { PassportEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import passportScanAnimation from '@/assets/animations/passport_scan.json';
import { SecondaryButton } from '@/components/buttons/SecondaryButton';
import type { PassportCameraProps } from '@/components/native/PassportCamera';
import { PassportCamera } from '@/components/native/PassportCamera';
import Additional from '@/components/typography/Additional';
import Description from '@/components/typography/Description';
import { Title } from '@/components/typography/Title';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import Scan from '@/images/icons/passport_camera_scan.svg';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import useUserStore from '@/stores/userStore';
import analytics from '@/utils/analytics';
import { black, slate400, slate800, white } from '@/utils/colors';
import { dinot } from '@/utils/fonts';
import { checkScannedInfo } from '@/utils/utils';

const { trackEvent } = analytics();

const DocumentCameraScreen: React.FC = () => {
  const client = useSelfClient();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const store = useUserStore();

  // Add a ref to track when the camera screen is mounted
  const scanStartTimeRef = useRef(Date.now());

  const onPassportRead = useCallback<PassportCameraProps['onPassportRead']>(
    (error, result) => {
      // Calculate scan duration in seconds with exactly 2 decimal places
      const scanDurationSeconds = (
        (Date.now() - scanStartTimeRef.current) /
        1000
      ).toFixed(2);

      if (error) {
        console.error(error);
        trackEvent(PassportEvents.CAMERA_SCAN_FAILED, {
          reason: 'unknown_error',
          error: error.message || 'Unknown error',
          duration_seconds: parseFloat(scanDurationSeconds),
        });
        //TODO: Add error handling here
        return;
      }

      if (!result) {
        console.error('No result from passport scan');
        trackEvent(PassportEvents.CAMERA_SCAN_FAILED, {
          reason: 'invalid_input',
          error: 'No result from scan',
          duration_seconds: parseFloat(scanDurationSeconds),
        });
        return;
      }

      const {
        documentNumber,
        dateOfBirth,
        dateOfExpiry,
        documentType,
        issuingCountry,
      } = result;

      const formattedDateOfBirth =
        Platform.OS === 'ios' ? formatDateToYYMMDD(dateOfBirth) : dateOfBirth;
      const formattedDateOfExpiry =
        Platform.OS === 'ios' ? formatDateToYYMMDD(dateOfExpiry) : dateOfExpiry;

      if (
        !checkScannedInfo(
          documentNumber,
          formattedDateOfBirth,
          formattedDateOfExpiry,
        )
      ) {
        trackEvent(PassportEvents.CAMERA_SCAN_FAILED, {
          reason: 'invalid_format',
          passportNumberLength: documentNumber.length,
          dateOfBirthLength: formattedDateOfBirth.length,
          dateOfExpiryLength: formattedDateOfExpiry.length,
          duration_seconds: parseFloat(scanDurationSeconds),
        });
        navigation.navigate('DocumentCameraTrouble');
        return;
      }

      store.update({
        passportNumber: documentNumber,
        dateOfBirth: formattedDateOfBirth,
        dateOfExpiry: formattedDateOfExpiry,
        documentType: documentType?.trim() || '',
        countryCode: issuingCountry?.trim().toUpperCase() || '',
      });

      trackEvent(PassportEvents.CAMERA_SCAN_SUCCESS, {
        duration_seconds: parseFloat(scanDurationSeconds),
      });

      navigation.navigate('DocumentNFCScan');
    },
    [store, navigation],
  );
  const navigateToLaunch = useHapticNavigation('Launch', {
    action: 'cancel',
  });
  const navigateToHome = useHapticNavigation('Home', {
    action: 'cancel',
  });

  const onCancelPress = async () => {
    const hasValidDocument = await hasAnyValidRegisteredDocument(client);
    if (hasValidDocument) {
      navigateToHome();
    } else {
      navigateToLaunch();
    }
  };

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.TopSection roundTop backgroundColor={black}>
        <PassportCamera onPassportRead={onPassportRead} isMounted={isFocused} />
        <LottieView
          autoPlay
          loop
          source={passportScanAnimation}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={white}>
        <YStack alignItems="center" gap="$2.5">
          <YStack alignItems="center" gap="$6" paddingBottom="$2.5">
            <Title>Scan your ID</Title>
            <XStack gap="$6" alignSelf="flex-start" alignItems="flex-start">
              <View paddingTop="$2">
                <Scan height={40} width={40} color={slate800} />
              </View>
              <View maxWidth="75%">
                <Description style={styles.subheader}>
                  Open to the photograph page
                </Description>
                <Additional style={styles.description}>
                  Lay your document flat and position the machine readable text
                  in the viewfinder
                </Additional>
              </View>
            </XStack>
          </YStack>

          <Additional style={styles.disclaimer}>
            SELF WILL NOT CAPTURE AN IMAGE OF YOUR PASSPORT.
          </Additional>

          <SecondaryButton
            trackEvent={PassportEvents.CAMERA_SCREEN_CLOSED}
            onPress={onCancelPress}
          >
            Cancel
          </SecondaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default DocumentCameraScreen;

const styles = StyleSheet.create({
  animation: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  subheader: {
    color: slate800,
    textAlign: 'left',
    textAlignVertical: 'top',
  },
  description: {
    textAlign: 'left',
  },
  disclaimer: {
    fontFamily: dinot,
    textAlign: 'center',
    fontSize: 11,
    color: slate400,
    textTransform: 'uppercase',
    width: '100%',
    alignSelf: 'center',
    letterSpacing: 0.44,
    marginTop: 0,
    marginBottom: 10,
  },
});
