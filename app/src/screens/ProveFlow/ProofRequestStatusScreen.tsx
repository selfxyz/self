import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

import { useIsFocused } from '@react-navigation/native';
import { ScrollView, Spinner } from 'tamagui';

import loadingAnimation from '../../assets/animations/loading/misc.json';
import failAnimation from '../../assets/animations/proof_failed.json';
import succesAnimation from '../../assets/animations/proof_success.json';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { BodyText } from '../../components/typography/BodyText';
import Description from '../../components/typography/Description';
import { typography } from '../../components/typography/styles';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { ProofStatusEnum, useProofInfo } from '../../stores/proofProvider';
import { black, white } from '../../utils/colors';
import {
  buttonTap,
  notificationError,
  notificationSuccess,
} from '../../utils/haptic';
import { useProvingStore } from '../../utils/proving/provingMachine';

const SuccessScreen: React.FC = () => {
  const { selectedApp, disclosureStatus, discloseError, cleanSelfApp } =
    useProofInfo();
  const appName = selectedApp?.appName;
  const goHome = useHapticNavigation('Home');

  const currentState = useProvingStore(state => state.currentState);
  const isFocused = useIsFocused();

  const [animationSource, setAnimationSource] = useState<any>(loadingAnimation);

  function onOkPress() {
    buttonTap();
    cleanSelfApp();
    goHome();
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
    } else if (currentState === 'error') {
      notificationError();
      setAnimationSource(failAnimation);
    } else {
      setAnimationSource(loadingAnimation);
    }
  }, [currentState, isFocused]);

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
          <Title size="large">{getTitle(disclosureStatus)}</Title>
          <Info
            status={disclosureStatus}
            appName={appName === '' ? 'The app' : appName}
            reason={discloseError?.reason ?? undefined}
          />
        </View>
        <PrimaryButton
          disabled={currentState !== 'completed' && currentState !== 'error'}
          onPress={onOkPress}
        >
          {currentState !== 'completed' && currentState !== 'error' ? (
            <Spinner />
          ) : (
            'OK'
          )}
        </PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

function getTitle(status: ProofStatusEnum) {
  switch (status) {
    case 'success':
      return 'Proof Verified';
    case 'failure':
    case 'error':
      return 'Proof Failed';
    default:
      return 'Proving';
  }
}

function Info({
  status,
  appName,
  reason,
}: {
  status: ProofStatusEnum;
  appName: string;
  reason?: string;
}) {
  if (status === 'success') {
    return (
      <Description>
        You've successfully proved your identity to{' '}
        <BodyText style={typography.strong}>{appName}</BodyText>
      </Description>
    );
  } else if (status === 'failure' || status === 'error') {
    return (
      <View style={{ gap: 8 }}>
        <Description>
          Unable to prove your identity to{' '}
          <BodyText style={typography.strong}>{appName}</BodyText>
          {status === 'error' && '. Due to technical issues.'}
        </Description>
        {status === 'failure' && reason && (
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
