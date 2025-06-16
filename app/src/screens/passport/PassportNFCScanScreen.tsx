import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { getSKIPEM } from '@selfxyz/common';
import { initPassportDataParsing } from '@selfxyz/common';
import { PassportData } from '@selfxyz/common';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  NativeEventEmitter,
  NativeModules,
  Platform,
  StyleSheet,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import NfcManager from 'react-native-nfc-manager';
import { Image } from 'tamagui';

import passportVerifyAnimation from '../../assets/animations/passport_verify.json';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import ButtonsContainer from '../../components/ButtonsContainer';
import TextsContainer from '../../components/TextsContainer';
import { BodyText } from '../../components/typography/BodyText';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import { PassportEvents } from '../../consts/analytics';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import NFC_IMAGE from '../../images/nfc.png';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { storePassportData } from '../../providers/passportDataProvider';
import useUserStore from '../../stores/userStore';
import analytics from '../../utils/analytics';
import { black, slate100, white } from '../../utils/colors';
import { buttonTap } from '../../utils/haptic';
import { parseScanResponse, scan } from '../../utils/nfcScanner';

const { trackEvent } = analytics();

interface PassportNFCScanScreenProps {}

const emitter =
  Platform.OS === 'android'
    ? new NativeEventEmitter(NativeModules.nativeModule)
    : null;

const PassportNFCScanScreen: React.FC<PassportNFCScanScreenProps> = ({}) => {
  const navigation = useNavigation();
  const route = useRoute();
  const { passportNumber, dateOfBirth, dateOfExpiry } = useUserStore();
  const [dialogMessage, setDialogMessage] = useState('');
  const [isNfcSupported, setIsNfcSupported] = useState(true);
  const [isNfcEnabled, setIsNfcEnabled] = useState(true);
  const [isNfcSheetOpen, setIsNfcSheetOpen] = useState(false);

  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    animationRef.current?.play();
  }, []);

  const goToNFCMethodSelection = useHapticNavigation(
    'PassportNFCMethodSelection',
  );

  // 5-taps with 2 fingers
  const twoFingerTap = Gesture.Tap()
    .minPointers(2)
    .numberOfTaps(5)
    .onStart(() => {
      goToNFCMethodSelection();
    });

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
      // Add timestamp when scan starts
      const scanStartTime = Date.now();

      try {
        const { canNumber, useCan, skipPACE, skipCA, extendedMode } =
          (route.params || {}) as any;

        const scanResponse = await scan({
          passportNumber,
          dateOfBirth,
          dateOfExpiry,
          canNumber,
          useCan,
          skipPACE,
          skipCA,
          extendedMode,
        });

        const scanDurationSeconds = (
          (Date.now() - scanStartTime) /
          1000
        ).toFixed(2);
        console.log(
          'NFC Scan Successful - Duration:',
          scanDurationSeconds,
          'seconds',
        );
        trackEvent(PassportEvents.NFC_SCAN_SUCCESS, {
          duration_seconds: parseFloat(scanDurationSeconds),
        });
        let passportData: PassportData | null = null;
        try {
          passportData = parseScanResponse(scanResponse);
        } catch (e: any) {
          console.error('Parsing NFC Response Unsuccessful');
          trackEvent(PassportEvents.NFC_RESPONSE_PARSE_FAILED, {
            error: e.message,
          });
          return;
        }

        // Navigate to passport data initialization screen
        (navigation as any).navigate('PassportDataInitScreen', {
          passportData,
        });
      } catch (e: any) {
        const scanDurationSeconds = (
          (Date.now() - scanStartTime) /
          1000
        ).toFixed(2);
        console.error('NFC Scan Unsuccessful:', e);
        trackEvent(PassportEvents.NFC_SCAN_FAILED, {
          error: e.message,
          duration_seconds: parseFloat(scanDurationSeconds),
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
        } else if (
          e.message.includes('Error: Lost connection to chip on card')
        ) {
          // android
          navigation.navigate('PassportNFCTrouble');
        } else if (e.message.includes('Could not tranceive APDU')) {
          // android
          navigation.navigate('PassportNFCTrouble');
        } else if (e.message.includes('SODNotFound')) {
          // developer defined error - not part of the library
          navigation.navigate('PassportNFCTrouble');
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
  }, [
    isNfcSupported,
    isNfcEnabled,
    passportNumber,
    dateOfBirth,
    dateOfExpiry,
    route.params,
  ]);

  const onCancelPress = useHapticNavigation('Launch', {
    action: 'cancel',
  });

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
              <GestureDetector gesture={twoFingerTap}>
                <Title>Verify your passport</Title>
              </GestureDetector>
              <Description
                children={
                  isNfcEnabled
                    ? 'Open your passport to the last page to access the NFC chip. Place your phone against the page'
                    : dialogMessage
                }
              />
            </TextsContainer>
            <ButtonsContainer>
              <PrimaryButton
                trackEvent={
                  isNfcEnabled || !isNfcSupported
                    ? PassportEvents.START_PASSPORT_NFC
                    : PassportEvents.OPEN_NFC_SETTINGS
                }
                onPress={onVerifyPress}
                disabled={!isNfcSupported}
              >
                {isNfcEnabled || !isNfcSupported
                  ? 'Start Scan'
                  : 'Open settings'}
              </PrimaryButton>
              <SecondaryButton
                trackEvent={PassportEvents.CANCEL_PASSPORT_NFC}
                onPress={onCancelPress}
              >
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

const styles = StyleSheet.create({
  animation: {
    color: slate100,
    width: '115%',
    height: '115%',
  },
});
