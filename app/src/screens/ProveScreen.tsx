import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Checkbox, Input, Button, Spinner, Image, useWindowDimensions, ScrollView, Fieldset } from 'tamagui';
import { Check, Plus, Minus, PenTool, ShieldCheck } from '@tamagui/lucide-icons';
import { getFirstName, maskString } from '../../utils/utils';
import { attributeToPosition } from '../../../common/src/constants/constants';
import USER from '../images/user.png'
import { bgGreen, borderColor, componentBgColor, componentBgColor2, separatorColor, textBlack, textColor1, textColor2 } from '../utils/colors';
import { ethers } from 'ethers';
import { Platform } from 'react-native';
import { formatAttribute, Steps } from '../utils/utils';
import { downloadZkey } from '../utils/zkeyDownload';
import useUserStore from '../stores/userStore';
import useNavigationStore from '../stores/navigationStore';
import { AppType } from '../utils/appType';
import useSbtStore from '../stores/sbtStore';
import CustomButton from '../components/CustomButton';



const ProveScreen: React.FC = () => {
  const [acknowledged, setAcknowledged] = useState(false);
  const selectedApp = useNavigationStore(state => state.selectedApp) as AppType;
  const {
    hideData,
    isZkeyDownloading,
    step,
    toast
  } = useNavigationStore()

  const {
    fields,
    handleProve,
    circuit,
  } = selectedApp


  // const {
  //   address,
  //   majority,
  //   disclosure,
  //   update
  // } = useAppStore();

  const {
    registered,
    passportData,
  } = useUserStore();

  const handleDisclosureChange = (field: string) => {
    const requiredOrOptional = selectedApp.disclosureOptions[field as keyof typeof selectedApp.disclosureOptions];
    if (requiredOrOptional === 'required') {
      return;
    }
    // update({
    //   disclosure: {
    //     ...disclosure,
    //     [field]: !disclosure[field as keyof typeof disclosure]
    //   }
    // });
  };
  const handleAcknoledge = () => {
    setAcknowledged(!acknowledged);
  }
  const { height } = useWindowDimensions();

  useEffect(() => {
    // this already checks if downloading is required
    downloadZkey(circuit);
  }, [])

  const disclosureFieldsToText = (key: string, value: string = "") => {
    if (key === 'older_than') {
      return `I am older than ${value} years old.`;
    }
    if (key === 'nationality') {
      return `I got a valid passport from ${value}.`;
    }
    return '';
  }

  return (
    <YStack f={1} p="$3">

      <YStack mt="$4">
        <Text fontSize="$9">
          <Text fow="bold" style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>{selectedApp.name}</Text> is requesting you to prove the following information.
        </Text>
        <Text mt="$3" fontSize="$8" color={textBlack} >

          No <Text style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>other</Text> information than the one selected below will be shared with {selectedApp.name}.
        </Text>
      </YStack>

      {/* <Text mt="$8" fontSize="$8" color={textBlack}>
        I want to prove that:
      </Text> */}
      <YStack mt="$6">


        {selectedApp && Object.keys(selectedApp.disclosureOptions).map((key) => {
          const key_ = key;
          const indexes = attributeToPosition[key_ as keyof typeof attributeToPosition];
          const keyFormatted = key_.replace(/_/g, ' ').split(' ').map((word: string) => word.charAt(0) + word.slice(1)).join(' ');
          const mrzAttribute = passportData.mrz.slice(indexes[0], indexes[1] + 1);
          const mrzAttributeFormatted = formatAttribute(key_, mrzAttribute);

          return (
            <XStack key={key} gap="$3" alignItems='center'>

              <Fieldset gap="$2.5" horizontal>
                <XStack p="$2" onPress={() => handleDisclosureChange(key_)} >
                  <Checkbox
                    borderColor={separatorColor}
                    value={key}
                    onCheckedChange={() => handleDisclosureChange(key_)}
                    aria-label={keyFormatted}
                    size="$6"
                  >
                    <Checkbox.Indicator >
                      <Check color={textBlack} />
                    </Checkbox.Indicator>
                  </Checkbox>
                </XStack>
                {key_ === 'older_than' ? (
                  <XStack gap="$1.5" jc='center' ai='center'>
                    <XStack mr="$2">
                      {/* <Text color={textColor1} w="$1" fontSize={16}>{majority}</Text> */}
                      <Text color={textBlack} fontSize="$6">{disclosureFieldsToText('older_than', (selectedApp.disclosureOptions as any).older_than)}</Text>
                    </XStack>
                  </XStack>
                ) : (
                  <Text fontSize="$6"
                    color={textBlack}
                  >
                    {disclosureFieldsToText(keyFormatted, mrzAttributeFormatted)}
                  </Text>
                )}
              </Fieldset>


            </XStack>
          );
        })}
      </YStack>


      <XStack f={1} />
      <XStack f={1} />



      <XStack ai="center" gap="$2" mb="$2.5" ml="$2">
        <XStack onPress={handleAcknoledge} p="$2">
          <Checkbox size="$6" checked={acknowledged} onCheckedChange={handleAcknoledge} borderColor={separatorColor}>
            <Checkbox.Indicator>
              <Check color={textBlack} />
            </Checkbox.Indicator>
          </Checkbox>
        </XStack>
        <Text style={{ fontStyle: 'italic' }} w="85%">I acknowledge sharing the selected information with {selectedApp.name}</Text>
      </XStack>



      <CustomButton text="Prove" onPress={handleProve} isDisabled={!acknowledged} bgColor={acknowledged ? bgGreen : separatorColor} disabledOnPress={() => toast.show('✍️', {
        message: "Please check all fields",
        customData: {
          type: "info",
        },
      })} />


      {/* {fields.map((Field, index) => (
          <Field key={index} />
        ))} */}


      {/* <Button
          // disabled={isZkeyDownloading[selectedApp.circuit] || (address == ethers.ZeroAddress)}
          borderWidth={1.3}
          borderColor={borderColor}
          borderRadius={100}
          onPress={handleProve}
          mt="$8"
          // backgroundColor={address == ethers.ZeroAddress ? "#cecece" : "#3185FC"}
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
        </Button> */}
    </YStack >
  );
};

export default ProveScreen;