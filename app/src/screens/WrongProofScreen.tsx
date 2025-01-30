import React from 'react';
import useUserStore from '../stores/userStore';
import { Text, View } from 'react-native';
import { ExpandableBottomLayout } from '../layouts/ExpandableBottomLayout';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import Description from '../components/typography/Description';
import { typography } from '../components/typography/styles';
import LargeTitle from '../components/typography/LargeTitle';
import { styles } from '../screens/ValidProofScreen';
import { useNavigation } from '@react-navigation/native';

const WrongProofScreen: React.FC = () => {
  const navigation = useNavigation();
  const { proofVerificationResult } = useUserStore();

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

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        <></>
        {/* TODO Animation */}
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection>
        <View style={styles.content}>
          <LargeTitle>Proof Failed</LargeTitle>
          <Description>
            Unable to prove your identity to{' '}
            <Text style={typography.strong}>.SWOOSH</Text>
          </Description>
        </View>
        <PrimaryButton
          onPress={() => {
            navigation.navigate('ValidProofScreen');
          }}
        >
          {' '}
          OK{' '}
        </PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default WrongProofScreen;
