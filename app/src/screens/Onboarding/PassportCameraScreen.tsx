import React, { useCallback } from 'react';
import { Platform, StyleSheet } from 'react-native';

import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { View, XStack, YStack } from 'tamagui';

import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import {
  PassportCamera,
  PassportCameraProps,
} from '../../components/native/PassportCamera';
import Additional from '../../components/typography/Additional';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import Bulb from '../../images/icons/passport_camera_bulb.svg';
import Scan from '../../images/icons/passport_camera_scan.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import useUserStore from '../../stores/userStore';
import { startCameraScan } from '../../utils/cameraScanner';
import { slate800 } from '../../utils/colors';

interface PassportNFCScanScreen {}

const PassportCameraScreen: React.FC<PassportNFCScanScreen> = ({}) => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const store = useUserStore();
  const onPassportRead = useCallback<PassportCameraProps['onPassportRead']>(
    (error, result) => {
      if (error) {
        // TODO: handle error better
        console.error(error);
      } else {
        const { passportNumber, dateOfBirth, dateOfExpiry } = result!;
        store.update({ passportNumber, dateOfBirth, dateOfExpiry });
        navigation.navigate('PassportNFCScan');
      }
    },
    [store, navigation],
  );

  const onIOSMount = useCallback(() => {
    if (Platform.OS === 'ios') {
      const cancelCamera = startCameraScan(onPassportRead);
      return cancelCamera;
    }
  }, [onPassportRead]);

  useFocusEffect(() => {
    return onIOSMount();
  });

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        <PassportCamera onPassportRead={onPassportRead} isMounted={isFocused} />
        <LottieView
          autoPlay
          loop
          source={require('../../assets/animations/passport_scan.json')}
          style={{
            position: 'absolute',
            width: '115%',
            height: '115%',
          }}
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection>
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

          <SecondaryButton
            onPress={() => navigation.navigate('PassportOnboarding')}
          >
            Cancel
          </SecondaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default PassportCameraScreen;

const styles = StyleSheet.create({
  subheader: {
    color: slate800,
    textAlign: 'left',
    textAlignVertical: 'top',
  },
  description: {
    textAlign: 'left',
  },
});
