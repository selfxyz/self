import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Checkbox, Input, Button, Spinner, Image, useWindowDimensions, ScrollView } from 'tamagui';
import { Check, Plus, Minus, PenTool } from '@tamagui/lucide-icons';
import { getFirstName, maskString } from '../../utils/utils';
import { attributeToPosition } from '../../../common/src/constants/constants';
import USER from '../images/user.png'
import { borderColor, componentBgColor, componentBgColor2, textColor1, textColor2 } from '../utils/colors';
import { ethers } from 'ethers';
import { Platform } from 'react-native';
import { formatAttribute, Steps } from '../utils/utils';
import { downloadZkey } from '../utils/zkeyDownload';
import useUserStore from '../stores/userStore';
import useNavigationStore from '../stores/navigationStore';
import { AppType } from '../utils/appType';
import useSbtStore from '../stores/sbtStore';

export const appStoreMapping = {
  'soulbound': useSbtStore,
  // Add more app ID to store mappings as needed
};

const ProveScreen: React.FC = () => {
  const selectedApp = useNavigationStore(state => state.selectedApp) as AppType;
  const {
    hideData,
    isZkeyDownloading,
    step,
  } = useNavigationStore()

  const {
    fields,
    handleProve,
    circuit,
  } = selectedApp
  
  const useAppStore = appStoreMapping[selectedApp.id as keyof typeof appStoreMapping]
  
  const {
    address,
    majority,
    disclosure,
    update
  } = useAppStore();

  const {
    registered,
    passportData,
  } = useUserStore();
  
  const handleDisclosureChange = (field: string) => {
    const requiredOrOptional = selectedApp.disclosureOptions[field as keyof typeof selectedApp.disclosureOptions];

    if (requiredOrOptional === 'required') {
      return;
    }

    update({
      disclosure: {
        ...disclosure,
        [field]: !disclosure[field as keyof typeof disclosure]
      }
    });
  };
  
  const { height } = useWindowDimensions();

  useEffect(() => {
    // this already checks if downloading is required
    downloadZkey(circuit);
  }, [])

  return (
    <YStack px="$4" f={1} mb={Platform.OS === 'ios' ? "$5" : "$0"}>
      <YStack flex={1} mx="$2" gap="$2">
        <YStack alignSelf='center' my="$3">
          {hideData
            ? <Image
                w={height > 750 ? 150 : 100}
                h={height > 750 ? 190 : 80}
                borderRadius={height > 800 ? "$7" : "$6"}
                source={{
                  uri: USER,
                }}
              />
            : <Image
                w={height > 750 ? 150 : 110}
                h={height > 750 ? 190 : 130}
                borderRadius={height > 750 ? "$7" : "$6"}
                source={{
                  uri: passportData.photoBase64 ?? USER,
                }}
              />
          }
        </YStack>
        <Text color={textColor1} fontSize="$5" fontWeight="bold" ml="$2" mb="$1">
          Hi {" "} 
          {
            hideData
              ? maskString(getFirstName(passportData.mrz))
              : getFirstName(passportData.mrz)
          }
          👋
        </Text>

        {fields.map((Field, index) => (
          <Field key={index} />
        ))}


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
                  </XStack>
                  <Text color="#a0a0a0">Select what to disclose</Text>
                </YStack>
              </XStack>
            </YStack>
            <YStack
              gap="$2"
              p="$3"
              bc="#232323"
              borderWidth={1.2}
              borderLeftWidth={0}
              borderRightWidth={0}
              borderBottomWidth={0}
              borderColor="#343434"
              borderBottomLeftRadius="$6"
              borderBottomRightRadius="$6"
            >
              <ScrollView h={height < 750 ? "$6" : ""} >
                {selectedApp && Object.keys(selectedApp.disclosureOptions).map((key) => {
                  const key_ = key;
                  const indexes = attributeToPosition[key_ as keyof typeof attributeToPosition];
                  const keyFormatted = key_.replace(/_/g, ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                  const mrzAttribute = passportData.mrz.slice(indexes[0], indexes[1] + 1);
                  const mrzAttributeFormatted = formatAttribute(key_, mrzAttribute);

                  return (
                    <XStack key={key} mx="$2" gap="$3" alignItems='center'>
                      <XStack p="$2" onPress={() => handleDisclosureChange(key_)} >
                        <Checkbox
                          bg={componentBgColor}
                          borderColor={borderColor}
                          value={key}
                          checked={disclosure[key_ as keyof typeof disclosure]}
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
                          <Button
                            bg={componentBgColor}
                            borderColor={borderColor}
                            h="$2"
                            w="$3"
                            onPress={() => update({
                              majority: majority - 1
                            })}
                          >
                            <Minus color={textColor1} size={18} />
                          </Button>
                          <Button
                            bg={componentBgColor}
                            borderColor={borderColor}
                            h="$2"
                            w="$3"
                            onPress={() => update({
                              majority: majority + 1
                            })}
                          >
                            <Plus color={textColor1} size={18} />
                          </Button>
                        </XStack>
                      ) : (
                        <Text
                          color={textColor1}
                        >
                          {hideData ? maskString(mrzAttributeFormatted) : mrzAttributeFormatted}
                        </Text>
                      )}
                    </XStack>
                  );
                })}
              </ScrollView >
            </YStack >
          </YStack >
        </YStack >
        <Button
          disabled={isZkeyDownloading[selectedApp.circuit] || (address == ethers.ZeroAddress)}
          borderWidth={1.3}
          borderColor={borderColor}
          borderRadius={100}
          onPress={handleProve}
          mt="$8"
          backgroundColor={address == ethers.ZeroAddress ? "#cecece" : "#3185FC"}
          alignSelf='center'
        >
          {!registered ? (
            <XStack ai="center" gap="$1">
              <Spinner />
              <Text color={textColor1} fow="bold">
                Registering identity...
              </Text>
            </XStack>
          ) : isZkeyDownloading[selectedApp.circuit] ? (
            <XStack ai="center" gap="$1">
              <Spinner />
              <Text color={textColor1} fow="bold">
                Downloading ZK proving key
              </Text>
            </XStack>
          ) : step === Steps.GENERATING_PROOF ? (
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
        {
          (height > 750) &&
            <Text
              fontSize={10}
              color={step === Steps.GENERATING_PROOF ? "#a0a0a0" : "#161616"}
              py="$2"
              alignSelf='center'
            >
              This operation can take up to 1 mn, phone may freeze during this time
            </Text>
        }
      </YStack >
    </YStack >
  );
};

export default ProveScreen;