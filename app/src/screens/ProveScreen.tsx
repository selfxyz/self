import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { ExpandableBottomLayout } from '../layouts/ExpandableBottomLayout';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { ArgumentsProveOffChain, OpenPassportApp } from '../../../common/src/utils/appType';
import { Text, YStack } from 'tamagui';
import { Caption } from '../components/typography/styles';
import { BodyText } from '../components/typography/BodyText';
import { black, slate300, white } from '../utils/colors';
import Disclosures from '../components/Disclosures';

import {
  DEVELOPMENT_MODE,
  max_cert_bytes,
} from '../../../common/src/constants/constants';
import {
  getCircuitNameOld,
  parseCertificateSimple,
} from '../../../common/src/utils/certificate_parsing/parseCertificateSimple';
import {
  generateCircuitInputsDSC,
  getCSCAFromSKI,
  sendCSCARequest,
} from '../../../common/src/utils/csca';
import { buildAttestation } from '../../../common/src/utils/openPassportAttestation';
import { parsePassportData } from '../../../common/src/utils/parsePassportData';
import useNavigationStore from '../stores/navigationStore';
import useUserStore from '../stores/userStore';
import { generateCircuitInputsInApp } from '../utils/generateInputsInApp';
import { generateProof } from '../utils/prover';
import { CircuitName } from '../utils/zkeyDownload';
import { useNavigation } from '@react-navigation/native';

const ProveScreen: React.FC = () => {
  const {navigate} = useNavigation();
  const [generatingProof, setGeneratingProof] = useState(false);
  const selectedApp = useNavigationStore(
    state => state.selectedApp || {args: {}},
  ) as OpenPassportApp;
  const disclosureOptions =
    selectedApp.mode === 'register'
      ? {}
      : (selectedApp.args as  ArgumentsProveOffChain).disclosureOptions || {};
  const { toast, isZkeyDownloading, zkeyDownloadedPercentage } =
    useNavigationStore();

  useEffect(() => {
    console.debug('zkeyDownloadedPercentage', zkeyDownloadedPercentage);
  }, [zkeyDownloadedPercentage]);

  const { setProofVerificationResult, passportData } =
    useUserStore();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  if (!passportData) {
    return (
      <Text mt="$10" fontSize="$9" color={black} textAlign="center">
        No passport data
      </Text>
    );
  }

  const { signatureAlgorithm, authorityKeyIdentifier } = parseCertificateSimple(
    passportData.dsc,
  );
  const parsedPassportData = parsePassportData(passportData);
  const { dscSecret } = useUserStore.getState();
  const circuitName = getCircuitNameOld(
    selectedApp.mode,
    signatureAlgorithm,
    parsedPassportData.signedAttrHashFunction,
  );

  const waitForSocketConnection = (socketInstance: Socket): Promise<void> => {
    return new Promise(resolve => {
      if (socketInstance.connected) {
        resolve();
      } else {
        socketInstance.once('connect', () => {
          resolve();
        });
      }
    });
  };

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
        toast.show('Error', {
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
          toast.show('✅', {
            message: 'Identity verified',
            customData: {
              type: 'success',
            },
          });
          setTimeout(() => {
            navigate('ValidProofScreen');
          }, 700);
        } else {
          toast.show('❌', {
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
      toast.show('❌', {
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
  }, [selectedApp.userId, toast]);

  const handleProve = async () => {
    try {
      setIsConnecting(true);
      setGeneratingProof(true);

      if (!socket) {
        throw new Error('Socket not initialized');
      }

      await waitForSocketConnection(socket);
      setIsConnecting(false);

      socket.emit('proof_generation_start', {
        sessionId: selectedApp.sessionId,
      });

      const inputs = await generateCircuitInputsInApp(
        passportData,
        selectedApp,
      );
      let attestation;
      let proof;
      let dscProof;

      switch (selectedApp.mode) {
        case 'prove_onchain':
        case 'register':
          const cscaInputs = generateCircuitInputsDSC(
            dscSecret as string,
            passportData.dsc,
            max_cert_bytes,
            selectedApp.devMode,
          );
          [dscProof, proof] = await Promise.all([
            sendCSCARequest(cscaInputs),
            generateProof(circuitName, inputs),
          ]);
          const cscaPem = getCSCAFromSKI(
            authorityKeyIdentifier,
            DEVELOPMENT_MODE,
          );
          const { signatureAlgorithm: signatureAlgorithmDsc } =
            parseCertificateSimple(cscaPem);
          attestation = buildAttestation({
            mode: selectedApp.mode,
            proof: proof.proof,
            publicSignals: proof.publicSignals,
            signatureAlgorithm: signatureAlgorithm,
            hashFunction: parsedPassportData.signedAttrHashFunction,
            userIdType: selectedApp.userIdType,
            dscProof: (dscProof as any).proof,
            dscPublicSignals: (dscProof as any).pub_signals,
            signatureAlgorithmDsc: signatureAlgorithmDsc,
            hashFunctionDsc: parsedPassportData.signedAttrHashFunction,
          });
          break;
        default:
          proof = await generateProof(circuitName, inputs);
          attestation = buildAttestation({
            userIdType: selectedApp.userIdType,
            mode: selectedApp.mode,
            proof: proof.proof,
            publicSignals: proof.publicSignals,
            signatureAlgorithm: signatureAlgorithm,
            hashFunction: parsedPassportData.signedAttrHashFunction,
            dsc: passportData.dsc,
          });
          break;
      }
      console.log('\x1b[90mattestation\x1b[0m', attestation);
      socket.emit('proof_generated', {
        sessionId: selectedApp.sessionId,
        proof: attestation,
      });
    } catch (error) {
      toast.show('Error', {
        message: String(error),
        customData: {
          type: 'error',
        },
      });
      console.error('Error in handleProve:', error);
      goToErrorScreen();
      if (socket) {
        socket.emit('proof_generation_failed', {
          sessionId: selectedApp.sessionId,
        });
      }
    } finally {
      setGeneratingProof(false);
      setIsConnecting(false);
    }
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
        <Disclosures disclosures={disclosureOptions} />
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
          onPress={handleProve}
          disabled={
            generatingProof || isConnecting ||
            isZkeyDownloading[circuitName as CircuitName]
          }
        >
          Verify with Passcode
        </PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default ProveScreen;
