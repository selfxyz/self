import React, { useEffect, useState } from 'react';

import { useNavigation } from '@react-navigation/native';
import io, { Socket } from 'socket.io-client';
import { Text, YStack } from 'tamagui';

import {
  ArgumentsProveOffChain,
  OpenPassportApp,
} from '../../../../common/src/utils/appType';
import Disclosures from '../../components/Disclosures';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { BodyText } from '../../components/typography/BodyText';
import { Caption } from '../../components/typography/styles';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import useNavigationStore from '../../stores/navigationStore';
import useUserStore from '../../stores/userStore';
import { black, slate300, white } from '../../utils/colors';
import { buttonTap } from '../../utils/haptic';
import { sendVcAndDisclosePayload } from '../../utils/proving/payload';

const ProveScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const selectedApp = useNavigationStore(
    state => state.selectedApp || { args: {} },
  ) as OpenPassportApp;
  const disclosureOptions =
    selectedApp.mode === 'register'
      ? {}
      : (selectedApp.args as ArgumentsProveOffChain).disclosureOptions || {};

  const { setProofVerificationResult, passportData } = useUserStore();

  const [_socket, setSocket] = useState<Socket | null>(null);

  if (!passportData) {
    return (
      <Text mt="$10" fontSize="$9" color={black} textAlign="center">
        No passport data
      </Text>
    );
  }

  function onVerify() {
    buttonTap();
    sendVcAndDisclosePayload(passportData).catch(e =>
      console.log('Error sending VC and disclose payload', e),
    );
  }

  function goToErrorScreen() {
    navigate('WrongProofScreen');
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    let newSocket: Socket | null = null;

    try {
      newSocket = io(selectedApp.websocketUrl, {
        path: '/websocket',
        transports: ['websocket'],
        query: { sessionId: selectedApp.sessionId, clientType: 'mobile' },
      });

      newSocket.on('connect', () => {
        console.log('Connected to WebSocket server');
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
      });

      newSocket.on('connect_error', error => {
        console.error('Connection error:', error);
        console.log('Error', {
          message: 'Failed to connect to WebSocket server',
          customData: {
            type: 'error',
          },
        });
        goToErrorScreen();
      });

      newSocket.on('proof_verification_result', result => {
        setProofVerificationResult(JSON.parse(result));
        console.log('result', result);
        if (JSON.parse(result).valid) {
          console.log('✅', {
            message: 'Identity verified',
            customData: {
              type: 'success',
            },
          });
          setTimeout(() => {
            navigate('ValidProofScreen');
          }, 700);
        } else {
          console.log('❌', {
            message: 'Verification failed',
            customData: {
              type: 'info',
            },
          });
          setTimeout(() => {
            goToErrorScreen();
          }, 700);
        }
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      console.log('❌', {
        message: 'Failed to set up connection',
        customData: {
          type: 'error',
        },
      });
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [selectedApp.userId]);

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
        <Disclosures disclosures={disclosureOptions} />
        <Caption
          textAlign="center"
          marginBottom={20}
          marginTop={10}
          borderRadius={4}
        >
          Self will confirm that these details are accurate and none of your
          confidential info will be revealed to {selectedApp.appName}
        </Caption>
        <PrimaryButton onLongPress={onVerify}>Hold To Verify</PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default ProveScreen;
