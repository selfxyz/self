// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet } from 'react-native';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { View, XStack, YStack } from 'tamagui';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  DelayedLottieView,
  dinot,
  resolveOnboardingBranch,
  trackOnboardingStep,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  Additional,
  Description,
  SecondaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import {
  OnboardingEvents,
  PassportEvents,
} from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  slate400,
  slate800,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import {
  mrzReadInstructions,
  useReadMRZ,
} from '@selfxyz/mobile-sdk-alpha/onboarding/read-mrz';

import passportScanAnimation from '@/assets/animations/passport_scan.json';
import Scan from '@/assets/icons/passport_camera_scan.svg';
import { PassportCamera } from '@/components/native/PassportCamera';
import { useErrorInjection } from '@/hooks/useErrorInjection';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { RootStackParamList } from '@/navigation';
import { getDocumentScanPrompt } from '@/utils/documentAttributes';

const DocumentCameraScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selfClient = useSelfClient();
  const selectedDocumentType = selfClient.useMRZStore(
    state => state.documentType,
  );
  const countryCode = selfClient.useMRZStore(state => state.countryCode);
  const { shouldInjectError } = useErrorInjection();

  // Add a ref to track when the camera screen is mounted
  const scanStartTimeRef = useRef(Date.now());
  const { onPassportRead } = useReadMRZ(scanStartTimeRef);

  useEffect(() => {
    const branch = resolveOnboardingBranch(selectedDocumentType ?? 'p');
    trackOnboardingStep(selfClient, OnboardingEvents.SCAN_STARTED, { branch });
    // Fire once on mount for this attempt. `trackOnboardingStep` dedupes,
    // so re-mounts from back-nav are no-ops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gate `<PassportCamera>` on an explicit permission check so iOS never shows
  // the black scanner view and Android never triggers its re-prompt loop.
  // `null` while the initial check is in flight; `true`/`false` once resolved.
  const [cameraReady, setCameraReady] = useState<boolean | null>(null);
  useEffect(() => {
    const cameraPerm =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.CAMERA
        : PERMISSIONS.ANDROID.CAMERA;
    let active = true;
    const verify = async () => {
      try {
        const status = await check(cameraPerm);
        const ok = status === RESULTS.GRANTED || status === RESULTS.LIMITED;
        if (!active) return;
        setCameraReady(ok);
        if (!ok) {
          navigation.goBack();
        }
      } catch {
        if (active) {
          setCameraReady(false);
        }
      }
    };
    verify();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        verify();
      }
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [navigation]);

  // Dev-only: Auto-trigger MRZ error after short delay if error injection is enabled
  useEffect(() => {
    if (
      shouldInjectError('mrz_invalid_format') ||
      shouldInjectError('mrz_unknown_error')
    ) {
      const timer = setTimeout(() => {
        console.log(
          '[DEV] Injecting MRZ error - navigating to fallback screen',
        );
        navigation.navigate('RegistrationFallbackMRZ', {
          countryCode: countryCode || '',
        });
      }, 1500); // 1.5 second delay to show camera briefly
      return () => clearTimeout(timer);
    }
  }, [shouldInjectError, navigation, countryCode]);

  const scanPrompt = getDocumentScanPrompt(selectedDocumentType);

  const navigateToHome = useHapticNavigation('Home', {
    action: 'cancel',
  });

  const onCancelPress = async () => {
    navigateToHome();
  };

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.TopSection roundTop backgroundColor={black}>
        {cameraReady === true && (
          <PassportCamera
            onPassportRead={onPassportRead}
            isMounted={isFocused}
          />
        )}
        <DelayedLottieView
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
          <YStack alignItems="center" gap="$6" paddingBottom="$2.5">
            <Title>{scanPrompt}</Title>
            <XStack gap="$6" alignSelf="flex-start" alignItems="flex-start">
              <View paddingTop="$2">
                <Scan height={40} width={40} color={slate800} />
              </View>
              <View maxWidth="75%">
                <Description style={styles.subheader}>
                  Open to the photograph page
                </Description>
                <Additional style={styles.description}>
                  {mrzReadInstructions()}
                </Additional>
              </View>
            </XStack>
          </YStack>

          <Additional style={styles.disclaimer}>
            Self will not capture an image of your ID.
          </Additional>

          <SecondaryButton
            trackEvent={PassportEvents.CAMERA_SCREEN_CLOSED}
            onPress={onCancelPress}
          >
            Cancel
          </SecondaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default DocumentCameraScreen;

const styles = StyleSheet.create({
  animation: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  subheader: {
    color: slate800,
    textAlign: 'left',
    textAlignVertical: 'top',
  },
  description: {
    textAlign: 'left',
  },
  disclaimer: {
    fontFamily: dinot,
    textAlign: 'center',
    fontSize: 11,
    color: slate400,
    textTransform: 'uppercase',
    width: '100%',
    alignSelf: 'center',
    letterSpacing: 0.44,
    marginTop: 0,
    marginBottom: 10,
  },
});
