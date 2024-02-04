import React from 'react';
import { YStack, XStack, Text, Checkbox, Input, Button, Spinner, SizableText } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';
import { getFirstName, formatDuration } from '../../utils/utils';
import { attributeToPosition } from '../../../common/src/constants/constants';
import { Steps } from '../utils/utils';

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
  return (
    <YStack space="$4" p="$4" bg="blue" pad>
      {step < Steps.PROOF_GENERATED ? (
        <YStack>
          <YStack my="$4">
            <SizableText mb="$1">Hi {getFirstName(passportData.mrz)},</SizableText>
            <Text mb="$2">{selectedApp.name} Is asking for the following information</Text>
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

          <Button borderRadius={100} onPress={handleProve} mt="$6" backgroundColor="#cececece" >
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
      )}
    </YStack>
  );
};
export default ProveScreen;     
