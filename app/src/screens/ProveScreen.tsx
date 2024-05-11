import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Checkbox, Input, Button, Spinner, Image, useWindowDimensions, ScrollView } from 'tamagui';
import { Check, Plus, Minus, PenTool } from '@tamagui/lucide-icons';
import { getFirstName, maskString } from '../../utils/utils';
import { attributeToPosition } from '../../../common/src/constants/constants';
import USER from '../images/user.png'
import { App } from '../utils/AppClass';
import { DEFAULT_ADDRESS } from '@env';
import { borderColor, componentBgColor, componentBgColor2, textColor1, textColor2 } from '../utils/colors';
import ENS from "../images/ens_mark_dao.png"
import { useToastController } from '@tamagui/toast'
import { ethers } from 'ethers';
import { Platform } from 'react-native';
import { formatAttribute } from '../utils/utils';
import { Proof } from '../../../common/src/utils/types';

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
  proof: Proof | null;
  proofTime: number;
  hideData: boolean;
  ens: string;
  setEns: (ens: string) => void;
  majority: number;
  setMajority: (age: number) => void;
  zkeydownloadStatus: string;
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
  hideData,
  ens,
  setEns,
  majority,
  setMajority,
  zkeydownloadStatus
}) => {
  const { height } = useWindowDimensions();
  const [inputValue, setInputValue] = useState(DEFAULT_ADDRESS ?? '');
  const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/lpOn3k6Fezetn1e5QF-iEsn-J0C6oGE0`);
  const toast = useToastController()


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
            toast.show('🔭 Looking onchain', {
              message: 'Looking for ' + inputValue,
              customData: {
                type: "info",
              },
            })

            const resolvedAddress = await provider.resolveName(inputValue);
            if (resolvedAddress) {
              console.log("new address settled:" + resolvedAddress);
              setAddress(resolvedAddress);
              setEns(inputValue);
              toast.show('✨ Welcome ✨', {
                message: 'Nice to meet you ' + inputValue,
                customData: {
                  type: "success",
                },
              })
              if (hideData) {
                console.log(maskString(address));
              }
            } else {
              toast.show('Error', {
                message: inputValue + ' not found ',
                customData: {
                  type: "error",
                },
              })
            }
          } catch (error) {
            toast.show('Error', {
              message: 'Check input format or RPC provider or internet connection',
              customData: {
                type: "error",
              },
            })
          }
        }
        else if (inputValue.length === 42 && inputValue.startsWith('0x')) {
          setAddress(inputValue);
        }
      };
    };

    resolveENS();
  }, [inputValue]);

  return (
    <YStack px="$4" f={1} mb={Platform.OS === 'ios' ? "$5" : "$0"}>
      <YStack flex={1} mx="$2" gap="$2">
        <YStack alignSelf='center' my="$3">
          {hideData ?
            <Image
              w={height > 750 ? 150 : 100}
              h={height > 750 ? 190 : 80}
              borderRadius={height > 800 ? "$7" : "$6"}
              source={{
                uri: USER,
              }}
            /> :
            <Image
              w={height > 750 ? 150 : 110}
              h={height > 750 ? 190 : 130}
              borderRadius={height > 750 ? "$7" : "$6"}
              source={{
                uri: passportData.photoBase64 ?? USER,
              }}
            />

          }
        </YStack>
        <Text color={textColor1} fontSize="$5" fontWeight="bold" ml="$2" mb="$1">Hi {hideData ? maskString(getFirstName(passportData.mrz)) : getFirstName(passportData.mrz)} 👋</Text>

        <YStack bc={componentBgColor} borderRadius="$6" borderWidth={1.5} borderColor={borderColor}>
          <YStack p="$3">
            <XStack gap="$4" ai="center">
              <XStack p="$2" bc="#232323" borderWidth={1.2} borderColor="#343434" borderRadius="$3">
                <Image
                  source={{ uri: ENS }}
                  w="$1"
                  h="$1" />
              </XStack>
              <YStack gap="$1">
                <Text fontSize={16} fow="bold" color="#ededed">Address or ENS</Text>
              </YStack>
            </XStack>
          </YStack>
          <YStack bc={componentBgColor2} borderTopWidth={1.5} borderColor={borderColor} borderBottomLeftRadius="$6" borderBottomRightRadius="$6">
            <Input
              bg="transparent"
              color={textColor1}
              fontSize={13}
              placeholder="anon.eth or 0x023…"
              value={inputValue}
              onChangeText={setInputValue}
              autoCorrect={false}
              autoCapitalize='none'
              borderColor="transparent"
              borderWidth={0}
            />
          </YStack>
        </YStack>


        <YStack f={1} >
          <YStack bc="#1c1c1c" borderWidth={1.2} borderColor="#343434" borderRadius="$6">
            <YStack p="$3">
              <XStack gap="$4" ai="center">
                <XStack p="$2" bc="#232323" borderWidth={1.2} borderColor="#343434" borderRadius="$3">
                  <PenTool color="#a0a0a0" />
                </XStack>
                <YStack gap="$1">
                  <XStack gap="$2">
                    <Text fontSize={16} fow="bold" color="#ededed">Disclose</Text>
                    {/* <Info size="$1" color={textColor2} /> */}
                  </XStack>
                  <Text color="#a0a0a0">Select optional data </Text>
                </YStack>
              </XStack>
            </YStack>
            <YStack gap="$2" p="$3" bc="#232323" borderWidth={1.2} borderLeftWidth={0} borderRightWidth={0} borderBottomWidth={0} borderColor="#343434" borderBottomLeftRadius="$6" borderBottomRightRadius="$6">
              <ScrollView h={height < 750 ? "$6" : ""} >
                {selectedApp && Object.keys(selectedApp.disclosure).map((key) => {
                  const key_ = key as string;
                  const indexes = attributeToPosition[key_];
                  const keyFormatted = key_.replace(/_/g, ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                  const mrzAttribute = passportData.mrz.slice(indexes[0], indexes[1] + 1);
                  const mrzAttributeFormatted = formatAttribute(key_, mrzAttribute);

                  return (
                    <XStack key={key} mx="$2" gap="$3" alignItems='center' >
                      <XStack p="$2" onPress={() => handleDisclosureChange(key_)} >
                        <Checkbox
                          bg={componentBgColor}
                          borderColor={borderColor}
                          value={key}
                          checked={disclosure[key_]}
                          onCheckedChange={() => handleDisclosureChange(key_)}
                          aria-label={keyFormatted}
                          size="$6"
                        >
                          <Checkbox.Indicator >
                            <Check color={textColor1} />
                          </Checkbox.Indicator>
                        </Checkbox>
                      </XStack>
                      <Text color={textColor2} >{keyFormatted}: </Text>
                      {key_ === 'older_than' ? (
                        <XStack gap="$1.5" jc='center' ai='center'>
                          <XStack mr="$2">
                            <Text color={textColor1} w="$1" fontSize={16}>{majority}</Text>
                            <Text color={textColor1} fontSize={16}> yo</Text>
                          </XStack>
                          <Button bg={componentBgColor} borderColor={borderColor} h="$2" w="$3" onPress={() => setMajority(majority - 1)}><Minus color={textColor1} size={18} /></Button>
                          <Button bg={componentBgColor} borderColor={borderColor} h="$2" w="$3" onPress={() => setMajority(majority + 1)}><Plus color={textColor1} size={18} /></Button>
                        </XStack>
                      ) : (
                        <Text color={textColor1} >{hideData ? maskString(mrzAttributeFormatted) : mrzAttributeFormatted}</Text>
                      )}
                    </XStack>
                  );
                })}

              </ScrollView >
            </YStack >
          </YStack >
        </YStack >
        <Button
          disabled={zkeydownloadStatus != "completed" || (address == ethers.ZeroAddress)}
          borderWidth={1.3}
          borderColor={borderColor}
          borderRadius={100}
          onPress={handleProve}
          mt="$8"
          backgroundColor={address == ethers.ZeroAddress ? "#cecece" : "#3185FC"}
          alignSelf='center'
        >
          {zkeydownloadStatus === "downloading" ? (
            <XStack ai="center" gap="$1">
              <Spinner />
              <Text color={textColor1} fow="bold">
                Downloading ZK proving key
              </Text>
            </XStack>
          ) : zkeydownloadStatus === "error" ? (
            <XStack ai="center" gap="$1">
              <Spinner />
              <Text color={textColor1} fow="bold">
                Error downloading ZK proving key
              </Text>
            </XStack>
          ) : generatingProof ? (
            <XStack ai="center" gap="$1">
              <Spinner />
              <Text color={textColor2} marginLeft="$2" fow="bold">
                Generating ZK proof
              </Text>
            </XStack>
          ) : address == ethers.ZeroAddress ? (
            <Text color={textColor2} fow="bold">
              Enter address
            </Text>
          ) : (
            <Text color={textColor1} fow="bold">
              Generate ZK proof
            </Text>
          )}
        </Button>
        {(height > 750) && <Text fontSize={10} color={generatingProof ? "#a0a0a0" : "#161616"} py="$2" alignSelf='center'>This operation can take up to 2 mn, phone may freeze during this time</Text>}
      </YStack >

    </YStack >
  );
};

export default ProveScreen;