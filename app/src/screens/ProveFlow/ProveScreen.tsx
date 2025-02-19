import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { Image, ScrollView, Text, View, YStack } from 'tamagui';

import { SelfAppDisclosureConfig } from '../../../../common/src/utils/appType';
import { genMockPassportData } from '../../../../common/src/utils/passports/genMockPassportData';
import miscAnimation from '../../assets/animations/loading/misc.json';
import Disclosures from '../../components/Disclosures';
import { HeldPrimaryButton } from '../../components/buttons/PrimaryButtonLongHold';
import { BodyText } from '../../components/typography/BodyText';
import { Caption } from '../../components/typography/Caption';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { useApp } from '../../stores/appProvider';
import { usePassport } from '../../stores/passportDataProvider';
import {
  ProofStatusEnum,
  globalSetDisclosureStatus,
  useProofInfo,
} from '../../stores/proofProvider';
import { black, slate300, white } from '../../utils/colors';
import { buttonTap } from '../../utils/haptic';
import {
  isUserRegistered,
  sendVcAndDisclosePayload,
} from '../../utils/proving/payload';

const ProveScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { getPassportDataAndSecret } = usePassport();
  const { selectedApp, resetProof } = useProofInfo();
  const { handleProofVerified } = useApp();
  const selectedAppRef = useRef(selectedApp);

  const isProcessingRef = useRef(false);
  useEffect(() => {
    if (
      !selectedApp ||
      selectedAppRef.current?.sessionId === selectedApp.sessionId
    ) {
      return; // Avoid unnecessary updates
    }
    selectedAppRef.current = selectedApp;
    console.log('[ProveScreen] Selected app updated:', selectedApp);
  }, [selectedApp]);

  const disclosureOptions = useMemo(() => {
    return (selectedApp?.disclosures as SelfAppDisclosureConfig) || [];
  }, [selectedApp?.disclosures]);

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
      resetProof();
      buttonTap();
      if (isProcessingRef.current) {
        return;
      }
      isProcessingRef.current = true;

      const currentApp = selectedAppRef.current;
      try {
        let timeToNavigateToStatusScreen: NodeJS.Timeout;
        const passportDataAndSecret = await getPassportDataAndSecret().catch(
          (e: Error) => {
            console.error('Error getPassportDataAndSecret', e);
            globalSetDisclosureStatus?.(ProofStatusEnum.ERROR);
          },
        );

        timeToNavigateToStatusScreen = setTimeout(() => {
          navigate('ProofRequestStatusScreen');
        }, 1000);

        if (!passportDataAndSecret) {
          console.log('No passport data or secret');
          globalSetDisclosureStatus?.(ProofStatusEnum.ERROR);
          return;
        }

        const { passportData, secret } = passportDataAndSecret.data;
        const isRegistered = await isUserRegistered(passportData, secret);
        console.log('isRegistered', isRegistered);
        if (!isRegistered) {
          clearTimeout(timeToNavigateToStatusScreen);
          console.log(
            'User is not registered, sending to ConfirmBelongingScreen',
          );
          navigate('ConfirmBelongingScreen');
          return;
        }

        console.log('currentApp', currentApp);
        const status = await sendVcAndDisclosePayload(
          secret,
          passportData,
          currentApp,
        );
        handleProofVerified(
          currentApp.sessionId,
          status === ProofStatusEnum.SUCCESS,
        );
      } catch (e) {
        console.log('Error sending VC and disclose payload', e);
        globalSetDisclosureStatus?.(ProofStatusEnum.ERROR);
      } finally {
        isProcessingRef.current = false;
      }
    },
    [navigate, getPassportDataAndSecret, handleProofVerified, resetProof],
  );

  async function sendMockPayload() {
    if (!__DEV__) {
      return;
    }

    console.log('sendMockPayload, start by generating mockPassport data');
    const passportData = genMockPassportData(
      'sha1',
      'sha256',
      'rsa_sha256_65537_2048',
      'FRA',
      '000101',
      '300101',
    );
    const status = await sendVcAndDisclosePayload(
      '0',
      passportData,
      selectedApp,
    );
    handleProofVerified(
      selectedAppRef.current.sessionId,
      status === ProofStatusEnum.SUCCESS,
    );
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
              speed={1}
              progress={0}
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
        paddingBottom={20}
        backgroundColor={white}
        maxHeight={'55%'}
      >
        <ScrollView>
          <Disclosures disclosures={disclosureOptions} />
          <View marginTop={20}>
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
        </ScrollView>
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
