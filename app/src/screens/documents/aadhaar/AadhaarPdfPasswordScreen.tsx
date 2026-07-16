// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { File } from 'expo-file-system';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  trackBranchEvent,
  trackOnboardingStep,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  BodyText,
  PrimaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import {
  AadhaarEvents,
  OnboardingEvents,
} from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  red500,
  slate100,
  slate200,
  slate400,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useAadhaar } from '@selfxyz/mobile-sdk-alpha/onboarding/import-aadhaar';

import {
  AADHAAR_PDF_PASSWORD_HINT_FLAG,
  DEFAULT_AADHAAR_PDF_PASSWORD_HINT,
  getFeatureFlag,
} from '@/config';
import { scanQRCodeFromPDF } from '@/integrations/qrScanner';
import type { RootStackParamList } from '@/navigation';
import type { AadhaarRoutesParamList } from '@/navigation/types';
import { PrivacyMask } from '@/observability/PrivacyMask';
import { extraYPadding } from '@/utils/styleUtils';

const AadhaarPdfPasswordScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const paddingBottom = insets.bottom + extraYPadding;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<AadhaarRoutesParamList, 'AadhaarPdfPassword'>>();
  const { fileUri } = route.params;
  const selfClient = useSelfClient();
  const { processAadhaarQRCode } = useAadhaar();

  // Password is uncontrolled (ref) so typing does not re-render the screen;
  // only the empty<->non-empty transition flips `hasText` to toggle the button.
  const passwordRef = useRef('');
  const [hasText, setHasText] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [hint, setHint] = useState(DEFAULT_AADHAAR_PDF_PASSWORD_HINT);

  useEffect(() => {
    let cancelled = false;
    getFeatureFlag(
      AADHAAR_PDF_PASSWORD_HINT_FLAG,
      DEFAULT_AADHAAR_PDF_PASSWORD_HINT,
    )
      .then(value => {
        if (!cancelled) {
          setHint(value);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // The cached PDF copy holds decrypted-source bytes; remove it when leaving.
  useEffect(() => {
    return () => {
      try {
        new File(fileUri).delete();
      } catch {
        // best-effort cleanup
      }
    };
  }, [fileUri]);

  const onChangeText = useCallback((text: string) => {
    passwordRef.current = text;
    // Both setters bail out (no render) when the value is unchanged, so typing
    // within a non-empty password does not trigger a re-render.
    setHasText(text.trim().length > 0);
    setErrorText(prev => (prev ? null : prev));
  }, []);

  const onSubmit = useCallback(async () => {
    const password = passwordRef.current.trim();
    if (isProcessing || password.length === 0) {
      return;
    }

    try {
      setIsProcessing(true);
      setErrorText(null);

      const qrCodeData = await scanQRCodeFromPDF(fileUri, password);
      trackBranchEvent(selfClient, AadhaarEvents.QR_SELECTED);
      await processAadhaarQRCode(qrCodeData);
      trackOnboardingStep(selfClient, OnboardingEvents.SCAN_SUCCEEDED, {
        branch: 'aadhaar',
      });
      // Navigation to success/error is driven by the events emitted from
      // processAadhaarQRCode (see selfClientProvider).
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code =
        error instanceof Error && 'code' in error
          ? String((error as { code?: unknown }).code ?? '')
          : '';

      if (code === 'INVALID_PASSWORD' || message.includes('INVALID_PASSWORD')) {
        setErrorText('Incorrect password. Please check and try again.');
        return;
      }

      navigation.navigate('AadhaarUploadError', {
        errorType: 'general',
      } as never);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, fileUri, selfClient, processAadhaarQRCode, navigation]);

  const borderColor = errorText ? red500 : isFocused ? black : slate200;

  return (
    <PrivacyMask>
      <YStack flex={1} backgroundColor={slate100} paddingBottom={paddingBottom}>
        <YStack flex={1} paddingHorizontal={20} paddingTop={30} gap="$5">
          <Title>Enter your e-Aadhaar PDF password</Title>

          <YStack gap="$2">
            <TextInput
              style={[styles.textInput, { borderColor }]}
              onChangeText={onChangeText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="PDF password"
              placeholderTextColor={slate400}
              secureTextEntry
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isProcessing}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />

            {errorText ? (
              <BodyText style={styles.errorText}>{errorText}</BodyText>
            ) : hint ? (
              <BodyText style={styles.hintText}>{hint}</BodyText>
            ) : null}
          </YStack>
        </YStack>

        <YStack paddingHorizontal={25} backgroundColor={white} paddingTop={25}>
          <PrimaryButton disabled={isProcessing || !hasText} onPress={onSubmit}>
            {isProcessing ? 'Processing...' : 'Decrypt & Continue'}
          </PrimaryButton>
        </YStack>
      </YStack>
    </PrivacyMask>
  );
};

const styles = StyleSheet.create({
  textInput: {
    backgroundColor: white,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    fontFamily: dinot,
    color: black,
  },
  hintText: {
    fontSize: 14,
    color: slate500,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: red500,
    paddingHorizontal: 4,
  },
});

export default AadhaarPdfPasswordScreen;
