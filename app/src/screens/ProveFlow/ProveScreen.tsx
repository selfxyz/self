import React from 'react';
import { StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { Text, View, YStack } from 'tamagui';

import { ArgumentsDisclose } from '../../../../common/src/utils/appType';
import miscAnimation from '../../assets/animations/loading/misc.json';
import Disclosures from '../../components/Disclosures';
import { HeldPrimaryButton } from '../../components/buttons/PrimaryButtonLongHold';
import { BodyText } from '../../components/typography/BodyText';
import { Caption } from '../../components/typography/Caption';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { ProofStatusEnum, useProofInfo } from '../../stores/proofProvider';
import useUserStore from '../../stores/userStore';
import { black, slate300, white } from '../../utils/colors';
import { buttonTap } from '../../utils/haptic';
import { sendVcAndDisclosePayload } from '../../utils/proving/payload';

const ProveScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { passportData } = useUserStore();
  const { selectedApp, setStatus } = useProofInfo();

  const disclosureOptions =
    (selectedApp?.args as ArgumentsDisclose)?.disclosureOptions || [];

  if (!passportData) {
    return (
      <Text mt="$10" fontSize="$9" color={black} textAlign="center">
        No passport data
      </Text>
    );
  }

  function onVerify() {
    buttonTap();
    navigate('ProofRequestStatusScreen');
    sendVcAndDisclosePayload(passportData).catch(e => {
      console.log('Error sending VC and disclose payload', e);
      setStatus(ProofStatusEnum.ERROR);
    });
  }

  return (
    <ExpandableBottomLayout.Layout flex={1} backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <YStack alignItems="center">
          {!selectedApp.sessionId ? (
            <LottieView
              source={miscAnimation}
              autoPlay
              loop
              resizeMode="cover"
              cacheComposition={true}
              renderMode="HARDWARE"
              style={styles.animation}
            />
          ) : (
            <BodyText fontSize={24} color={slate300} textAlign="center">
              <Text color={white}>{selectedApp.appName}</Text> is requesting
              that you prove the following information:
            </BodyText>
          )}
        </YStack>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        flexGrow={1}
        justifyContent="space-between"
        paddingBottom={20}
        backgroundColor={white}
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
          <HeldPrimaryButton
            onPress={onVerify}
            disabled={!selectedApp.sessionId}
          >
            Hold To Verify
          </HeldPrimaryButton>
        </View>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default ProveScreen;

const styles = StyleSheet.create({
  animation: {
    top: 0,
    width: 200,
    height: 200,
    transform: [{ scale: 2 }, { translateY: -20 }],
  },
});
