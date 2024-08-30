import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Spinner, Progress } from 'tamagui';
import { CheckCircle } from '@tamagui/lucide-icons';
import { DEFAULT_MAJORITY, WEBSOCKET_URL, } from '../../../common/src/constants/constants';
import { bgGreen, bgGreen2, greenColorLight, separatorColor, textBlack } from '../utils/colors';
import useUserStore from '../stores/userStore';
import useNavigationStore from '../stores/navigationStore';
import { AppType, ArgumentsProve } from '../../../common/src/utils/appType';
import CustomButton from '../components/CustomButton';
import { generateCircuitInputsProve } from '../../../common/src/utils/generateInputs';
import { revealBitmapFromAttributes } from '../../../common/src/utils/revealBitmap';
import { formatProof, generateProof } from '../utils/prover';
import io, { Socket } from 'socket.io-client';
import { getCircuitName, getSignatureAlgorithm } from '../../../common/src/utils/handleCertificate';
import { CircuitName } from '../utils/zkeyDownload';

interface ProveScreenProps {
  setSheetRegisterIsOpen: (value: boolean) => void;
}

const ProveScreen: React.FC<ProveScreenProps> = ({ setSheetRegisterIsOpen }) => {
  const [generatingProof, setGeneratingProof] = useState(false);
  const selectedApp = useNavigationStore(state => state.selectedApp) as AppType;
  const disclosureOptions = (selectedApp as any).getDisclosureOptions();
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
  const { signatureAlgorithm, hashFunction } = getSignatureAlgorithm(passportData.dsc as string);
  const circuitName = getCircuitName(selectedApp.circuit, signatureAlgorithm, hashFunction);

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
      newSocket = io(WEBSOCKET_URL, {
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
      const inputs = generateCircuitInputsProve(
        passportData,
        64, 32,
        selectedApp.scope,
        revealBitmapFromAttributes(disclosureOptions as any),
        disclosureOptions?.older_than ?? DEFAULT_MAJORITY,
        selectedApp.userId
      );
      const rawDscProof = await generateProof(
        circuitName,
        inputs,
      );
      const dscProof = formatProof(rawDscProof);
      const response = { dsc: passportData.dsc, dscProof: dscProof, circuit: selectedApp.circuit }
      console.log("response", response);
      socket.emit('proof_generated', { sessionId: selectedApp.sessionId, proof: response });

    } catch (error) {
      toast.show("Error", {
        message: "Proof generation failed",
        customData: {
          type: "error",
        },
      });
      console.error('Error in handleProve:', error);
    } finally {
      setGeneratingProof(false);
      setIsConnecting(false);
    }
  };




  const disclosureFieldsToText = (key: string, value: string = "") => {
    if (key === 'older_than') {
      return `I am older than ${value} years old.`;
    }
    if (key === 'nationality') {
      return `I have a valid passport from ${value}.`;
    }
    return '';
  }

  return (
    <YStack f={1} p="$3" pt="$8">
      {Object.keys(disclosureOptions).length > 0 ? <YStack mt="$4">
        <Text fontSize="$9">
          <Text fow="bold" style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>{selectedApp.name}</Text> is requesting you to prove the following information.
        </Text>
        <Text mt="$3" fontSize="$8" color={textBlack} style={{ opacity: 0.9 }}>
          No <Text style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>other</Text> information than the one selected below will be shared with {selectedApp.name}.
        </Text>
      </YStack> :
        <Text fontSize="$9">
          <Text fow="bold" style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>{selectedApp.name}</Text> is requesting you to prove you own a valid passport.
        </Text>
      }

      <YStack mt="$6">
        {Object.keys(disclosureOptions).map((key) => {
          return (
            <XStack key={key} gap="$3" mb="$3" ml="$3" >
              <CheckCircle size={16} mt="$1.5" />
              <Text fontSize="$7" color={textBlack} w="85%">
                {disclosureFieldsToText(key, (disclosureOptions as any)[key])}
              </Text>
            </XStack>
          );
        })}
      </YStack>

      <XStack f={1} />
      {/* <Text py="$4" textAlign="center" color={textBlack}>{isZkeyDownloading[circuitName as CircuitName] ? "Downloading zkey..." : "zkey downloaded"}</Text> */}


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