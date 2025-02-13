import React, { useCallback } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { useIsFocused, useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { View, XStack, YStack } from 'tamagui';

import passportScanAnimation from '../../assets/animations/passport_scan.json';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import {
  PassportCamera,
  PassportCameraProps,
} from '../../components/native/PassportCamera';
import Additional from '../../components/typography/Additional';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import Bulb from '../../images/icons/passport_camera_bulb.svg';
import Scan from '../../images/icons/passport_camera_scan.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import useNavigationStore from '../../stores/navigationStore';
import useUserStore from '../../stores/userStore';
import { black, slate800, white } from '../../utils/colors';
import { checkScannedInfo, formatDateToYYMMDD } from '../../utils/utils';

interface PassportNFCScanScreen {}

const PassportCameraScreen: React.FC<PassportNFCScanScreen> = ({}) => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const store = useUserStore();
  const { trackEvent } = useNavigationStore();

  const onPassportRead = useCallback<PassportCameraProps['onPassportRead']>(
    (error, result) => {
      if (error) {
        console.error(error);
        //TODO: Add error handling here
        return;
      }

      if (!result) {
        console.error('No result from passport scan');
        return;
      }

      const { passportNumber, dateOfBirth, dateOfExpiry } = result;

      const formattedDateOfBirth =
        Platform.OS === 'ios' ? formatDateToYYMMDD(dateOfBirth) : dateOfBirth;
      const formattedDateOfExpiry =
        Platform.OS === 'ios' ? formatDateToYYMMDD(dateOfExpiry) : dateOfExpiry;

      if (
        !checkScannedInfo(
          passportNumber,
          formattedDateOfBirth,
          formattedDateOfExpiry,
        )
      ) {
        trackEvent('Passport Camera Scan Failed', {
          passportNumberLength: passportNumber.length,
          dateOfBirthLength: formattedDateOfBirth.length,
          dateOfExpiryLength: formattedDateOfExpiry.length,
        });
        navigation.navigate('PassportCameraTrouble');
        return;
      }

      store.update({
        passportNumber,
        dateOfBirth: formattedDateOfBirth,
        dateOfExpiry: formattedDateOfExpiry,
      });
      console.log('Updated store with:', {
        passportNumber,
        dateOfBirth: formattedDateOfBirth,
        dateOfExpiry: formattedDateOfExpiry,
      });
      navigation.navigate('PassportNFCScan');
    },
    [store, navigation],
  );
  const onCancelPress = useHapticNavigation('Launch', {
    action: 'cancel',
  });

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.TopSection roundTop backgroundColor={black}>
        <PassportCamera
          key={isFocused ? 'active' : 'inactive'}
          onPassportRead={onPassportRead}
          isMounted={isFocused}
        />
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
          <YStack alignItems="center" gap="$6" pb="$2.5">
            <Title>Scan your passport</Title>
            <XStack gap="$6" alignSelf="flex-start" alignItems="flex-start">
              <View pt="$2">
                <Scan height={40} width={40} color={slate800} />
              </View>
              <View maxWidth="75%">
                <Description style={styles.subheader}>
                  Open to the photograph page
                </Description>
                <Additional style={styles.description}>
                  Position all four corners of the first passport page clearly
                  in the frame.
                </Additional>
              </View>
            </XStack>
            <XStack gap="$6" alignSelf="flex-start" alignItems="flex-start">
              <View pt="$2">
                <Bulb height={40} width={40} color={slate800} />
              </View>
              <View
                alignItems="flex-start"
                justifyContent="flex-start"
                maxWidth="75%"
              >
                <Description style={styles.subheader}>
                  Avoid dim lighting or glare
                </Description>
                <Additional style={styles.description}>
                  Ensure that the text and photo are clearly readable and well
                  lit.
                </Additional>
              </View>
            </XStack>
          </YStack>

          <SecondaryButton onPress={onCancelPress}>Cancel</SecondaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default PassportCameraScreen;

const styles = StyleSheet.create({
  animation: {
    position: 'absolute',
    width: '115%',
    height: '115%',
  },
  subheader: {
    color: slate800,
    textAlign: 'left',
    textAlignVertical: 'top',
  },
  description: {
    textAlign: 'left',
  },
});
