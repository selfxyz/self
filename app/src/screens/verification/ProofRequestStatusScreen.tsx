// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { LottieViewProps } from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
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
import {
  black,
  slate200,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import failAnimation from '@/assets/animations/proof_failed.json';
import succesAnimation from '@/assets/animations/proof_success.json';
import { captureException } from '@/config/sentry';
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
// Give each active proving state a generous 90s window before exposing an
// escape hatch. This avoids trapping users on silent stalls without cutting off
// normal slow-device proving too aggressively.
const PROVING_STALL_TIMEOUT_MS = 90_000;
const PROOF_TIMEOUT_ERROR_CODE = 'proof_timeout';
const PROOF_TIMEOUT_REASON = 'timed_out_after_90s';
const STALL_TIMEOUT_STATES = new Set([
  'parsing_id_document',
  'fetching_data',
  'validating_document',
  'init_tee_connexion',
  'ready_to_prove',
  'listening_for_status',
  'proving',
  'post_proving',
]);

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
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isDismissingTimedOutProof, setIsDismissingTimedOutProof] =
    useState(false);
  const [whitelistedPoints, setWhitelistedPoints] = useState<
    number | null | undefined
  >(undefined);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const provingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timedOutSessionIdRef = useRef<string | null>(null);
  const dismissingTimedOutProofRef = useRef(false);
  const timedOutAnalyticsTrackedRef = useRef(false);

  const displayState = hasTimedOut ? 'failure' : currentState;
  const displayReason = hasTimedOut
    ? PROOF_TIMEOUT_REASON
    : (reason ?? undefined);

  const onOkPress = useCallback(async () => {
    // The whitelistedPoints guard only applies to the success path — on
    // failure/error it is never populated, and blocking would trap the user.
    if (currentState === 'completed' && whitelistedPoints === undefined) return;
    buttonTap();
    const completedSessionId = sessionId;

    const cleanupLater = () => {
      // If completedSessionId is null (early failure before TEE negotiation),
      // skip the delayed cleanup: a retry started in the next 2s would also
      // have a null uuid and get wiped by cleanSelfApp.
      if (completedSessionId === null) return;
      setTimeout(() => {
        if (useProvingStore.getState().uuid === completedSessionId) {
          selfClient.getSelfAppState().cleanSelfApp();
        }
      }, 2000);
    };

    if (currentState === 'completed' && whitelistedPoints !== null) {
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
    currentState,
    whitelistedPoints,
    navigation,
    goHome,
    selfClient,
    sessionId,
    useProvingStore,
  ]);

  const clearProvingTimeout = useCallback(() => {
    if (provingTimeoutRef.current) {
      clearTimeout(provingTimeoutRef.current);
      provingTimeoutRef.current = null;
    }
  }, []);

  const onTimedOutDismiss = useCallback(async () => {
    if (dismissingTimedOutProofRef.current) {
      return;
    }

    dismissingTimedOutProofRef.current = true;
    setIsDismissingTimedOutProof(true);
    buttonTap();

    try {
      await useProvingStore.getState().cancel(selfClient);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          module: 'proof-request-status-screen',
          action: 'dismiss_timed_out_proof',
          sessionId: timedOutSessionIdRef.current,
        },
      );
    } finally {
      dismissingTimedOutProofRef.current = false;
      setIsDismissingTimedOutProof(false);
      selfClient.getSelfAppState().cleanSelfApp();
      goHome();
    }
  }, [goHome, selfClient, useProvingStore]);

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
    setHasTimedOut(false);
    timedOutAnalyticsTrackedRef.current = false;
    setCountdownStarted(false);
    setCountdown(null);
  }, [sessionId]);

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
    if (hasTimedOut) {
      setAnimationSource(failAnimation);

      if (!timedOutAnalyticsTrackedRef.current) {
        timedOutAnalyticsTrackedRef.current = true;
        notificationError();
        // sessionId (uuid) is only assigned once TEE negotiation starts, so
        // pre-TEE stall states (parsing_id_document, fetching_data, etc.)
        // have no uuid to attach to proof history.
        if (sessionId) {
          updateProofStatus(
            sessionId,
            ProofStatus.FAILURE,
            PROOF_TIMEOUT_ERROR_CODE,
            PROOF_TIMEOUT_REASON,
          );
        }
        trackEvent(ProofEvents.PROOF_FAILED, {
          sessionId,
          appName,
          errorCode: PROOF_TIMEOUT_ERROR_CODE,
          reason: PROOF_TIMEOUT_REASON,
          state: 'timeout',
        });
      }
    } else if (currentState === 'completed') {
      timedOutAnalyticsTrackedRef.current = false;
      notificationSuccess();
      setAnimationSource(succesAnimation);
      if (sessionId) {
        updateProofStatus(sessionId, ProofStatus.SUCCESS);
      }
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
      timedOutAnalyticsTrackedRef.current = false;
      notificationError();
      setAnimationSource(failAnimation);
      if (sessionId) {
        updateProofStatus(
          sessionId,
          ProofStatus.FAILURE,
          errorCode ?? undefined,
          reason ?? undefined,
        );
      }
      trackEvent(ProofEvents.PROOF_FAILED, {
        sessionId,
        appName,
        errorCode,
        reason,
        state: currentState,
      });
    } else {
      timedOutAnalyticsTrackedRef.current = false;
      setAnimationSource(loadingAnimation);
    }
  }, [
    hasTimedOut,
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
    if (hasTimedOut) {
      clearProvingTimeout();
      return;
    }

    if (!isFocused || !STALL_TIMEOUT_STATES.has(currentState)) {
      clearProvingTimeout();
      return;
    }

    clearProvingTimeout();
    provingTimeoutRef.current = setTimeout(() => {
      timedOutSessionIdRef.current = sessionId;
      setHasTimedOut(true);
    }, PROVING_STALL_TIMEOUT_MS);

    return () => {
      clearProvingTimeout();
    };
  }, [clearProvingTimeout, currentState, hasTimedOut, isFocused, sessionId]);

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
      clearProvingTimeout();
    };
  }, [clearProvingTimeout, isFocused]);

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
          <Title size="large">{getTitle(displayState)}</Title>
          <Info
            currentState={displayState}
            appName={appName ?? 'The app'}
            reason={displayReason}
            errorCode={
              hasTimedOut ? PROOF_TIMEOUT_ERROR_CODE : (errorCode ?? undefined)
            }
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
            isDismissingTimedOutProof ||
            (displayState !== 'completed' &&
              displayState !== 'error' &&
              displayState !== 'failure') ||
            (displayState === 'completed' &&
              whitelistedPoints === undefined &&
              !(countdown !== null && countdown > 0))
          }
          onPress={
            hasTimedOut
              ? onTimedOutDismiss
              : countdown !== null && countdown > 0
                ? cancelDeeplinkCallbackRedirect
                : onOkPress
          }
        >
          {isDismissingTimedOutProof ? (
            <Spinner />
          ) : displayState === 'failure' || displayState === 'error' ? (
            'Dismiss'
          ) : displayState !== 'completed' ? (
            <Spinner />
          ) : countdown !== null && countdown > 0 ? (
            'Cancel'
          ) : currentState === 'completed' &&
            whitelistedPoints === undefined ? (
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

// Maps low-level proving errors to actionable, user-facing guidance.
// Raw `reason` is still shown below in a scrollable details box for support.
function getUserFacingErrorMessage(
  currentState: string,
  reason: string | undefined,
  errorCode: string | undefined,
  appName: string,
): string {
  if (
    reason === PROOF_TIMEOUT_REASON ||
    errorCode === PROOF_TIMEOUT_ERROR_CODE
  ) {
    return `The proof request from ${appName} took too long to finish. Please try again, or refresh the QR code in ${appName} and scan again.`;
  }
  if (currentState === 'error') {
    return `Unable to prove your identity to ${appName} due to a technical issue. Please try again.`;
  }
  const invalidRootPattern = /InvalidRoot/i;
  if (
    (reason && invalidRootPattern.test(reason)) ||
    (errorCode && invalidRootPattern.test(errorCode))
  ) {
    return `The QR code from ${appName} is out of date. Please refresh it in ${appName} and scan again.`;
  }
  return `Unable to prove your identity to ${appName}. Please try again, or contact support if the issue persists.`;
}

function Info({
  currentState,
  appName,
  reason,
  errorCode,
  countdown,
  deeplinkCallback,
}: {
  currentState: string;
  appName: string;
  reason?: string;
  errorCode?: string;
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
    const userMessage = getUserFacingErrorMessage(
      currentState,
      reason,
      errorCode,
      appName,
    );
    return (
      <View style={{ gap: 12 }}>
        <Description>{userMessage}</Description>
        {currentState === 'failure' && reason && (
          <View style={styles.reasonBox}>
            <BodyText style={[typography.strong, styles.reasonLabel]}>
              Details
            </BodyText>
            <ScrollView
              style={styles.reasonScroll}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
            >
              <Text selectable style={styles.reasonText}>
                {reason}
              </Text>
            </ScrollView>
          </View>
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
  reasonBox: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: slate200,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  reasonLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonScroll: {
    maxHeight: 120,
  },
  reasonText: {
    color: slate500,
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
});
