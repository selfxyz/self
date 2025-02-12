import React, { useCallback, useState } from 'react';
import {
  Linking,
  NativeEventEmitter,
  NativeModules,
  Platform,
  StyleSheet,
} from 'react-native';
import NfcManager from 'react-native-nfc-manager';

import {
  useFocusEffect,
  useNavigation,
  usePreventRemove,
} from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { Image } from 'tamagui';

import passportVerifyAnimation from '../../assets/animations/passport_verify.json';
import ButtonsContainer from '../../components/ButtonsContainer';
import TextsContainer from '../../components/TextsContainer';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { BodyText } from '../../components/typography/BodyText';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import NFC_IMAGE from '../../images/nfc.png';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import useUserStore from '../../stores/userStore';
import { black, slate100, white } from '../../utils/colors';
import { buttonTap } from '../../utils/haptic';
import { scan } from '../../utils/nfcScannerNew';

interface PassportNFCScanScreenProps {}

const emitter =
  Platform.OS === 'android'
    ? new NativeEventEmitter(NativeModules.nativeModule)
    : null;

const PassportNFCScanScreen: React.FC<PassportNFCScanScreenProps> = ({}) => {
  const navigation = useNavigation();
  let { passportNumber, dateOfBirth, dateOfExpiry } = useUserStore();
  const [dialogMessage, setDialogMessage] = useState('');
  const [isNfcSupported, setIsNfcSupported] = useState(true);
  const [isNfcEnabled, setIsNfcEnabled] = useState(true);
  const [isNfcSheetOpen, setIsNfcSheetOpen] = useState(false);

  usePreventRemove(true, () => {});

  const checkNfcSupport = useCallback(async () => {
    const isSupported = await NfcManager.isSupported();
    if (isSupported) {
      const isEnabled = await NfcManager.isEnabled();
      if (!isEnabled) {
        setDialogMessage(
          'NFC is not enabled. Would you like to enable it in settings?',
        );
        setIsNfcEnabled(false);
      }
      setIsNfcSupported(true);
    } else {
      setDialogMessage(
        "Sorry, your device doesn't seem to have an NFC reader.",
      );
      setIsNfcSupported(false);
    }
  }, []);

  const onVerifyPress = useCallback(async () => {
    buttonTap();
    if (isNfcEnabled) {
      try {
        setIsNfcSheetOpen(true);
        await scan({ passportNumber, dateOfBirth, dateOfExpiry });
        // Feels better somehow
        await new Promise(resolve => setTimeout(resolve, 1000));
        navigation.navigate('ConfirmBelongingScreen');
      } catch (e) {
        console.log(e);
      } finally {
        setIsNfcSheetOpen(false);
      }
    } else if (isNfcSupported) {
      if (Platform.OS === 'ios') {
        Linking.openURL('App-Prefs:root=General&path=About');
      } else {
        Linking.sendIntent('android.settings.NFC_SETTINGS');
      }
    }
  }, [isNfcSupported, isNfcEnabled, passportNumber, dateOfBirth, dateOfExpiry]);
  const onCancelPress = useHapticNavigation('PassportCamera', 'cancel');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _cancelScanIfRunning = useCallback(async () => {
    // // TODO: cancel if scanning
    // setIsNfcSheetOpen(false);
  }, [isNfcSheetOpen]);

  useFocusEffect(
    useCallback(() => {
      checkNfcSupport();

      if (Platform.OS === 'android' && emitter) {
        const subscription = emitter.addListener(
          'NativeEvent',
          (event: string) => console.info(event),
        );

        return () => {
          subscription.remove();
        };
      }
    }, [checkNfcSupport]),
  );

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection roundTop backgroundColor={slate100}>
        <LottieView
          autoPlay
          loop={false}
          source={passportVerifyAnimation}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={white}>
        {isNfcSheetOpen ? (
          <>
            <TextsContainer>
              <Title children="Ready to scan" />
              <BodyText textAlign="center">
                Hold your device near the NFC tag and stop moving when it
                vibrates.
              </BodyText>
            </TextsContainer>
            <Image
              h="$8"
              w="$8"
              alignSelf="center"
              borderRadius={1000}
              source={{
                uri: NFC_IMAGE,
              }}
              margin={20}
            />
          </>
        ) : (
          <>
            <TextsContainer>
              <Title>Verify your passport</Title>
              <Description
                children={
                  isNfcEnabled
                    ? 'Open your passport to the last page to access the NFC chip. Place your phone against the page'
                    : dialogMessage
                }
              />
            </TextsContainer>
            <ButtonsContainer>
              <PrimaryButton onPress={onVerifyPress} disabled={!isNfcSupported}>
                {isNfcEnabled || !isNfcSupported
                  ? 'Start Scan'
                  : 'Open settings'}
              </PrimaryButton>
              <SecondaryButton onPress={onCancelPress}>Cancel</SecondaryButton>
            </ButtonsContainer>
          </>
        )}
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default PassportNFCScanScreen;

const styles = StyleSheet.create({
  animation: {
    color: slate100,
    width: '115%',
    height: '115%',
  },
});
