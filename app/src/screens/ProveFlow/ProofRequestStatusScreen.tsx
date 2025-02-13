import LottieView from 'lottie-react-native';
import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

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
import { notificationError, notificationSuccess } from '../../utils/haptic';

const SuccessScreen: React.FC = () => {
  const { selectedApp, proofVerificationResult, disclosureStatus } =
    useProofInfo();
  const appName = selectedApp?.appName;
  const goHome = useHapticNavigation('Home');

  function onOkPress() {
    goHome();
  }

  useEffect(() => {
    if (disclosureStatus === 'success') {
      notificationSuccess();
    } else if (disclosureStatus === 'failure' || disclosureStatus === 'error') {
      notificationError();
    }
  }, [disclosureStatus]);

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
          loop={disclosureStatus === 'pending'}
          source={getAnimation(disclosureStatus)}
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
          <Title size="large">{getTitle(disclosureStatus)}</Title>
          <Info status={disclosureStatus} appName={appName} />
        </View>
        <PrimaryButton
          disabled={disclosureStatus === 'pending'}
          onPress={onOkPress}
        >
          OK
        </PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

function getAnimation(status: ProofStatusEnum) {
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

function getTitle(status: ProofStatusEnum) {
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

function Info({
  status,
  appName,
}: {
  status: ProofStatusEnum;
  appName: string;
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
      <Description>
        Unable to prove your identity to{' '}
        <BodyText style={typography.strong}>{appName}</BodyText>
        {status === 'error' && '. Due to technical issues.'}
      </Description>
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
