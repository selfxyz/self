import React from 'react';
import { ExpandableBottomLayout } from '../layouts/ExpandableBottomLayout';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { useNavigation } from '@react-navigation/native';
import { OpenPassportApp, DisclosureOptions } from '../../../common/src/utils/appType';
import { Text, XStack, YStack } from 'tamagui';
import { Caption } from '../components/typography/styles';
import { BodyText } from '../components/typography/BodyText';
import { slate200, slate300,slate400, slate500, white } from '../utils/colors';
import CheckMark from '../images/icons/checkmark.svg';
import { Numerical } from '../components/typography/Numerical';

const ProofRequest: React.FC = () => {
  const navigation = useNavigation();
  const selectedApp: Partial<OpenPassportApp> = {
    appName: 'SWOOSH',
  };

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        <YStack alignItems="center">
          <Text>Check</Text>
          <BodyText fontSize={24} color={slate300}>
            <Text color={white}>{selectedApp.appName}</Text> is requesting that
            you prove the following information:
          </BodyText>
        </YStack>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection>
        <YStack>
          <DisclosureItem text="Your full name" />
          <DisclosureItem text="Your date of birth" />
          <DisclosureItem text="Your address" />
          <DisclosureItem2 text="I Control the Following wallet Address:" >
            <YStack gap={8} borderRadius={10} borderColor={slate200} borderWidth={1} padding={8} marginStart={34}>
                <BodyText color={slate400}>Address</BodyText>
                <Numerical >0x471EcE3750Da237f93B8E339c536989b8978a438</Numerical>
            </YStack>
          </DisclosureItem2>
        </YStack>
        <Caption textAlign="center" marginBottom={20} marginTop={10} borderRadius={4}>
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

interface DisclosureItemProps {
    text: string;
    type?: string;
    children?: React.ReactNode;
}




const DisclosureItem: React.FC<DisclosureItemProps> = ({text}: DisclosureItemProps) => {
  return (
    <XStack
      gap={10}
      borderBottomColor={slate200}
      borderBottomWidth={1}
      paddingVertical={22}
      paddingHorizontal={10}
    >
        <CheckMark width={22} />
        <BodyText color={slate500}>{text}</BodyText>
    </XStack>
  );
};

const DisclosureItem2: React.FC<DisclosureItemProps> = ({text, children}: DisclosureItemProps) => {
    return (
      <YStack
        gap={10}
        paddingVertical={22}
        paddingHorizontal={10}
      >
        <XStack gap={10}>
          <CheckMark width={22} />
          <BodyText color={slate500}>{text}</BodyText>
        </XStack>
        {children}
      </YStack>
    );
  };
  