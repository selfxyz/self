import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  NativeEventEmitter,
  NativeModules,
  Platform,
  StyleSheet,
} from 'react-native';
import NfcManager from 'react-native-nfc-manager';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { Image } from 'tamagui';

import { initPassportDataParsing } from '../../../../common/src/utils/passports/passport';
import { PassportData } from '../../../../common/src/utils/types';
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
import useNavigationStore from '../../stores/navigationStore';
import { storePassportData } from '../../stores/passportDataProvider';
import useUserStore from '../../stores/userStore';
import { black, slate100, white } from '../../utils/colors';
import { buttonTap } from '../../utils/haptic';
import { parseScanResponse, scan } from '../../utils/nfcScannerNew';

interface PassportNFCScanScreenProps {}

const emitter =
  Platform.OS === 'android'
    ? new NativeEventEmitter(NativeModules.nativeModule)
    : null;

const PassportNFCScanScreen: React.FC<PassportNFCScanScreenProps> = ({}) => {
  const navigation = useNavigation();
  const { passportNumber, dateOfBirth, dateOfExpiry } = useUserStore();
  const { trackEvent } = useNavigationStore();
  const [dialogMessage, setDialogMessage] = useState('');
  const [isNfcSupported, setIsNfcSupported] = useState(true);
  const [isNfcEnabled, setIsNfcEnabled] = useState(true);
  const [isNfcSheetOpen, setIsNfcSheetOpen] = useState(false);

  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    animationRef.current?.play();
  }, []);

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
      setIsNfcSheetOpen(true);

      try {
        const scanResponse = await scan({
          passportNumber,
          dateOfBirth,
          dateOfExpiry,
        });
        console.log('NFC Scan Successful');
        trackEvent('NFC Scan Successful');

        let parsedPassportData: PassportData | null = null;
        try {
          const passportData = parseScanResponse(scanResponse);
          parsedPassportData = initPassportDataParsing(passportData);
        } catch (e: any) {
          console.error('Parsing NFC Response Unsuccessful');
          trackEvent('Parsing NFC Response Unsuccessful', {
            error: e.message,
          });
          return;
        }

        await storePassportData(parsedPassportData);
        const passportMetadata = parsedPassportData.passportMetadata!;
        trackEvent('Passport Parsed', {
          success: true,
          data_groups: passportMetadata.dataGroups,
          dg1_hash_function: passportMetadata.dg1HashFunction,
          dg1_hash_offset: passportMetadata.dg1HashOffset,
          dg_padding_bytes: passportMetadata.dgPaddingBytes,
          e_content_size: passportMetadata.eContentSize,
          e_content_hash_function: passportMetadata.eContentHashFunction,
          e_content_hash_offset: passportMetadata.eContentHashOffset,
          signed_attr_size: passportMetadata.signedAttrSize,
          signed_attr_hash_function: passportMetadata.signedAttrHashFunction,
          signature_algorithm: passportMetadata.signatureAlgorithm,
          salt_length: passportMetadata.saltLength,
          curve_or_exponent: passportMetadata.curveOrExponent,
          signature_algorithm_bits: passportMetadata.signatureAlgorithmBits,
          country_code: passportMetadata.countryCode,
          csca_found: passportMetadata.cscaFound,
          csca_hash_function: passportMetadata.cscaHashFunction,
          csca_signature_algorithm: passportMetadata.cscaSignatureAlgorithm,
          csca_salt_length: passportMetadata.cscaSaltLength,
          csca_curve_or_exponent: passportMetadata.cscaCurveOrExponent,
          csca_signature_algorithm_bits:
            passportMetadata.cscaSignatureAlgorithmBits,
          dsc: passportMetadata.dsc,
        });

        // Feels better somehow
        await new Promise(resolve => setTimeout(resolve, 1000));
        navigation.navigate('ConfirmBelongingScreen');
      } catch (e: any) {
        console.error('NFC Scan Unsuccessful:', e);
        trackEvent('NFC Scan Unsuccessful', {
          error: e.message,
        });

        if (e.message.includes('InvalidMRZKey')) {
          // iOS
          // This works and even says "MRZ key not valid for this document"
          navigation.navigate('PassportCamera');
        } else if (e.message.includes('Tag response error / no response')) {
          // iOS
          navigation.navigate('PassportNFCTrouble');
        } else if (e.message.includes('UserCanceled')) {
          // iOS
          // Do nothing
        } else if (e.message.includes('UnexpectedError')) {
          // iOS
          // Timeout reached, do nothing
        } else {
          // TODO: Handle other error types
        }
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

  const onCancelPress = useHapticNavigation('Launch', {
    action: 'cancel',
  });

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
          ref={animationRef}
          autoPlay={false}
          loop={false}
          onAnimationFinish={() => {
            setTimeout(() => {
              animationRef.current?.play();
            }, 5000); // Pause 5 seconds before playing again
          }}
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
