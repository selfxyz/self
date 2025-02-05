import React, { useEffect, useState } from 'react';

import { useNavigation } from '@react-navigation/native';
import io, { Socket } from 'socket.io-client';
import { Text, YStack } from 'tamagui';

// import {
//   DEVELOPMENT_MODE,
//   MAX_CERT_BYTES,
// } from '../../../../common/src/constants/constants';
import {
  ArgumentsProveOffChain,
  OpenPassportApp,
} from '../../../../common/src/utils/appType';
import {
  getCircuitNameOld,
  parseCertificateSimple,
} from '../../../../common/src/utils/certificate_parsing/parseCertificateSimple';
// import {
//   getCSCAFromSKI,
//   sendCSCARequest,
// } from '../../../../common/src/utils/csca';
// import { generateCircuitInputsDSC } from '../../../../common/src/utils/circuits/generateInputs';
// import { buildAttestation } from '../../../../common/src/utils/openPassportAttestation';
import { parsePassportData } from '../../../../common/src/utils/passports/passport_parsing/parsePassportData';
import Disclosures from '../../components/Disclosures';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { BodyText } from '../../components/typography/BodyText';
import { Caption } from '../../components/typography/styles';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import useNavigationStore from '../../stores/navigationStore';
import useUserStore from '../../stores/userStore';
import { black, slate300, white } from '../../utils/colors';
// import { generateCircuitInputsInApp } from '../../utils/generateInputsInApp';
// import { generateProof } from '../../utils/prover';
import { CircuitName } from '../../utils/zkeyDownload';

const ProveScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const [generatingProof, setGeneratingProof] = useState(false);
  const selectedApp = useNavigationStore(
    state => state.selectedApp || { args: {} },
  ) as OpenPassportApp;
  const disclosureOptions =
    selectedApp.mode === 'register'
      ? {}
      : (selectedApp.args as ArgumentsProveOffChain).disclosureOptions || {};
  const { isZkeyDownloading } = useNavigationStore();

  const { setProofVerificationResult, passportData } = useUserStore();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  if (!passportData) {
    return (
      <Text mt="$10" fontSize="$9" color={black} textAlign="center">
        No passport data
      </Text>
    );
  }

  const { signatureAlgorithm } = parseCertificateSimple(passportData.dsc);
  const parsedPassportData = parsePassportData(passportData);
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

      // const inputs = await generateCircuitInputsInApp(
      //   passportData,
      //   selectedApp,
      // );
      // let attestation;
      // let proof;
      // let dscProof;

      switch (selectedApp.mode) {
        case 'prove_onchain':
        case 'register':
        // const cscaInputs = generateCircuitInputsDSC(
        //   dscSecret as string,
        //   passportData.dsc,
        //   MAX_CERT_BYTES,
        //   selectedApp.devMode,
        // );
        // [dscProof, proof] = await Promise.all([
        //   sendCSCARequest(cscaInputs),
        //   generateProof(circuitName, inputs),
        // ]);
        // const cscaPem = getCSCAFromSKI(
        //   authorityKeyIdentifier,
        //   DEVELOPMENT_MODE,
        // );
        // const { signatureAlgorithm: signatureAlgorithmDsc } =
        //   parseCertificateSimple(cscaPem);
        // attestation = buildAttestation({
        //   mode: selectedApp.mode,
        //   proof: proof.proof,
        //   publicSignals: proof.publicSignals,
        //   signatureAlgorithm: signatureAlgorithm,
        //   hashFunction: parsedPassportData.signedAttrHashFunction,
        //   userIdType: selectedApp.userIdType,
        //   dscProof: (dscProof as any).proof,
        //   dscPublicSignals: (dscProof as any).pub_signals,
        //   signatureAlgorithmDsc: signatureAlgorithmDsc,
        //   hashFunctionDsc: parsedPassportData.signedAttrHashFunction,
        // });
        //   break;
        // default:
        //   proof = await generateProof(circuitName, inputs);
        //   attestation = buildAttestation({
        //     userIdType: selectedApp.userIdType,
        //     mode: selectedApp.mode,
        //     proof: proof.proof,
        //     publicSignals: proof.publicSignals,
        //     signatureAlgorithm: signatureAlgorithm,
        //     hashFunction: parsedPassportData.signedAttrHashFunction,
        //     dsc: passportData.dsc,
        //   });
        //   break;
      }
      console.log('\x1b[90mattestation\x1b[0m', attestation);
      socket.emit('proof_generated', {
        sessionId: selectedApp.sessionId,
        proof: attestation,
      });
    } catch (error) {
      console.log('Error', {
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
            generatingProof ||
            isConnecting ||
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
