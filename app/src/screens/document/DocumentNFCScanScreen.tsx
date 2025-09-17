// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  NativeEventEmitter,
  NativeModules,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import NfcManager from 'react-native-nfc-manager';
import { Button, Image, XStack } from 'tamagui';
import { v4 as uuidv4 } from 'uuid';
import type { RouteProp } from '@react-navigation/native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { CircleHelp } from '@tamagui/lucide-icons';

import type { PassportData } from '@selfxyz/common/types';
import { getSKIPEM } from '@selfxyz/common/utils/csca';
import { initPassportDataParsing } from '@selfxyz/common/utils/passports';
import {
  hasAnyValidRegisteredDocument,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import { PassportEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import passportVerifyAnimation from '@/assets/animations/passport_verify.json';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { SecondaryButton } from '@/components/buttons/SecondaryButton';
import ButtonsContainer from '@/components/ButtonsContainer';
import TextsContainer from '@/components/TextsContainer';
import { BodyText } from '@/components/typography/BodyText';
import { Title } from '@/components/typography/Title';
import { useFeedbackAutoHide } from '@/hooks/useFeedbackAutoHide';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import NFC_IMAGE from '@/images/nfc.png';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { useFeedback } from '@/providers/feedbackProvider';
import { storePassportData } from '@/providers/passportDataProvider';
import { logNFCEvent } from '@/Sentry';
import useUserStore from '@/stores/userStore';
import {
  flushAllAnalytics,
  setNfcScanningActive,
  trackNfcEvent,
} from '@/utils/analytics';
import { black, slate100, slate400, slate500, white } from '@/utils/colors';
import { sendFeedbackEmail } from '@/utils/email';
import { dinot } from '@/utils/fonts';
import {
  buttonTap,
  feedbackSuccess,
  feedbackUnsuccessful,
  impactLight,
} from '@/utils/haptic';
import { parseScanResponse, scan } from '@/utils/nfcScanner';
import { sanitizeErrorMessage } from '@/utils/utils';

const emitter =
  Platform.OS === 'android'
    ? new NativeEventEmitter(NativeModules.nativeModule)
    : null;

type DocumentNFCScanRouteParams = {
  usePacePolling?: boolean;
  canNumber?: string;
  useCan?: boolean;
  skipPACE?: boolean;
  skipCA?: boolean;
  extendedMode?: boolean;
};

type DocumentNFCScanRoute = RouteProp<
  Record<string, DocumentNFCScanRouteParams>,
  string
>;

const DocumentNFCScanScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const { trackEvent } = selfClient;

  const navigation = useNavigation();
  const route = useRoute<DocumentNFCScanRoute>();
  const { showModal } = useFeedback();
  useFeedbackAutoHide();
  const {
    passportNumber,
    dateOfBirth,
    dateOfExpiry,
    documentType,
    countryCode,
  } = useUserStore();

  const [isNfcSupported, setIsNfcSupported] = useState(true);
  const [isNfcEnabled, setIsNfcEnabled] = useState(true);
  const [isNfcSheetOpen, setIsNfcSheetOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [nfcMessage, setNfcMessage] = useState<string | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanCancelledRef = useRef(false);
  const sessionIdRef = useRef(uuidv4());

  const baseContext = {
    sessionId: sessionIdRef.current,
    platform: Platform.OS as 'ios' | 'android',
    scanType: route.params?.useCan ? 'can' : 'mrz',
  } as const;

  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    animationRef.current?.play();
  }, []);

  useEffect(() => {
    logNFCEvent('info', 'screen_mount', { ...baseContext, stage: 'mount' });
    return () => {
      logNFCEvent('info', 'screen_unmount', {
        ...baseContext,
        stage: 'unmount',
      });
    };
  }, []);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      scanCancelledRef.current = true;
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    };
  }, []);

  const goToNFCMethodSelection = useHapticNavigation(
    'DocumentNFCMethodSelection',
  );
  const goToNFCTrouble = useHapticNavigation('DocumentNFCTrouble');

  // 5-taps with a single finger
  const devModeTap = Gesture.Tap()
    .numberOfTaps(5)
    .onStart(() => {
      goToNFCMethodSelection();
    });

  const onReportIssue = useCallback(() => {
    sendFeedbackEmail({
      message: 'User reported an issue from NFC scan screen',
      origin: 'passport/nfc',
    });
  }, []);

  const openErrorModal = useCallback(
    (message: string) => {
      flushAllAnalytics();
      logNFCEvent(
        'error',
        'nfc_error_modal',
        {
          ...baseContext,
          stage: 'error',
        },
        { message: sanitizeErrorMessage(message) },
      );
      showModal({
        titleText: 'NFC Scan Error',
        bodyText: message,
        buttonText: 'Report Issue',
        secondaryButtonText: 'Help',
        preventDismiss: false,
        onButtonPress: () =>
          sendFeedbackEmail({
            message: sanitizeErrorMessage(message),
            origin: 'passport/nfc',
          }),
        onSecondaryButtonPress: goToNFCTrouble,
        onModalDismiss: () => {},
      });
    },
    [showModal, goToNFCTrouble],
  );

  const checkNfcSupport = useCallback(async () => {
    const isSupported = await NfcManager.isSupported();
    if (isSupported) {
      const isEnabled = await NfcManager.isEnabled();
      if (!isEnabled) {
        setIsNfcEnabled(false);
        setDialogMessage('NFC is not enabled. Please enable it in settings.');
      }
      setIsNfcSupported(true);
      logNFCEvent(
        'info',
        'nfc_capability',
        {
          ...baseContext,
          stage: 'check',
        },
        {
          supported: true,
          enabled: isEnabled,
        },
      );
    } else {
      setDialogMessage(
        "Sorry, your device doesn't seem to have an NFC reader.",
      );
      // Set isNfcEnabled to false so the message is shown on the screen
      // near the disabled button when NFC isn't supported
      setIsNfcEnabled(false);
      setIsNfcSupported(false);
      logNFCEvent(
        'warn',
        'nfc_capability',
        {
          ...baseContext,
          stage: 'check',
        },
        {
          supported: false,
          enabled: false,
        },
      );
    }
  }, []);

  const usePacePolling = (): boolean => {
    const { usePacePolling: usePacePollingParam } = route.params ?? {};
    const shouldUsePacePolling = documentType + countryCode === 'IDFRA';

    if (usePacePollingParam !== undefined) {
      return usePacePollingParam;
    } else if (shouldUsePacePolling) {
      return true;
    } else {
      return false;
    }
  };

  const isPacePolling = usePacePolling();

  const onVerifyPress = useCallback(async () => {
    buttonTap();
    if (isNfcEnabled) {
      logNFCEvent('info', 'verify_pressed', {
        ...baseContext,
        stage: 'ui',
      });
      setIsNfcSheetOpen(true);
      logNFCEvent('info', 'sheet_open', { ...baseContext, stage: 'ui' });
      // Add timestamp when scan starts
      scanCancelledRef.current = false;
      const scanStartTime = Date.now();
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      scanTimeoutRef.current = setTimeout(() => {
        scanCancelledRef.current = true;
        trackEvent(PassportEvents.NFC_SCAN_FAILED, {
          error: 'timeout',
        });
        logNFCEvent('warn', 'scan_timeout', {
          ...baseContext,
          stage: 'timeout',
        });
        openErrorModal('Scan timed out. Please try again.');
        setIsNfcSheetOpen(false);
        logNFCEvent('info', 'sheet_close', {
          ...baseContext,
          stage: 'ui',
        });
      }, 30000);

      // Mark NFC scanning as active to prevent analytics flush interference
      setNfcScanningActive(true);

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      scanTimeoutRef.current = setTimeout(() => {
        scanCancelledRef.current = true;
        setNfcScanningActive(false); // Clear scanning state on timeout
        trackEvent(PassportEvents.NFC_SCAN_FAILED, {
          error: 'timeout',
        });
        trackNfcEvent(PassportEvents.NFC_SCAN_FAILED, {
          error: 'timeout',
        });
        logNFCEvent('warn', 'scan_timeout', {
          ...baseContext,
          stage: 'timeout',
        });
        openErrorModal('Scan timed out. Please try again.');
        setIsNfcSheetOpen(false);
        logNFCEvent('info', 'sheet_close', {
          ...baseContext,
          stage: 'ui',
        });
      }, 30000);

      try {
        const { canNumber, useCan, skipPACE, skipCA, extendedMode } =
          route.params ?? {};

        const scanResponse = await scan({
          passportNumber,
          dateOfBirth,
          dateOfExpiry,
          canNumber,
          useCan,
          skipPACE,
          skipCA,
          extendedMode,
          usePacePolling: isPacePolling,
          sessionId: sessionIdRef.current,
        });

        // Check if scan was cancelled by timeout
        if (scanCancelledRef.current) {
          return;
        }

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
        logNFCEvent(
          'info',
          'scan_success',
          {
            ...baseContext,
            stage: 'complete',
          },
          { duration_seconds: parseFloat(scanDurationSeconds) },
        );
        let passportData: PassportData | null = null;
        let parsedPassportData: PassportData | null = null;
        try {
          passportData = parseScanResponse(scanResponse);
        } catch (e: unknown) {
          console.error('Parsing NFC Response Unsuccessful');
          const errMsg = sanitizeErrorMessage(
            e instanceof Error ? e.message : String(e),
          );
          trackEvent(PassportEvents.NFC_RESPONSE_PARSE_FAILED, {
            error: errMsg,
          });
          trackNfcEvent(PassportEvents.NFC_RESPONSE_PARSE_FAILED, {
            error: errMsg,
          });
          return;
        }
        try {
          const skiPem = await getSKIPEM('production');
          parsedPassportData = initPassportDataParsing(passportData, skiPem);
          if (!parsedPassportData) {
            throw new Error('Failed to parse passport data');
          }
          const passportMetadata = parsedPassportData.passportMetadata!;
          let dscObject;
          try {
            dscObject = { dsc: passportMetadata.dsc };
          } catch (error) {
            console.error('Failed to parse dsc:', error);
            dscObject = {};
          }

          trackEvent(PassportEvents.PASSPORT_PARSED, {
            success: true,
            data_groups: passportMetadata.dataGroups,
            dg1_size: passportMetadata.dg1Size,
            dg1_hash_size: passportMetadata.dg1HashSize,
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
            dsc: dscObject,
            dsc_aki: passportData.dsc_parsed?.authorityKeyIdentifier,
            dsc_ski: passportData.dsc_parsed?.subjectKeyIdentifier,
          });
          if (parsedPassportData) {
            await storePassportData(parsedPassportData);
          }
          // Feels better somehow
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Check if scan was cancelled by timeout before navigating
          if (scanCancelledRef.current) {
            return;
          }
          navigation.navigate('ConfirmBelonging', {});
        } catch (e: unknown) {
          // Check if scan was cancelled by timeout
          if (scanCancelledRef.current) {
            return;
          }
          console.error('Passport Parsed Failed:', e);
          const errMsg = sanitizeErrorMessage(
            e instanceof Error ? e.message : String(e),
          );
          trackEvent(PassportEvents.PASSPORT_PARSE_FAILED, {
            error: errMsg,
          });
          trackNfcEvent(PassportEvents.PASSPORT_PARSE_FAILED, {
            error: errMsg,
          });
          return;
        }
      } catch (e: unknown) {
        // Check if scan was cancelled by timeout
        if (scanCancelledRef.current) {
          return;
        }
        const scanDurationSeconds = (
          (Date.now() - scanStartTime) /
          1000
        ).toFixed(2);
        console.error('NFC Scan Unsuccessful:', e);
        const message = e instanceof Error ? e.message : String(e);
        const sanitized = sanitizeErrorMessage(message);
        trackEvent(PassportEvents.NFC_SCAN_FAILED, {
          error: sanitized,
          duration_seconds: parseFloat(scanDurationSeconds),
        });
        trackNfcEvent(PassportEvents.NFC_SCAN_FAILED, {
          error: sanitized,
          duration_seconds: parseFloat(scanDurationSeconds),
        });
        openErrorModal(message);
        // We deliberately avoid opening any external feedback widgets here;
        // users can send feedback via the email action in the modal.
      } finally {
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
          scanTimeoutRef.current = null;
        }
        setIsNfcSheetOpen(false);
        logNFCEvent('info', 'sheet_close', { ...baseContext, stage: 'ui' });
        setNfcScanningActive(false);
      }
    } else if (isNfcSupported) {
      if (Platform.OS === 'ios') {
        Linking.openURL('App-Prefs:root=General&path=About');
      } else {
        Linking.sendIntent('android.settings.NFC_SETTINGS');
      }
    }
  }, [
    isNfcEnabled,
    isNfcSupported,
    route.params,
    passportNumber,
    dateOfBirth,
    dateOfExpiry,
    isPacePolling,
    navigation,
    openErrorModal,
    trackEvent,
  ]);

  const navigateToLaunch = useHapticNavigation('Launch', {
    action: 'cancel',
  });
  const navigateToHome = useHapticNavigation('Home', {
    action: 'cancel',
  });

  const onCancelPress = async () => {
    flushAllAnalytics();
    logNFCEvent('info', 'scan_cancelled', { ...baseContext, stage: 'cancel' });
    const hasValidDocument = await hasAnyValidRegisteredDocument(selfClient);
    if (hasValidDocument) {
      navigateToHome();
    } else {
      navigateToLaunch();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _cancelScanIfRunning = useCallback(async () => {
    // // TODO: cancel if scanning
    // setIsNfcSheetOpen(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      logNFCEvent('info', 'screen_focus', { ...baseContext, stage: 'focus' });
      checkNfcSupport();

      if (Platform.OS === 'android' && emitter) {
        const subscription = emitter.addListener(
          'NativeEvent',
          (event: string) => {
            console.info(event);
            setNfcMessage(event);
            // Haptic feedback mapping for completion/error only
            if (
              event === 'PACE succeeded' ||
              event === 'BAC succeeded' ||
              event === 'Chip authentication succeeded'
            ) {
              feedbackSuccess(); // Major success
            } else if (
              event === 'Reading DG1 succeeded' ||
              event === 'Reading DG2 succeeded' ||
              event === 'Reading SOD succeeded' ||
              event === 'Reading COM succeeded'
            ) {
              impactLight(); // Minor DG step
            } else if (
              event === 'BAC failed' ||
              event === 'PACE failed' ||
              event.toLowerCase().includes('failed') ||
              event.toLowerCase().includes('error')
            ) {
              feedbackUnsuccessful(); // Error
            }
          },
        );

        return () => {
          logNFCEvent('info', 'screen_blur', { ...baseContext, stage: 'blur' });
          subscription.remove();
          // Clear scan timeout when component loses focus
          scanCancelledRef.current = true;
          if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
            scanTimeoutRef.current = null;
          }
        };
      }

      // For iOS or when no emitter, still handle timeout cleanup on blur
      return () => {
        logNFCEvent('info', 'screen_blur', { ...baseContext, stage: 'blur' });
        scanCancelledRef.current = true;
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
          scanTimeoutRef.current = null;
        }
      };
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
                {nfcMessage && nfcMessage.trim().length > 0 ? (
                  nfcMessage
                ) : (
                  <>
                    Hold your device near the NFC tag and stop moving when it
                    vibrates.
                  </>
                )}
              </BodyText>
            </TextsContainer>
            <Image
              height="$8"
              width="$8"
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
              <GestureDetector gesture={devModeTap}>
                <View collapsable={false}>
                  <XStack
                    justifyContent="space-between"
                    alignItems="center"
                    gap="$1.5"
                  >
                    <Title>Verify your ID</Title>
                    <Button
                      unstyled
                      onPress={goToNFCTrouble}
                      icon={<CircleHelp size={28} color={slate500} />}
                      aria-label="Help"
                    />
                  </XStack>
                </View>
              </GestureDetector>
              {isNfcEnabled ? (
                <>
                  <Title style={styles.title} marginTop="$2">
                    Find the RFID chip in your ID
                  </Title>
                  <BodyText
                    style={styles.bodyText}
                    marginTop="$2"
                    marginBottom="$2"
                  >
                    Place your phone against the chip and keep it still until
                    the sensor reads it.
                  </BodyText>
                  <BodyText style={styles.disclaimer} marginTop="$2">
                    SELF DOES NOT STORE THIS INFORMATION.
                  </BodyText>
                </>
              ) : (
                <>
                  <BodyText style={styles.disclaimer} marginTop="$2">
                    {dialogMessage}
                  </BodyText>
                </>
              )}
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
              <SecondaryButton onPress={onReportIssue}>
                Report Issue
              </SecondaryButton>
            </ButtonsContainer>
          </>
        )}
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default DocumentNFCScanScreen;

const styles = StyleSheet.create({
  title: {
    fontFamily: dinot,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  bodyText: {
    fontFamily: dinot,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    color: slate500,
  },
  disclaimer: {
    fontFamily: dinot,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    color: slate400,
    letterSpacing: 0.44,
  },
  animation: {
    color: slate100,
    width: '115%',
    height: '115%',
  },
});
