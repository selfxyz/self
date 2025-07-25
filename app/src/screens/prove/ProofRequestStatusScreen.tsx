// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useIsFocused } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { ScrollView, Spinner } from 'tamagui';

import loadingAnimation from '../../assets/animations/loading/misc.json';
import failAnimation from '../../assets/animations/proof_failed.json';
import succesAnimation from '../../assets/animations/proof_success.json';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { BodyText } from '../../components/typography/BodyText';
import Description from '../../components/typography/Description';
import { typography } from '../../components/typography/styles';
import { Title } from '../../components/typography/Title';
import { ProofEvents } from '../../consts/analytics';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { ProofStatus } from '../../stores/proof-types';
import { useProofHistoryStore } from '../../stores/proofHistoryStore';
import { useSelfAppStore } from '../../stores/selfAppStore';
import analytics from '../../utils/analytics';
import { black, white } from '../../utils/colors';
import {
  buttonTap,
  notificationError,
  notificationSuccess,
} from '../../utils/haptic';
import { useProvingStore } from '../../utils/proving/provingMachine';

const { trackEvent } = analytics();

const SuccessScreen: React.FC = () => {
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

  function onOkPress() {
    buttonTap();
    goHome();
    setTimeout(() => {
      cleanSelfApp();
    }, 2000); // Wait 2 seconds to user coming back to the home screen. If we don't wait the appname will change and user will see it.
  }

  useEffect(() => {
    if (isFocused) {
      console.log(
        '[ProofRequestStatusScreen] State update while focused:',
        currentState,
      );
    }
    if (currentState === 'completed') {
      notificationSuccess();
      setAnimationSource(succesAnimation);
      updateProofStatus(sessionId!, ProofStatus.SUCCESS);
      trackEvent(ProofEvents.PROOF_COMPLETED, {
        sessionId,
        appName,
      });
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
    currentState,
    isFocused,
    appName,
    sessionId,
    errorCode,
    reason,
    updateProofStatus,
  ]);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <StatusBar barStyle="dark-content" backgroundColor={white} />
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
          />
        </View>
        <PrimaryButton
          trackEvent={ProofEvents.PROOF_RESULT_ACKNOWLEDGED}
          disabled={
            currentState !== 'completed' &&
            currentState !== 'error' &&
            currentState !== 'failure'
          }
          onPress={onOkPress}
        >
          {currentState !== 'completed' &&
          currentState !== 'error' &&
          currentState !== 'failure' ? (
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
}: {
  currentState: string;
  appName: string;
  reason?: string;
}) {
  if (currentState === 'completed') {
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
