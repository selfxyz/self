import React from 'react';

import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { Text, View, YStack } from 'tamagui';

import { ArgumentsDisclose } from '../../../../common/src/utils/appType';
import Disclosures from '../../components/Disclosures';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { BodyText } from '../../components/typography/BodyText';
import { Caption } from '../../components/typography/Caption';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { useProofInfo } from '../../stores/proofProvider';
import useUserStore from '../../stores/userStore';
import { black, slate300, white } from '../../utils/colors';
import { buttonTap } from '../../utils/haptic';
import { sendVcAndDisclosePayload } from '../../utils/proving/payload';

const ProveScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { passportData } = useUserStore();
  const { selectedApp, setStatus } = useProofInfo();

  const disclosureOptions =
    (selectedApp?.args as ArgumentsDisclose)?.disclosureOptions || {};

  if (!passportData) {
    return (
      <Text mt="$10" fontSize="$9" color={black} textAlign="center">
        No passport data
      </Text>
    );
  }

  // FIXME: Probably not the right animation, but we need to show something while
  // waiting for the web app data
  if (!selectedApp) {
    return (
      <Text mt="$10" fontSize="$9" color={black} textAlign="center">
        <LottieView
          source={require('../../assets/animations/loading.json')}
          autoPlay
          loop
        />
      </Text>
    );
  }

  function onVerify() {
    buttonTap();
    navigate('ProofRequestStatusScreen');
    sendVcAndDisclosePayload(passportData).catch(e => {
      console.log('Error sending VC and disclose payload', e);
      setStatus('error');
    });
  }

  return (
    <ExpandableBottomLayout.Layout unsafeArea flex={1}>
      <ExpandableBottomLayout.TopSection>
        <YStack alignItems="center">
          <Text>Check</Text>
          <BodyText fontSize={24} color={slate300} textAlign="center">
            <Text color={white}>{selectedApp.appName}</Text> is requesting that
            you prove the following information:
          </BodyText>
        </YStack>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        flexGrow={1}
        justifyContent="space-between"
        paddingBottom={20}
      >
        <Disclosures disclosures={disclosureOptions} />
        <View>
          <Caption
            textAlign="center"
            size="small"
            marginBottom={20}
            marginTop={10}
            borderRadius={4}
          >
            Self will confirm that these details are accurate and none of your
            confidential info will be revealed to {selectedApp.appName}
          </Caption>
          <PrimaryButton onLongPress={onVerify}>Hold To Verify</PrimaryButton>
        </View>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default ProveScreen;
