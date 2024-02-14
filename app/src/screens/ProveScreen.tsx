import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Checkbox, Input, Button, Spinner, Image } from 'tamagui';
import { Check, LayoutGrid, Scan } from '@tamagui/lucide-icons';
import { getFirstName, formatDuration } from '../../utils/utils';
import { attributeToPosition } from '../../../common/src/constants/constants';
import { Steps } from '../utils/utils';
import USER from '../images/user.png'
import ProofGrid from '../components/ProofGrid';
import { App } from '../utils/AppClass';
import { Keyboard, Platform } from 'react-native';
const { ethers } = require('ethers');

interface ProveScreenProps {
  selectedApp: App | null;
  passportData: any;
  disclosure: { [key: string]: boolean };
  handleDisclosureChange: (field: string) => void;
  address: string;
  setAddress: (address: string) => void;
  generatingProof: boolean;
  handleProve: () => void;
  handleMint: () => void;
  step: number;
  mintText: string;
  proof: { proof: string, inputs: string } | null;
  proofTime: number;
  hideData: boolean;
  ens: string;
  setEns: (ens: string) => void;
}

const ProveScreen: React.FC<ProveScreenProps> = ({
  passportData,
  disclosure,
  selectedApp,
  handleDisclosureChange,
  address,
  setAddress,
  generatingProof,
  handleProve,
  step,
  mintText,
  proof,
  proofTime,
  handleMint,
  hideData,
  ens,
  setEns
}) => {
  const maskString = (input: string): string => {
    if (input.length <= 5) {
      return input.charAt(0) + '*'.repeat(input.length - 1);
    } else {
      return input.charAt(0) + input.charAt(1) + '*'.repeat(input.length - 2);
    }
  }

  const [inputValue, setInputValue] = useState('');
  const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/lpOn3k6Fezetn1e5QF-iEsn-J0C6oGE0`);

  useEffect(() => {
    if (ens != '' && inputValue == '') {
      setInputValue(ens);

    }
    else if (address != ethers.ZeroAddress && inputValue == '') {
      setInputValue(address);
    }

  }, [])

  useEffect(() => {

    const resolveENS = async () => {
      if (inputValue != ens) {
        if (inputValue.endsWith('.eth')) {
          try {
            const resolvedAddress = await provider.resolveName(inputValue);
            if (resolvedAddress) {
              console.log("new address settled:" + resolvedAddress);
              setAddress(resolvedAddress);
              setEns(inputValue);
              if (hideData) {
                console.log(maskString(address));
                //  setInputValue(maskString(address));
              }
              else {
                // setInputValue(address);
              }
            } else {
              console.error("Could not resolve ENS name.");
            }
          } catch (error) {
            console.error("Error resolving ENS name:", error);
          }
        }
        else if (inputValue.length === 42 && inputValue.startsWith('0x')) {
          setAddress(inputValue);
        }
      };
    };

    resolveENS();
  }, [inputValue]);




  // Keyboard management

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <YStack px="$4" f={1}>
      {(step >= Steps.NFC_SCAN_COMPLETED && selectedApp != null) ?
        (step < Steps.PROOF_GENERATED ? (
          <YStack flex={1} m="$2" gap="$2">
            <XStack flex={1} />
            <YStack alignSelf='center'>
              <Image
                w="$12"
                h="$12"
                borderRadius="$10"
                source={{
                  uri: passportData.photoBase64 ?? USER
                }}
              />
            </YStack>
            <XStack f={1} />

            <Text mt="$8" fontWeight="bold">Hi {hideData ? maskString(getFirstName(passportData.mrz)) : getFirstName(passportData.mrz)},</Text>
            <Text mt="$2">Enter your address or ens:</Text>
            <Input
              fontSize={13}
              mt="$3"
              placeholder="Your Address or ens name"
              value={inputValue}
              onChangeText={setInputValue}
              autoCorrect={false}
              autoCapitalize='none'
              borderColor={address != ethers.ZeroAddress ? "#3185FC" : "unset"}
            />

            {(!keyboardVisible || Platform.OS == "ios") && <YStack mt="$6" f={1}>
              <Text h="$3">{selectedApp?.disclosurephrase}</Text>
              <YStack mt="$1">
                {selectedApp && Object.keys(selectedApp.disclosure).map((key) => {
                  const key_ = key as string;
                  const indexes = attributeToPosition[key_];
                  const keyFormatted = key_.replace(/_/g, ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                  const mrzAttribute = passportData.mrz.slice(indexes[0], indexes[1] + 1);
                  const mrzAttributeFormatted = mrzAttribute;

                  return (
                    <XStack key={key} m="$2" gap="$4">
                      <Checkbox
                        value={key}
                        checked={disclosure[key_]}
                        onCheckedChange={() => handleDisclosureChange(key_)}
                        aria-label={keyFormatted}
                        size="$5"
                      >
                        <Checkbox.Indicator >
                          <Check />
                        </Checkbox.Indicator>
                      </Checkbox>
                      <Text fontWeight="bold">{keyFormatted}: </Text>
                      <Text>{hideData ? maskString(mrzAttributeFormatted) : mrzAttributeFormatted}</Text>
                    </XStack>
                  );
                })}
              </YStack>
            </YStack>}
            <XStack f={1} />
            <XStack f={1} />
            <XStack f={1} />
            {(!keyboardVisible || Platform.OS == "ios") && <Button borderRadius={100} onPress={handleProve} mt="$8" backgroundColor="#3185FC" alignSelf='center' >
              {generatingProof ? (
                <XStack ai="center">
                  <Spinner />
                  <Text color="white" marginLeft="$2" fow="bold" >Generating ZK proof</Text>
                </XStack>
              ) : (
                <Text color="white" fow="bold">Generate ZK proof</Text>
              )}
            </Button>}
            <Text fontSize={10} color={generatingProof ? "gray" : "white"} alignSelf='center'>This operation can take up to 2 mn</Text>
            <Text fontSize={9} color={generatingProof ? "gray" : "white"} pb="$2" alignSelf='center'>The application may freeze during this time (hard work)</Text>
          </YStack>

        ) : (
          <YStack flex={1} m="$2" justifyContent='center' alignItems='center' gap="$5">
            <XStack flex={1} />
            <ProofGrid proof={proof} />

            <YStack>
              <Text fontWeight="bold" fontSize="$6" mt="$6">Congrats 🎉</Text>
              <Text fontWeight="bold" fontSize="$5">You just generated this Zero Knowledge proof !</Text>
              <Text color="gray" fontSize="$5" mt="$1" fow="bold" textAlign='left'>You can now share this proof with the selected app.</Text>

              <Text color="gray" mt="$3">Proof generation duration: {formatDuration(proofTime)}</Text>

            </YStack>

            <XStack flex={1} />



            {mintText && <Text color="gray">{mintText}</Text>}

            <Button borderRadius={100} onPress={handleMint} marginTop="$4" mb="$8" backgroundColor="#3185FC">
              <Text color="white" fow="bold" >{selectedApp?.mintphrase}</Text>
            </Button>

          </YStack>
        )
        ) :
        (
          <YStack flex={1} justifyContent='center' alignItems='center'>
            <Text fontSize={17} textAlign='center' fow="bold">Please scan your passport and select an app to generate ZK proof</Text>
            <XStack mt="$8" gap="$7">
              <Scan size="$4" color={step < Steps.NFC_SCAN_COMPLETED ? "black" : "#3185FC"} />
              <LayoutGrid size="$4" color={selectedApp == null ? "black" : "#3185FC"} />
            </XStack>
          </YStack>

        )
      }
    </YStack >
  );
};
export default ProveScreen;     
