import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Spinner, Progress } from 'tamagui';
import { CheckCircle } from '@tamagui/lucide-icons';
import { countryCodes, DEVELOPMENT_MODE, max_cert_bytes, } from '../../../common/src/constants/constants';
import { bgGreen, bgGreen2, greenColorLight, separatorColor, textBlack } from '../utils/colors';
import useUserStore from '../stores/userStore';
import useNavigationStore from '../stores/navigationStore';
import { ArgumentsDisclose, DisclosureOptions, OpenPassportApp } from '../../../common/src/utils/appType';
import CustomButton from '../components/CustomButton';
import { formatProof, generateProof } from '../utils/prover';
import io, { Socket } from 'socket.io-client';
import { getCircuitName, parseCertificate, parseDSC } from '../../../common/src/utils/certificates/handleCertificate';
import { CircuitName } from '../utils/zkeyDownload';
import { generateCircuitInputsInApp } from '../utils/generateInputsInApp';
import { buildAttestation } from '../../../common/src/utils/openPassportAttestation';
import { generateCircuitInputsDSC, getCSCAFromSKI } from '../../../common/src/utils/csca';
import { sendCSCARequest } from '../../../common/src/utils/csca';

interface ProveScreenProps {
  setSheetRegisterIsOpen: (value: boolean) => void;
}

const ProveScreen: React.FC<ProveScreenProps> = ({ setSheetRegisterIsOpen }) => {
  const [generatingProof, setGeneratingProof] = useState(false);
  const selectedApp = useNavigationStore(state => state.selectedApp) as OpenPassportApp;
  const disclosureOptions = selectedApp.mode === 'register' ? {} : (selectedApp.args as any).disclosureOptions || {};
  const {
    toast,
    setSelectedTab,
    isZkeyDownloading,
    zkeyDownloadedPercentage
  } = useNavigationStore()

  const {
    setProofVerificationResult,
    registered,
    passportData,
  } = useUserStore()

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { signatureAlgorithm, hashFunction, authorityKeyIdentifier } = parseCertificate(passportData.dsc);
  const { secret, dscSecret } = useUserStore.getState();
  const circuitName = getCircuitName("prove", signatureAlgorithm, hashFunction);

  const waitForSocketConnection = (socket: Socket): Promise<void> => {
    return new Promise((resolve) => {
      if (socket.connected) {
        resolve();
      } else {
        socket.once('connect', () => {
          resolve();
        });
      }
    });
  };

  useEffect(() => {
    let newSocket: Socket | null = null;

    try {
      newSocket = io(selectedApp.websocketUrl, {
        path: '/websocket',
        transports: ['websocket'],
        query: { sessionId: selectedApp.sessionId, clientType: 'mobile' }
      });

      newSocket.on('connect', () => {
        console.log('Connected to WebSocket server');
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        toast.show("Error", {
          message: "Failed to connect to WebSocket server",
          customData: {
            type: "error",
          },
        });
      });

      newSocket.on('proof_verification_result', (result) => {
        console.log('Proof verification result:', result);
        setProofVerificationResult(JSON.parse(result));
        console.log("result", result);
        if (JSON.parse(result).valid) {
          toast.show("✅", {
            message: "Proof verified",
            customData: {
              type: "success",
            },
          });
          setTimeout(() => {
            setSelectedTab("valid");
          }, 700);
        } else {
          toast.show("❌", {
            message: "Wrong proof",
            customData: {
              type: "info",
            },
          });
          setTimeout(() => {
            setSelectedTab("wrong");
          }, 700);
        }
      });

      setSocket(newSocket);

    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      toast.show("❌", {
        message: "Failed to set up connection",
        customData: {
          type: "error",
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

      socket.emit('proof_generation_start', { sessionId: selectedApp.sessionId });


      switch (selectedApp.mode) {
        case 'vc_and_disclose':
          const inputs_disclose = await generateCircuitInputsInApp(passportData, selectedApp);
          const proof_disclose = await generateProof('vc_and_disclose', inputs_disclose);
          const formattedProof_disclose = formatProof(proof_disclose);
          console.log(formattedProof_disclose);
          const attestation_disclose = buildAttestation({
            userIdType: selectedApp.userIdType,
            mode: selectedApp.mode,
            proof: formattedProof_disclose.proof,
            publicSignals: formattedProof_disclose.publicSignals,
            signatureAlgorithm: signatureAlgorithm,
            hashFunction: hashFunction,
          });
          socket.emit('proof_generated', { sessionId: selectedApp.sessionId, proof: attestation_disclose });


        case 'prove_onchain':
        case 'register':
          const inputs = await generateCircuitInputsInApp(passportData, selectedApp);
          const cscaInputs = generateCircuitInputsDSC(dscSecret as string, passportData.dsc, max_cert_bytes, true);
          const [modalResponse, proof] = await Promise.all([
            sendCSCARequest(
              cscaInputs
            ),
            generateProof(
              circuitName,
              inputs,
            )
          ]);
          const dscProof = JSON.parse(JSON.stringify(modalResponse));
          const cscaPem = getCSCAFromSKI(authorityKeyIdentifier, DEVELOPMENT_MODE);
          if (!cscaPem) {
            throw new Error(`CSCA not found, devMode: ${DEVELOPMENT_MODE}, authorityKeyIdentifier: ${authorityKeyIdentifier}`);
          }
          const { signatureAlgorithm: signatureAlgorithmDsc } = parseCertificate(cscaPem);
          const formattedProof = formatProof(proof);
          const attestation = buildAttestation({
            mode: selectedApp.mode,
            proof: formattedProof.proof,
            publicSignals: formattedProof.publicSignals,
            signatureAlgorithm: signatureAlgorithm,
            hashFunction: hashFunction,
            userIdType: selectedApp.userIdType,
            dscProof: (dscProof as any).proof,
            dscPublicSignals: (dscProof as any).pub_signals,
            signatureAlgorithmDsc: signatureAlgorithmDsc,
            hashFunctionDsc: hashFunction,
          });
          console.log("\x1b[90mattestation\x1b[0m", attestation);
          socket.emit('proof_generated', { sessionId: selectedApp.sessionId, proof: attestation });
          break;
        case 'prove_offchain':
          const inputs_prove = generateCircuitInputsInApp(passportData, selectedApp);
          const proof_prove = await generateProof(
            circuitName,
            inputs_prove,
          );
          const formattedProof_prove = formatProof(proof_prove);
          const attestation_prove = buildAttestation({
            userIdType: selectedApp.userIdType,
            mode: selectedApp.mode,
            proof: formattedProof_prove.proof,
            publicSignals: formattedProof_prove.publicSignals,
            signatureAlgorithm: signatureAlgorithm,
            hashFunction: hashFunction,
            dsc: passportData.dsc,
          });
          console.log("\x1b[90mattestation\x1b[0m", attestation_prove);

          socket.emit('proof_generated', { sessionId: selectedApp.sessionId, proof: attestation_prove });
          break;
      }

    } catch (error) {
      toast.show("Error", {
        message: String(error),
        customData: {
          type: "error",
        },
      });
      console.error('Error in handleProve:', error);
      if (socket) {
        socket.emit('proof_generation_failed', { sessionId: selectedApp.sessionId });
      }
    } finally {
      setGeneratingProof(false);
      setIsConnecting(false);
    }
  };

  const disclosureFieldsToText = (key: keyof DisclosureOptions, option: any) => {
    if (key === 'ofac') {
      return (option == true)
        ? `My name is not present in the OFAC list.`
        : '';
    }
    else if (option.enabled) {
      switch (key) {
        case 'minimumAge':
          return `I am older than ${option.value} years old.`;
        case 'nationality':
          return `I have a valid passport from ${option.value}.`;
        case 'excludedCountries':
          return option.value.length > 0
            ? `I am not part of the following countries: ${option.value

              .join(', ')}.`
            : '';
        default:
          return '';
      }
    }
    return '';
  };

  const hasEnabledDisclosureOptions = Object.values(disclosureOptions).some(
    (option: any) => option.enabled
  );

  return (
    <YStack f={1} p="$3" pt="$8">
      {hasEnabledDisclosureOptions ? (
        <YStack mt="$4">
          <Text fontSize="$9">
            <Text fow="bold" style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>
              {selectedApp.appName}
            </Text>{' '}
            is requesting you to prove the following information.
          </Text>
          <Text mt="$3" fontSize="$8" color={textBlack} style={{ opacity: 0.9 }}>
            No{' '}
            <Text style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>
              other
            </Text>{' '}
            information than the one selected below will be shared with {selectedApp.appName}.
          </Text>
        </YStack>
      ) : (
        <Text fontSize="$9">
          <Text fow="bold" style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>
            {selectedApp.appName}
          </Text>{' '}
          is requesting you to prove you own a valid passport.
        </Text>
      )}

      <YStack mt="$6">
        {Object.entries(disclosureOptions).map(([key, option]: [string, any]) => {
          const text = disclosureFieldsToText(key as keyof DisclosureOptions, option);
          return text ? (
            <XStack key={key} gap="$3" mb="$3" ml="$3">
              <CheckCircle size={16} mt="$1.5" />
              <Text fontSize="$7" color={textBlack} w="85%">
                {text}
              </Text>
            </XStack>
          ) : null;
        })}
      </YStack>

      <XStack f={1} />

      {isZkeyDownloading[circuitName as CircuitName] && <YStack alignItems='center' gap="$2" mb="$3" mx="$8">
        <Text style={{ fontStyle: 'italic' }}>downloading files...</Text>
        <Progress
          key={circuitName}
          size="$1"
          value={zkeyDownloadedPercentage}
        >
          <Progress.Indicator
            animation="bouncy"
            backgroundColor={greenColorLight}
          />
        </Progress>
      </YStack>}


      <CustomButton
        Icon={isZkeyDownloading[circuitName as CircuitName] ? <Spinner /> : isConnecting ? <Spinner /> : generatingProof ? <Spinner /> : <CheckCircle />}
        isDisabled={isZkeyDownloading[circuitName as CircuitName] || isConnecting || generatingProof}
        text={isZkeyDownloading[circuitName as CircuitName] ? "Downloading files..." : isConnecting ? "Connecting..." : generatingProof ? "Generating Proof..." : "Verify"}
        onPress={registered ? handleProve : () => setSheetRegisterIsOpen(true)}
        bgColor={isConnecting || generatingProof ? separatorColor : bgGreen}
        disabledOnPress={() => toast.show('⏳', {
          message: isZkeyDownloading[circuitName as CircuitName] ? "⏳ Downloading files..." : isConnecting ? "Connecting to server..." : "Proof is generating",
          customData: {
            type: "info",
          },
        })}
      />

    </YStack >
  );
};

export default ProveScreen;
