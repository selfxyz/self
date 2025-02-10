import React, { useEffect } from 'react';
import { Text, View } from 'react-native';

import LottieView from 'lottie-react-native';

import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import { typography } from '../../components/typography/styles';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import useNavigationStore from '../../stores/navigationStore';
import useUserStore from '../../stores/userStore';
import { notificationError } from '../../utils/haptic';
import { styles } from './ValidProofScreen';

const WrongProofScreen: React.FC = () => {
  const { proofVerificationResult } = useUserStore();
  const { selectedApp } = useNavigationStore();
  const appName = selectedApp?.appName;

  useEffect(() => {
    notificationError();
  }, []);

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

  const onOkPress = useHapticNavigation('QRCodeViewFinder');

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        <LottieView
          autoPlay
          loop={false}
          source={require('../../assets/animations/proof_failed.json')}
          style={styles.animation}
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection>
        <View style={styles.content}>
          <Title size="large">Proof Failed</Title>
          <Description>
            Unable to prove your identity to{' '}
            <Text style={typography.strong}>{appName}</Text>
          </Description>
        </View>
        <PrimaryButton onPress={onOkPress}>OK</PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default WrongProofScreen;
