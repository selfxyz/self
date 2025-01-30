import React, { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  NativeEventEmitter,
  NativeModules,
  Platform,
  Text,
} from 'react-native';
import NfcManager from 'react-native-nfc-manager';

import { useNavigation } from '@react-navigation/native';
import { Image, View } from 'tamagui';

import ButtonsContainer from '../../components/ButtonsContainer';
import TextsContainer from '../../components/TextsContainer';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import Description from '../../components/typography/Description';
import Title from '../../components/typography/Title';
import NFC_IMAGE from '../../images/nfc.png';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import useUserStore from '../../stores/userStore';
import { black } from '../../utils/colors';
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
  const [scanningMessage, setScanningMessage] = useState('');

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

  const onPress = useCallback(async () => {
    if (isNfcEnabled) {
      try {
        setIsNfcSheetOpen(true);
        await scan({ passportNumber, dateOfBirth, dateOfExpiry });
        // Feels better somehow
        await new Promise(resolve => setTimeout(resolve, 1000));
        navigation.navigate('NextScreen');
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _cancelScanIfRunning = useCallback(async () => {
    // // TODO: cancel if scanning
    // setIsNfcSheetOpen(false);
  }, [isNfcSheetOpen]);

  useEffect(() => {
    checkNfcSupport();

    if (Platform.OS === 'android' && emitter) {
      const subscription = emitter.addListener(
        'NativeEvent',
        (event: string) => {
          console.log(event);
          setScanningMessage(event);
        },
      );

      return () => {
        subscription.remove();
      };
    }
  }, [checkNfcSupport]);

  console.log('text?', scanningMessage);

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        {/* TODO a placeholder for animation */}
        <View height={400} bg={black} />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection>
        {isNfcSheetOpen ? (
          <>
            <TextsContainer>
              <Title children="Ready to scan" />
              <Description children={scanningMessage} />
            </TextsContainer>

            <Image
              h="$8"
              w="$8"
              alignSelf="center"
              borderRadius={1000}
              source={{
                uri: NFC_IMAGE,
              }}
            />
            <Text>
              Hold your device near the NFC tag and stop moving when it
              vibrates.
            </Text>
          </>
        ) : (
          <>
            <TextsContainer>
              <Title children="Verify your passport" />
              <Description
                children={
                  isNfcEnabled
                    ? 'Open your passport to the last page to access the NFC chip. Place your phone against the page'
                    : dialogMessage
                }
              />
            </TextsContainer>
            <ButtonsContainer>
              <PrimaryButton onPress={onPress} disabled={!isNfcSupported}>
                {isNfcEnabled || !isNfcSupported
                  ? 'Start Scan'
                  : 'Open settings'}
              </PrimaryButton>
              <SecondaryButton onPress={() => navigation.navigate('Home')}>
                Cancel
              </SecondaryButton>
            </ButtonsContainer>
          </>
        )}
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default PassportNFCScanScreen;
