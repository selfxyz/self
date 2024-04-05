import React, { useState, useEffect } from 'react';
import { NativeModules } from 'react-native';
import { YStack, XStack, Text, Checkbox, Input, Button, Spinner, Image, useWindowDimensions, ScrollView, SizableStack, SizableText } from 'tamagui';
import { Check, Plus, Minus, ExternalLink, Cpu, PenTool, Info } from '@tamagui/lucide-icons';
import { getFirstName } from '../../utils/utils';
import { attributeToPosition } from '../../../common/src/constants/constants';
import USER from '../images/user.png'
import { App } from '../utils/AppClass';
import { Keyboard, Platform } from 'react-native';
import { DEFAULT_ADDRESS } from '@env';
import { blueColor, borderColor, componentBgColor, componentBgColor2, textColor1, textColor2 } from '../utils/colors';
import ENS from "../images/ens_mark_dao.png"
import { useToastController } from '@tamagui/toast'

const { ethers } = require('ethers');
const fileName = "passport.arkzkey"
const path = "/data/user/0/com.proofofpassport/files/" + fileName

interface ProveScreenProps {
  selectedApp: App | null;
  passportData: any;
  disclosure: { [key: string]: boolean };
  handleDisclosureChange: (field: string) => void;
  address: string;
  setAddress: (address: string) => void;
  generatingProof: boolean;
  handleProve: (path: string) => void;
  hideData: boolean;
  ens: string;
  setEns: (ens: string) => void;
  majority: number;
  setMajority: (age: number) => void;
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
  setMajority
}) => {
  const [zkeyLoading, setZkeyLoading] = useState(false);
  const [zkeyLoaded, setZkeyLoaded] = useState(true);
  const toast = useToastController()


  const downloadZkey = async () => {
    // TODO: don't redownload if already in the file system at path, if downloaded from previous session
    setZkeyLoading(true);
    // Allow the spinner to show up before app freeze on android
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
      console.log('Downloading file...')
      const result = await NativeModules.RNPassportReader.downloadFile(
        'https://current-pop-zkey.s3.eu-north-1.amazonaws.com/proof_of_passport_final_merkle_and_age.arkzkey',
        fileName
      );
      console.log("Download successful");
      console.log(result);
      setZkeyLoaded(true);
      setZkeyLoading(false);
    } catch (e: any) {
      console.log("Download not successful");
      toast.show('Error', {
        message: `${e.message}`,
        customData: {
          type: "error",
        },
      })
      setZkeyLoading(false);
    }
  };

  const maskString = (input: string): string => {
    if (input.length <= 5) {
      return input.charAt(0) + '*'.repeat(input.length - 1);
    } else {
      return input.charAt(0) + input.charAt(1) + '*'.repeat(input.length - 2);
    }
  }



  const [inputValue, setInputValue] = useState(DEFAULT_ADDRESS ?? '');
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
              toast.show('welcome', {
                message: 'Hi ' + inputValue,
                customData: {
                  type: "success",
                },
              })
              if (hideData) {
                console.log(maskString(address));
                //  setInputValue(maskString(address));
              }
              else {
                // setInputValue(address);
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




  // Keyboard management
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { height, width } = useWindowDimensions();
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
                    <Info size="$1" color={textColor2} />
                  </XStack>
                  <SizableText color="#a0a0a0">Select optionnal data </SizableText>
                </YStack>
              </XStack>
            </YStack>
            <YStack gap="$2" p="$3" bc="#232323" borderWidth={1.2} borderLeftWidth={0} borderRightWidth={0} borderBottomWidth={0} borderColor="#343434" borderBottomLeftRadius="$6" borderBottomRightRadius="$6">
              <ScrollView >

                {selectedApp && Object.keys(selectedApp.disclosure).map((key) => {
                  const key_ = key as string;
                  const indexes = attributeToPosition[key_];
                  const keyFormatted = key_.replace(/_/g, ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                  const mrzAttribute = passportData.mrz.slice(indexes[0], indexes[1] + 1);
                  const mrzAttributeFormatted = mrzAttribute;

                  return (
                    <XStack key={key} mx="$2" gap="$4" alignItems='center' >
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

              </ScrollView>
            </YStack>
          </YStack >
        </YStack>
        <Button disabled={zkeyLoading || (address == ethers.ZeroAddress)} borderWidth={1.3} borderColor={borderColor} borderRadius={100} onPress={() => { (!zkeyLoaded && Platform.OS != "ios") ? downloadZkey() : handleProve(path) }} mt="$8" backgroundColor={(zkeyLoading || (address == ethers.ZeroAddress)) ? "#1c1c1c" : "#3185FC"} alignSelf='center' >
          {!zkeyLoaded && Platform.OS != "ios" ? (
            <XStack ai="center" gap="$2">
              {zkeyLoading && <Spinner />}
              <Text color={textColor1} fow="bold">{zkeyLoading ? "Downloading ZK circuit" : "Download ZK circuit"}</Text>
            </XStack>
          ) : generatingProof ? (
            <XStack ai="center" gap="$1">
              <Spinner />
              <Text color={textColor1} marginLeft="$2" fow="bold" >Generating ZK proof</Text>
            </XStack>
          ) : (
            <Text color={(zkeyLoading || (address == ethers.ZeroAddress)) ? "#343434" : "#ededed"} fow="bold">Generate ZK proof</Text>
          )}
        </Button>
        {(height > 750) && <Text fontSize={10} color={generatingProof ? "#a0a0a0" : "#161616"} py="$2" alignSelf='center'>This operation can take up to 2 mn, phone may freeze during this time</Text>}
      </YStack >

    </YStack >
  );
};
export default ProveScreen;     
