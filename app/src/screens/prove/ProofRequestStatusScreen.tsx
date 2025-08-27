// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { ScrollView, Spinner } from 'tamagui';
import { useIsFocused } from '@react-navigation/native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import loadingAnimation from '@/assets/animations/loading/misc.json';
import failAnimation from '@/assets/animations/proof_failed.json';
import succesAnimation from '@/assets/animations/proof_success.json';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { BodyText } from '@/components/typography/BodyText';
import Description from '@/components/typography/Description';
import { typography } from '@/components/typography/styles';
import { Title } from '@/components/typography/Title';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { ProofStatus } from '@/stores/proof-types';
import { useProofHistoryStore } from '@/stores/proofHistoryStore';
import { useSelfAppStore } from '@/stores/selfAppStore';
import { black, white } from '@/utils/colors';
import {
  buttonTap,
  notificationError,
  notificationSuccess,
} from '@/utils/haptic';
import { useProvingStore } from '@/utils/proving/provingMachine';

const SuccessScreen: React.FC = () => {
  const { trackEvent } = useSelfClient();
  const { selfApp, cleanSelfApp } = useSelfAppStore();
  const appName = selfApp?.appName;
  const goHome = useHapticNavigation('Home');

  const { updateProofStatus } = useProofHistoryStore();

  const currentState = useProvingStore(state => state.currentState) ?? '';
  const reason = useProvingStore(state => state.reason);
  const sessionId = useProvingStore(state => state.uuid);
  const errorCode = useProvingStore(state => state.error_code);

  const isFocused = useIsFocused();

  const [animationSource, setAnimationSource] = useState<any>(loadingAnimation);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownStarted, setCountdownStarted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const onOkPress = useCallback(() => {
    buttonTap();
    goHome();
    setTimeout(() => {
      cleanSelfApp();
    }, 2000); // Wait 2 seconds to user coming back to the home screen. If we don't wait the appname will change and user will see it.
  }, [goHome, cleanSelfApp]);

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
    if (isFocused) {
    }
    if (currentState === 'completed') {
      notificationSuccess();
      setAnimationSource(succesAnimation);
      updateProofStatus(sessionId!, ProofStatus.SUCCESS);
      trackEvent(ProofEvents.PROOF_COMPLETED, {
        sessionId,
        appName,
      });
      // Start countdown for redirect (only if we are on this screen and haven't started yet)
      if (isFocused && !countdownStarted && selfApp?.deeplinkCallback) {
        if (selfApp?.deeplinkCallback) {
          try {
            const url = new URL(selfApp.deeplinkCallback);
            if (url) {
              setCountdown(5);
              setCountdownStarted(true);
            }
          } catch {
            console.warn(
              'Invalid deep link URL provided:',
              selfApp.deeplinkCallback,
            );
          }
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
      <SystemBars style="dark" />
      <ExpandableBottomLayout.TopSection
        roundTop
        marginTop={20}
        backgroundColor={black}
      >
        <LottieView
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
            currentState !== 'completed' &&
            currentState !== 'error' &&
            currentState !== 'failure'
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
