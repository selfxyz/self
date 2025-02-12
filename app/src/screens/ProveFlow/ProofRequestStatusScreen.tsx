import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

import LottieView from 'lottie-react-native';

import loadingAnimation from '../../assets/animations/loading/misc.json';
import failAnimation from '../../assets/animations/proof_failed.json';
import succesAnimation from '../../assets/animations/proof_success.json';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { BodyText } from '../../components/typography/BodyText';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import { typography } from '../../components/typography/styles';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { ProofStatus, useProofInfo } from '../../stores/proofProvider';
import { black, white } from '../../utils/colors';
import { notificationError, notificationSuccess } from '../../utils/haptic';

const SuccessScreen: React.FC = () => {
  const { selectedApp, proofVerificationResult, status } = useProofInfo();
  const appName = selectedApp?.appName;
  const goHome = useHapticNavigation('Home');

  function onOkPress() {
    // TODO should we reset everything?
    goHome();
  }

  useEffect(() => {
    if (status === 'success') {
      notificationSuccess();
    } else if (status === 'failure' || status === 'error') {
      notificationError();
    }
  }, [status]);

  // im not sure this is the best way to do this yet but its a good start until we move the websockets to a provider
  useEffect(() => {
    if (!proofVerificationResult) {
      return;
    }
    const failedConditions = [];
    for (const field of fieldsToCheck) {
      console.log(
        `Checking field ${field}: ${JSON.stringify(
          (proofVerificationResult as any)[field],
        )}`,
      );
      if ((proofVerificationResult as any)[field] === false) {
        failedConditions.push(formatFieldName(field));
      }
    }
    console.log('Failed conditions:', JSON.stringify(failedConditions));
    // failedConditions.length > 0 ? setStatus('failure') : setStatus('success');
  }, [proofVerificationResult]);

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
          loop={status === 'pending'}
          source={getAnimation(status)}
          style={styles.animation}
          cacheComposition={false}
          renderMode="HARDWARE"
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        paddingBottom={20}
        backgroundColor={white}
      >
        <View style={styles.content}>
          <Title size="large">{getTitle(status)}</Title>
          <Info status={status} appName={appName} />
        </View>
        <PrimaryButton disabled={status === 'pending'} onPress={onOkPress}>
          OK
        </PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

function getAnimation(status: ProofStatus) {
  switch (status) {
    case 'success':
      return succesAnimation;
    case 'failure':
    case 'error':
      return failAnimation;
    default:
      return loadingAnimation;
  }
}

function getTitle(status: ProofStatus) {
  switch (status) {
    case 'success':
      return 'Identity Verified';
    case 'failure':
    case 'error':
      return 'Proof Failed';
    default:
      return 'Proving';
  }
}

// Dont deduplicate this until we know what the pending state will look like
function Info({ status, appName }: { status: ProofStatus; appName: string }) {
  if (status === 'success') {
    return (
      <Description>
        You've successfully proved your identity to{' '}
        <BodyText style={typography.strong}>{appName}</BodyText>
      </Description>
    );
  } else if (status === 'failure' || status === 'error') {
    return (
      <Description>
        Unable to prove your identity to{' '}
        <BodyText style={typography.strong}>{appName}</BodyText>
        {status === 'error' && '. Due to technical issues.'}
      </Description>
    );
  } else {
    // TODO what?
    return <Description> Proving minimum viable identity </Description>;
  }
}

const formatFieldName = (field: string) => {
  return field
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const fieldsToCheck = [
  'scope',
  'merkle_root_commitment',
  'merkle_root_csca',
  'attestation_id',
  'current_date',
  'issuing_state',
  'name',
  'passport_number',
  'nationality',
  'date_of_birth',
  'gender',
  'expiry_date',
  'older_than',
  'owner_of',
  'blinded_dsc_commitment',
  'proof',
  'dscProof',
  'dsc',
  'pubKey',
  'ofac',
  'forbidden_countries_list',
];

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
