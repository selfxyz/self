import React from 'react';
import { ExpandableBottomLayout } from '../layouts/ExpandableBottomLayout';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { useNavigation } from '@react-navigation/native';
import { OpenPassportApp } from '../../../common/src/utils/appType';
import { Text, YStack } from 'tamagui';
import { Caption } from '../components/typography/styles';
import { BodyText } from '../components/typography/BodyText';
import { slate300, white } from '../utils/colors';
import Disclosures from '../components/Disclosures';

const ProofRequest: React.FC = () => {
  const navigation = useNavigation();
  const selectedApp: Partial<OpenPassportApp> = {
    appName: 'SWOOSH',
  };
  const dislosureOptions = {
    excludedCountries: {
      enabled: true,
      value: ['North Korea', 'Iran', 'Ireland'],
    },
    minimumAge: {
      enabled: true,
      value: '21',
    },
    ofac: true,
  };

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        <YStack alignItems="center">
          <Text>Check</Text>
          <BodyText fontSize={24} color={slate300} textAlign="center">
            <Text color={white}>{selectedApp.appName}</Text> is requesting that
            you prove the following information:
          </BodyText>
        </YStack>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection>
        <Disclosures disclosures={dislosureOptions} />
        <Caption
          textAlign="center"
          marginBottom={20}
          marginTop={10}
          borderRadius={4}
        >
          Self ID will confirm that these details are accurate and none of your
          confidential info will be revealed to {selectedApp.appName}
        </Caption>
        <PrimaryButton
          onPress={() => {
            navigation.navigate('WrongProofScreen');
          }}
        >
          Verify with Passcode
        </PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default ProofRequest;
