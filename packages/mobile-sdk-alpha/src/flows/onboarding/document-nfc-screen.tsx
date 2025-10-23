// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type LottieView from 'lottie-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, NativeEventEmitter, NativeModules, Platform, StyleSheet } from 'react-native';
import NfcManager from 'react-native-nfc-manager';
import passportVerifyAnimation from 'src/animations/passport_verify.json';
import { BodyText, PrimaryButton, SecondaryButton, Title, View, XStack } from 'src/components';
import ButtonsContainer from 'src/components/ButtonsContainer';
import { DelayedLottieView } from 'src/components/DelayedLottieView';
import TextsContainer from 'src/components/TextsContainer';
import { PassportEvents } from 'src/constants/analytics';
import { black, slate100, slate400, slate500, white } from 'src/constants/colors';
import { dinot } from 'src/constants/fonts';
import { NFC_IMAGE } from 'src/constants/images';
import { useSelfClient } from 'src/context';
import { storePassportData } from 'src/documents/utils';
import { buttonTap, feedbackSuccess, feedbackUnsuccessful, impactLight } from 'src/haptic/index';
import type { SafeAreaInsets } from 'src/layouts/ExpandableBottomLayout';
import { ExpandableBottomLayout } from 'src/layouts/ExpandableBottomLayout';
import { scanNFC } from 'src/nfc';
import { SdkEvents } from 'src/types/events';
import { sanitizeErrorMessage } from 'src/utils/utils';
import { v4 as uuidv4 } from 'uuid';

import type { PassportData } from '@selfxyz/common';

const emitter = Platform.OS === 'android' ? new NativeEventEmitter(NativeModules.nativeModule) : null;

type DocumentNFCScreenProps = {
  usePacePolling?: boolean;
  canNumber?: string;
  useCan?: boolean;
  skipPACE?: boolean;
  skipCA?: boolean;
  extendedMode?: boolean;
  safeAreaInsets?: SafeAreaInsets;
  onBack?: () => void;
  onError?: (message: string) => void;
};

export const DocumentNFCScreen: React.FC<DocumentNFCScreenProps> = (props: DocumentNFCScreenProps) => {
  const selfClient = useSelfClient();
  const { trackEvent, logNFCEvent, trackNfcEvent, useMRZStore } = selfClient;

  const { passportNumber, dateOfBirth, dateOfExpiry, documentType, countryCode } = useMRZStore();

  const [isNfcSupported, setIsNfcSupported] = useState(true);
  const [isNfcEnabled, setIsNfcEnabled] = useState(true);
  const [isNfcSheetOpen, setIsNfcSheetOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [nfcMessage, setNfcMessage] = useState<string | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanCancelledRef = useRef(false);
  const sessionIdRef = useRef(uuidv4());

  const baseContext = useMemo(
    () => ({
      sessionId: sessionIdRef.current,
      platform: Platform.OS as 'ios' | 'android',
      scanType: (props.useCan ? 'can' : 'mrz') as 'mrz' | 'can',
    }),
    [props.useCan],
  );

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
  }, [baseContext]);

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

  const handleNFCError = useCallback(
    (message: string) => {
      const sanitizedErrorMessage = sanitizeErrorMessage(message);

      logNFCEvent(
        'error',
        'nfc_error_modal',
        {
          ...baseContext,
          stage: 'error',
        },
        { message: sanitizedErrorMessage },
      );

      props.onError?.(sanitizedErrorMessage);
    },
    [baseContext, props.onError],
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
      setDialogMessage("Sorry, your device doesn't seem to have an NFC reader.");
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
  }, [baseContext]);

  const usePacePolling = (): boolean => {
    const { usePacePolling: usePacePollingParam } = props ?? {};
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
        trackNfcEvent(PassportEvents.NFC_SCAN_FAILED, {
          error: 'timeout',
        });
        handleNFCError('Scan timed out. Please try again.');
        setIsNfcSheetOpen(false);
        logNFCEvent('info', 'sheet_close', {
          ...baseContext,
          stage: 'ui',
        });
      }, 30000);

      try {
        const { canNumber, useCan, skipPACE, skipCA, extendedMode } = props ?? {};

        const scanResponse = await scanNFC(selfClient, {
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

        const scanDurationSeconds = ((Date.now() - scanStartTime) / 1000).toFixed(2);
        console.log('NFC Scan Successful - Duration:', scanDurationSeconds, 'seconds');
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
        try {
          passportData = scanResponse.passportData;
        } catch (e: unknown) {
          console.error('Parsing NFC Response Unsuccessful');
          const errMsg = sanitizeErrorMessage(e instanceof Error ? e.message : String(e));
          trackEvent(PassportEvents.NFC_RESPONSE_PARSE_FAILED, {
            error: errMsg,
          });
          trackNfcEvent(PassportEvents.NFC_RESPONSE_PARSE_FAILED, {
            error: errMsg,
          });
          return;
        }
        if (passportData) {
          console.log('Storing passport data from NFC scan...');
          await storePassportData(selfClient, passportData);
          console.log('Passport data stored successfully');
        }
        await new Promise(resolve => setTimeout(resolve, 700)); // small delay to let the native NFC sheet close
        // Check if scan was cancelled by timeout before navigating
        if (scanCancelledRef.current) {
          return;
        }

        selfClient.emit(SdkEvents.DOCUMENT_NFC_SCAN_SUCCESS);
      } catch (e: unknown) {
        // Check if scan was cancelled by timeout
        if (scanCancelledRef.current) {
          return;
        }

        const scanDurationSeconds = ((Date.now() - scanStartTime) / 1000).toFixed(2);
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
        handleNFCError(message);
        // We deliberately avoid opening any external feedback widgets here;
        // users can send feedback via the email action in the modal.
      } finally {
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
          scanTimeoutRef.current = null;
        }
        setIsNfcSheetOpen(false);
        logNFCEvent('info', 'sheet_close', { ...baseContext, stage: 'ui' });
      }
    } else if (isNfcSupported) {
      if (Platform.OS === 'ios') {
        Linking.openURL('App-Prefs:root=General&path=About');
      } else {
        Linking.sendIntent('android.settings.NFC_SETTINGS');
      }
    }
  }, [
    baseContext,
    isNfcEnabled,
    isNfcSupported,
    {
      canNumber: props.canNumber,
      useCan: props.useCan,
      skipPACE: props.skipPACE,
      skipCA: props.skipCA,
      extendedMode: props.extendedMode,
    },
    passportNumber,
    dateOfBirth,
    dateOfExpiry,
    isPacePolling,
    trackEvent,
  ]);

  const onCancelPress = useCallback(() => {
    logNFCEvent('info', 'scan_cancelled', { ...baseContext, stage: 'cancel' });

    props.onBack?.();
  }, [props.onBack]);

  useEffect(
    useCallback(() => {
      logNFCEvent('info', 'screen_focus', { ...baseContext, stage: 'focus' });
      checkNfcSupport();

      if (Platform.OS === 'android' && emitter) {
        const subscription = emitter.addListener('NativeEvent', (event: string) => {
          console.info(event);
          setNfcMessage(event);
          // Haptic feedback mapping for completion/error only
          if (event === 'PACE succeeded' || event === 'BAC succeeded' || event === 'Chip authentication succeeded') {
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
        });

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
    }, [baseContext, checkNfcSupport]),
    [],
  );

  return (
    <ExpandableBottomLayout.Layout
      backgroundColor={black}
      safeAreaTop={props.safeAreaInsets?.top}
      safeAreaBottom={props.safeAreaInsets?.bottom}
    >
      <ExpandableBottomLayout.TopSection backgroundColor={slate100} safeAreaTop={props.safeAreaInsets?.top}>
        <DelayedLottieView
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
      <ExpandableBottomLayout.BottomSection backgroundColor={white} safeAreaBottom={props.safeAreaInsets?.bottom}>
        {isNfcSheetOpen ? (
          <>
            <TextsContainer>
              <Title>Ready to scan</Title>
              <BodyText style={{ textAlign: 'center' }}>
                {nfcMessage && nfcMessage.trim().length > 0 ? (
                  nfcMessage
                ) : (
                  <>Hold your device near the NFC tag and stop moving when it vibrates.</>
                )}
              </BodyText>
            </TextsContainer>
            {/* TODO: fix image to use src/images/nfc.png instead of inline data url */}
            <Image
              height={128}
              width={128}
              borderRadius={1000}
              source={NFC_IMAGE}
              style={{ margin: 20, alignSelf: 'center' }}
            />
          </>
        ) : (
          <>
            <TextsContainer>
              <View collapsable={false}>
                <XStack justifyContent="space-between" alignItems="center" gap={6}>
                  <Title>Verify your ID</Title>
                </XStack>
              </View>
              {isNfcEnabled ? (
                <>
                  <Title style={[styles.title, { marginTop: 8 }]}>Find the RFID chip in your ID</Title>
                  <BodyText style={[styles.bodyText, { marginTop: 8, marginBottom: 8 }]}>
                    Place your phone against the chip and keep it still until the sensor reads it.
                  </BodyText>
                  <BodyText style={[styles.disclaimer, { marginTop: 16 }]}>
                    SELF DOES NOT STORE THIS INFORMATION.
                  </BodyText>
                </>
              ) : (
                <>
                  <BodyText style={[styles.disclaimer, { marginTop: 16 }]}>{dialogMessage}</BodyText>
                </>
              )}
            </TextsContainer>
            <ButtonsContainer>
              <PrimaryButton
                trackEvent={
                  isNfcEnabled || !isNfcSupported ? PassportEvents.START_PASSPORT_NFC : PassportEvents.OPEN_NFC_SETTINGS
                }
                onPress={onVerifyPress}
                disabled={!isNfcSupported}
              >
                {isNfcEnabled || !isNfcSupported ? 'Start Scan' : 'Open settings'}
              </PrimaryButton>
              <SecondaryButton trackEvent={PassportEvents.CANCEL_PASSPORT_NFC} onPress={onCancelPress}>
                Cancel
              </SecondaryButton>
            </ButtonsContainer>
          </>
        )}
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

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
