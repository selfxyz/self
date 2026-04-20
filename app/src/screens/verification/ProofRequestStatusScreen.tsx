// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { LottieViewProps } from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { ScrollView, Spinner } from 'tamagui';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DelayedLottieView, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import loadingAnimation from '@selfxyz/mobile-sdk-alpha/animations/loading/misc.json';
import {
  BodyText,
  Description,
  PrimaryButton,
  Title,
  typography,
} from '@selfxyz/mobile-sdk-alpha/components';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import failAnimation from '@/assets/animations/proof_failed.json';
import succesAnimation from '@/assets/animations/proof_success.json';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import {
  buttonTap,
  notificationError,
  notificationSuccess,
} from '@/integrations/haptics';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { RootStackParamList } from '@/navigation';
import {
  hasUserAnIdentityDocumentRegistered,
  hasUserDoneThePointsDisclosure,
} from '@/services/points';
import { getWhiteListedDisclosureAddresses } from '@/services/points/utils';
import { useProofHistoryStore } from '@/stores/proofHistoryStore';
import { ProofStatus } from '@/stores/proofTypes';

const PREREQ_CHECK_TIMEOUT_MS = 3000;

const SuccessScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const { trackEvent } = selfClient;
  const { useProvingStore, useSelfAppStore } = selfClient;
  const selfApp = useSelfAppStore(state => state.selfApp);
  const appName = selfApp?.appName;
  const goHome = useHapticNavigation('Home');
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { updateProofStatus } = useProofHistoryStore();

  const currentState = useProvingStore(state => state.currentState) ?? '';
  const reason = useProvingStore(state => state.reason);
  const sessionId = useProvingStore(state => state.uuid);
  const errorCode = useProvingStore(state => state.error_code);

  const isFocused = useIsFocused();

  const [animationSource, setAnimationSource] =
    useState<LottieViewProps['source']>(loadingAnimation);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownStarted, setCountdownStarted] = useState(false);
  const [whitelistedPoints, setWhitelistedPoints] = useState<
    number | null | undefined
  >(undefined);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const onOkPress = useCallback(async () => {
    if (whitelistedPoints === undefined) return;
    buttonTap();
    const completedSessionId = sessionId;

    const cleanupLater = () => {
      setTimeout(() => {
        if (useProvingStore.getState().uuid === completedSessionId) {
          selfClient.getSelfAppState().cleanSelfApp();
        }
      }, 2000);
    };

    if (whitelistedPoints !== null) {
      // Bound the prereq checks so a stalled network call can't trap the user
      // on this screen. On timeout we fall through to goHome() — the safe
      // default, since Gratification would just bounce them via the guardrail.
      const timeout = new Promise<false>(resolve =>
        setTimeout(() => resolve(false), PREREQ_CHECK_TIMEOUT_MS),
      );
      const [hasDocument, hasDisclosed] = await Promise.all([
        Promise.race([hasUserAnIdentityDocumentRegistered(), timeout]),
        Promise.race([hasUserDoneThePointsDisclosure(), timeout]),
      ]);

      if (hasDocument && hasDisclosed) {
        navigation.navigate('Gratification', {
          points: whitelistedPoints,
        });
        cleanupLater();
        return;
      }
    }

    goHome();
    cleanupLater();
  }, [
    whitelistedPoints,
    navigation,
    goHome,
    selfClient,
    sessionId,
    useProvingStore,
  ]);

  function cancelDeeplinkCallbackRedirect() {
    setCountdown(null);
  }

  function cancelCountdown() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(null);
  }

  useEffect(() => {
    if (currentState !== 'completed') return;

    if (!selfApp?.endpoint) {
      setWhitelistedPoints(null);
      return;
    }

    const checkWhitelist = async () => {
      try {
        const whitelistedContracts = await getWhiteListedDisclosureAddresses();
        const endpoint = selfApp.endpoint.toLowerCase();
        const whitelistedContract = whitelistedContracts.find(
          c => c.contract_address.toLowerCase() === endpoint,
        );
        setWhitelistedPoints(
          whitelistedContract?.points_per_disclosure ?? null,
        );
      } catch (error) {
        console.error('Error checking whitelist:', error);
        setWhitelistedPoints(null);
      }
    };

    checkWhitelist();
  }, [currentState, selfApp?.endpoint]);

  useEffect(() => {
    if (currentState === 'completed') {
      notificationSuccess();
      setAnimationSource(succesAnimation);
      updateProofStatus(sessionId!, ProofStatus.SUCCESS);
      trackEvent(ProofEvents.PROOF_COMPLETED, {
        sessionId,
        appName,
      });

      if (isFocused && !countdownStarted && selfApp?.deeplinkCallback) {
        try {
          const url = new URL(selfApp.deeplinkCallback);
          if (url) {
            setCountdown(5);
            setCountdownStarted(true);
          }
        } catch {
          console.warn(
            'Invalid deep link URL provided (URL sanitized for security)',
          );
        }
      }
    } else if (currentState === 'failure' || currentState === 'error') {
      notificationError();
      setAnimationSource(failAnimation);
      updateProofStatus(
        sessionId!,
        ProofStatus.FAILURE,
        errorCode ?? undefined,
        reason ?? undefined,
      );
      trackEvent(ProofEvents.PROOF_FAILED, {
        sessionId,
        appName,
        errorCode,
        reason,
        state: currentState,
      });
    } else {
      setAnimationSource(loadingAnimation);
    }
  }, [
    trackEvent,
    currentState,
    isFocused,
    appName,
    sessionId,
    errorCode,
    reason,
    updateProofStatus,
    selfApp?.deeplinkCallback,
    countdownStarted,
  ]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    } else {
      setCountdown(null);
      if (selfApp?.deeplinkCallback) {
        Linking.openURL(selfApp.deeplinkCallback).catch(err => {
          console.error('Failed to open deep link:', err);
          onOkPress();
        });
      }
    }
  }, [countdown, selfApp?.deeplinkCallback, onOkPress]);

  useEffect(() => {
    if (!isFocused) {
      cancelCountdown();
    }
    return () => {
      cancelCountdown();
    };
  }, [isFocused]);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.TopSection
        roundTop
        marginTop={20}
        backgroundColor={black}
      >
        <DelayedLottieView
          autoPlay
          loop={animationSource === loadingAnimation}
          source={animationSource}
          style={styles.animation}
          cacheComposition={false}
          renderMode="HARDWARE"
          speed={1}
          progress={0}
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        paddingBottom={20}
        backgroundColor={white}
      >
        <View style={styles.content}>
          <Title size="large">{getTitle(currentState)}</Title>
          <Info
            currentState={currentState}
            appName={appName ?? 'The app'}
            reason={reason ?? undefined}
            countdown={countdown}
            deeplinkCallback={selfApp?.deeplinkCallback?.replace(
              /^https?:\/\//,
              '',
            )}
          />
        </View>
        <PrimaryButton
          trackEvent={ProofEvents.PROOF_RESULT_ACKNOWLEDGED}
          disabled={
            (currentState !== 'completed' &&
              currentState !== 'error' &&
              currentState !== 'failure') ||
            (currentState === 'completed' &&
              whitelistedPoints === undefined &&
              !(countdown !== null && countdown > 0))
          }
          onPress={
            countdown !== null && countdown > 0
              ? cancelDeeplinkCallbackRedirect
              : onOkPress
          }
        >
          {currentState !== 'completed' &&
          currentState !== 'error' &&
          currentState !== 'failure' ? (
            <Spinner />
          ) : countdown !== null && countdown > 0 ? (
            'Cancel'
          ) : whitelistedPoints === undefined ? (
            <Spinner />
          ) : (
            'OK'
          )}
        </PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

function getTitle(currentState: string) {
  switch (currentState) {
    case 'completed':
      return 'Proof Verified';
    case 'failure':
    case 'error':
      return 'Proof Failed';
    default:
      return 'Proving';
  }
}

function Info({
  currentState,
  appName,
  reason,
  countdown,
  deeplinkCallback,
}: {
  currentState: string;
  appName: string;
  reason?: string;
  countdown?: number | null;
  deeplinkCallback?: string;
}) {
  if (currentState === 'completed') {
    if (countdown !== null && countdown !== undefined && countdown > 0) {
      return (
        <View style={{ gap: 8 }}>
          <Description>
            You've successfully proved your identity to{' '}
            <BodyText style={typography.strong}>{appName}</BodyText>
          </Description>
          <Description>
            <BodyText style={typography.strong}>
              Redirecting to
              <BodyText style={[typography.strong, { color: '#007AFF' }]}>
                {' '}
                {deeplinkCallback}{' '}
              </BodyText>
              in {countdown}
            </BodyText>
          </Description>
        </View>
      );
    }
    return (
      <Description>
        You've successfully proved your identity to{' '}
        <BodyText style={typography.strong}>{appName}</BodyText>
      </Description>
    );
  } else if (currentState === 'error' || currentState === 'failure') {
    return (
      <View style={{ gap: 8 }}>
        <Description>
          Unable to prove your identity to{' '}
          <BodyText style={typography.strong}>{appName}</BodyText>
          {currentState === 'error' && '. Due to technical issues.'}
        </Description>
        {currentState === 'failure' && reason && (
          <>
            <Description>
              <BodyText style={[typography.strong, { fontSize: 14 }]}>
                Reason:
              </BodyText>
            </Description>
            <View style={{ maxHeight: 60 }}>
              <ScrollView showsVerticalScrollIndicator={true}>
                <Description>
                  <BodyText style={[typography.strong, { fontSize: 14 }]}>
                    {reason}
                  </BodyText>
                </Description>
              </ScrollView>
            </View>
          </>
        )}
      </View>
    );
  } else {
    return (
      <Description>
        <BodyText style={typography.strong}>{appName} </BodyText>will only know
        what you disclose
      </Description>
    );
  }
}

export default SuccessScreen;

export const styles = StyleSheet.create({
  animation: {
    width: '125%',
    height: '125%',
  },
  content: {
    paddingTop: 40,
    paddingHorizontal: 10,
    paddingBottom: 20,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
});
