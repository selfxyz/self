import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { Image, Text, View, YStack } from 'tamagui';

import { ArgumentsDisclose } from '../../../../common/src/utils/appType';
import { genMockPassportData } from '../../../../common/src/utils/passports/genMockPassportData';
import miscAnimation from '../../assets/animations/loading/misc.json';
import Disclosures from '../../components/Disclosures';
import { HeldPrimaryButton } from '../../components/buttons/PrimaryButtonLongHold';
import { BodyText } from '../../components/typography/BodyText';
import { Caption } from '../../components/typography/Caption';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { usePassport } from '../../stores/passportDataProvider';
import { ProofStatusEnum, useProofInfo } from '../../stores/proofProvider';
import { black, slate300, white } from '../../utils/colors';
import { buttonTap } from '../../utils/haptic';
import { sendVcAndDisclosePayload } from '../../utils/proving/payload';

const ProveScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { getPassportDataAndSecret } = usePassport();
  const { selectedApp, setStatus } = useProofInfo();

  // Add effect to log when selectedApp changes
  useEffect(() => {
    console.log('[ProveScreen] Selected app updated:', selectedApp);
  }, [selectedApp]);

  const disclosureOptions = useMemo(() => {
    return (selectedApp?.args as ArgumentsDisclose)?.disclosureOptions || [];
  }, [selectedApp?.args]);

  // Format the base64 image string correctly
  const logoSource = useMemo(() => {
    if (!selectedApp?.logoBase64) {
      return null;
    }
    // Ensure the base64 string has the correct data URI prefix
    const base64String = selectedApp.logoBase64.startsWith('data:image')
      ? selectedApp.logoBase64
      : `data:image/png;base64,${selectedApp.logoBase64}`;
    return { uri: base64String };
  }, [selectedApp?.logoBase64]);

  const url = useMemo(() => {
    if (!selectedApp?.endpoint) {
      return null;
    }
    const urlFormatted = selectedApp.endpoint
      .replace(/^https?:\/\//, '')
      .split('/')[0];
    return urlFormatted;
  }, [selectedApp?.endpoint]);

  const onVerify = useCallback(
    async function () {
      buttonTap();
      try {
        // getData first because that triggers biometric authentication and feels nicer to do before navigating
        // then wait a second and navigate to the status screen. use finally so that any errors thrown here dont prevent the navigate
        // importantly we are NOT awaiting the navigate call because
        // we Do NOT want to delay the callsendVcAndDisclosePayload
        const passportDataAndSecret = await getPassportDataAndSecret().finally(
          () => {
            setTimeout(() => {
              navigate('ProofRequestStatusScreen');
            }, 1000);
          },
        );
        if (!passportDataAndSecret) {
          setStatus(ProofStatusEnum.ERROR);
          return;
        }
        const { passportData, secret } = passportDataAndSecret.data;
        await sendVcAndDisclosePayload(secret, passportData, selectedApp);
      } catch (e) {
        console.log('Error sending VC and disclose payload', e);
        setStatus(ProofStatusEnum.ERROR);
      }
    },
    [
      navigate,
      getPassportDataAndSecret,
      sendVcAndDisclosePayload,
      setStatus,
      buttonTap,
    ],
  );

  async function sendMockPayload() {
    console.log('sendMockPayload, start by generating mockPassport data');
    const passportData = genMockPassportData(
      'sha1',
      'sha256',
      'rsa_sha256_65537_2048',
      'FRA',
      '000101',
      '300101',
    );
    await sendVcAndDisclosePayload('0', passportData, selectedApp);
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
            <YStack alignItems="center" justifyContent="center">
              {logoSource && (
                <Image mb={20} source={logoSource} width={100} height={100} />
              )}
              <BodyText fontSize={12} color={slate300} mb={20}>
                {url}
              </BodyText>
              <BodyText fontSize={24} color={slate300} textAlign="center">
                <Text color={white} onPress={sendMockPayload}>
                  {selectedApp.appName}
                </Text>{' '}
                is requesting that you prove the following information:
              </BodyText>
            </YStack>
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
