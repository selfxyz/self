import React, { useState } from 'react';
import { NativeModules } from 'react-native';
import { YStack, XStack, Text, Checkbox, Input, Button, Spinner, SizableText, Image } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';
import { getFirstName, formatDuration } from '../../utils/utils';
import { attributeToPosition } from '../../../common/src/constants/constants';
import { Steps } from '../utils/utils';
import USER from '../images/user.png'

const fileName = "passport.arkzkey"
const path = "/data/user/0/com.proofofpassport/files/" + fileName

const ProveScreen = ({
  passportData,
  disclosure,
  selectedApp,
  handleDisclosureChange,
  address,
  setAddress,
  generatingProof,
  handleProve,
  step,
  setStep,
  mintText,
  proof,
  proofTime,
  handleMint,
  totalTime
}) => {
  const [downloadingFile, setDownloadingFile] = useState(false);
  const [zkeyLoaded, setZkeyLoaded] = useState(false);
  
  const downloadZkey = async () => {
    // TODO: don't redownload if already in the file system at path, if downloaded from previous session

    setDownloadingFile(true);
    try {
      console.log('Downloading file...')
      const result = await NativeModules.RNPassportReader.downloadFile(
        'https://current-pop-zkey.s3.eu-north-1.amazonaws.com/proof_of_passport_final.arkzkey',
        fileName
      );
      console.log("Download successful");
      console.log(result);
      setDownloadingFile(false);
      setZkeyLoaded(true);
    } catch (e: any) {
      console.log("Download not successful");
      console.error(e.message);
      setDownloadingFile(false);
    }
  };
  

  return (
    <YStack space="$4" p="$4" >
      {
        step < Steps.PROOF_GENERATED ? (
          <YStack >
            <YStack w="100%" ai="center">
              <Image
                w="$12"
                h="$12"
                flex={1}
                borderRadius="$10"
                source={{
                  uri: USER
                }}
              />
            </YStack>
            <YStack mt="$12">
              <SizableText mb="$1">Hi {getFirstName(passportData.mrz)},</SizableText>
              <Text mb="$2">{selectedApp.name} is asking for the following information:</Text>
              {Object.keys(selectedApp.disclosure).map((key) => {
                const keyy = key as keyof typeof disclosure;
                const indexes = attributeToPosition[keyy];
                const keyFormatted = keyy.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                const mrzAttribute = passportData.mrz.slice(indexes[0], indexes[1]);
                const mrzAttributeFormatted = mrzAttribute.replace(/</g, ' ');

                return (
                  <XStack key={key} m="$2" w="$full" gap="$2">

                    <Checkbox
                      value={key}
                      checked={disclosure[keyy]}
                      onCheckedChange={() => handleDisclosureChange(keyy)}
                      aria-label={keyFormatted}
                      size="$5"
                    >
                      <Checkbox.Indicator >
                        <Check />
                      </Checkbox.Indicator>
                    </Checkbox>

                    <Text fontWeight="bold">{keyFormatted}: </Text>
                    <Text>{mrzAttributeFormatted}</Text>
                  </XStack>
                );
              })}
            </YStack>
            <Text mt="$3">Enter your address or ens</Text>
            <Input
              size="md"
              mt="$3"
              placeholder="Your Address or ens name"
              value={address}
              onChangeText={setAddress}
            />

            {downloadingFile ? (
              <Button borderRadius={100} mt="$6" backgroundColor="#3185FC" >
                <XStack ai="center">
                  <Spinner />
                  <Text color="white" marginLeft="$2" fow="bold">Downloading zkey...</Text>
                </XStack>
              </Button>
              ) : zkeyLoaded ? (
              <Button borderRadius={100} mt="$6" backgroundColor="#3185FC" >
                <Text color="white" fow="bold">Zkey downloaded!</Text>
              </Button>
            ) : (
              <Button borderRadius={100} onPress={downloadZkey} mt="$6" backgroundColor="#3185FC" >
                <Text color="white" fow="bold">Download zkey</Text>
              </Button>
            )}

            <Button borderRadius={100} onPress={() => {handleProve(path)}} mt="$6" backgroundColor="#3185FC" >
              {generatingProof ? (
                <XStack ai="center">
                  <Spinner />
                  <Text color="white" marginLeft="$2" fow="bold">Generating zk proof</Text>
                </XStack>
              ) : (
                <Text color="white" fow="bold">Generate zk proof</Text>
              )}
            </Button>
          </YStack>
        ) : (
          <YStack m="$2">
            <Text>Zero-knowledge proof generated</Text>

            <Text fontWeight="bold">Proof:</Text>
            <Text>{JSON.stringify(proof)}</Text>

            <Text fontWeight="bold">Proof Duration: {formatDuration(proofTime)}</Text>
            <Text fontWeight="bold">Total Duration: {formatDuration(totalTime)}</Text>

            <Button borderRadius={100} onPress={handleMint} marginTop="$4" mb="$4" backgroundColor="#3185FC">
              <Text color="white" fow="bold">Mint Proof of Passport</Text>
            </Button>

            {mintText && <Text>{mintText}</Text>}
          </YStack>
        )
      }
    </YStack >
  );
};
export default ProveScreen;     
