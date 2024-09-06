import React, { useState } from 'react';
import { YStack, Text, XStack, Button, ScrollView } from 'tamagui';
import { bgGreen, borderColor, textBlack, textColor1 } from '../utils/colors';
import { Carousel } from '../components/Carousel';
import US_PASSPORT from '../images/us_passport.jpeg'
import REMOVE_CASE from '../images/remove_case.jpeg'
import US_PASSPORT_LASTPAGE from '../images/passport_lastpage_graybg.jpeg'
import US_PASSPORT_LASTPAGE_IOS from '../images/passport_lastpage_iphone.jpeg'
import US_PASSPORT_LASTPAGE_ANDROID from '../images/passport_lastpage_android.jpeg'
import PHONE_SCANBUTTON from "../images/phone_scanbutton.jpeg"

import Dialog from "react-native-dialog";
import NfcManager from 'react-native-nfc-manager';
import { Platform, Linking } from 'react-native';

interface NfcScreenProps {
  handleNFCScan: () => void;
}

const NfcScreen: React.FC<NfcScreenProps> = ({ handleNFCScan }) => {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [isNfcSupported, setIsNfcSupported] = useState(true);
  const carouselImages = [US_PASSPORT, REMOVE_CASE, US_PASSPORT_LASTPAGE, Platform.OS === 'ios' ? US_PASSPORT_LASTPAGE_IOS : US_PASSPORT_LASTPAGE_ANDROID, PHONE_SCANBUTTON,];

  const openNfcSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('App-Prefs:root=General&path=About');
    } else {
      Linking.sendIntent('android.settings.NFC_SETTINGS');
    }
    setDialogVisible(false);
  };

  const checkNfcSupport = async () => {
    const isSupported = await NfcManager.isSupported();
    if (isSupported) {
      const isEnabled = await NfcManager.isEnabled();
      if (!isEnabled) {
        setDialogMessage('NFC is not enabled. Would you like to enable it in settings?');
        setDialogVisible(true);
        setIsNfcSupported(true);
        return false;
      }
      return true;
    } else {
      setDialogMessage("Sorry, your device doesn't seem to have an NFC reader.");
      setDialogVisible(true);
      setIsNfcSupported(false);
      return false;
    }
  };

  const handleNfcScan = async () => {
    const nfcSupported = await checkNfcSupport();
    if (nfcSupported) {
      handleNFCScan();
    }
  };

  return (
    <ScrollView flex={1} contentContainerStyle={{ flexGrow: 1 }}>
      <YStack f={1} p="$3" >
        <Text fontSize="$9" mt="$0" color={textBlack} mb="$4" ml="$2">Verify your passport using <Text fontSize="$9" color={textBlack} style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>NFC</Text></Text>
        <Carousel
          images={carouselImages}
          height={300}
          handleNfcScan={handleNfcScan}
        />
        <Dialog.Container visible={dialogVisible}>
          <Dialog.Title>NFC Status</Dialog.Title>
          <Dialog.Description>
            {dialogMessage}
          </Dialog.Description>
          {isNfcSupported ? (
            <XStack>
              <XStack f={1} />
              <Dialog.Button label="Open Settings" onPress={openNfcSettings} />
            </XStack>
          ) : (
            <Dialog.Button label="OK" onPress={() => setDialogVisible(false)} />
          )}
        </Dialog.Container>
      </YStack>
    </ScrollView>
  );
};

export default NfcScreen;