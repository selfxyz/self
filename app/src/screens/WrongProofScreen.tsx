import React from 'react';
import { YStack, Text, XStack } from 'tamagui';
import { bgGreen, textBlack } from '../utils/colors';
import useUserStore from '../stores/userStore';

const WrongProofScreen: React.FC = () => {
  const { proofVerificationResult } = useUserStore();

  console.log('Raw proofVerificationResult:', JSON.stringify(proofVerificationResult));

  const formatFieldName = (field: string) => {
    return field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Remove the parsing step
  const parsedResult = proofVerificationResult;

  const fieldsToCheck = [
    'scope', 'merkle_root', 'attestation_id', 'current_date', 'issuing_state',
    'name', 'passport_number', 'nationality', 'date_of_birth', 'gender',
    'expiry_date', 'older_than', 'owner_of', 'proof'
  ];

  const failedConditions = [];
  for (const field of fieldsToCheck) {
    console.log(`Checking field ${field}: ${JSON.stringify(parsedResult[field])}`);
    if (parsedResult[field] === false) {
      failedConditions.push(formatFieldName(field));
    }
  }

  console.log('Failed conditions:', JSON.stringify(failedConditions));

  return (
    <YStack f={1} p="$3">
      <YStack f={1} mt="$8">
        <Text ml="$1" fontSize={34} color={textBlack}>
          <Text style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>Oops</Text>, the proof is not valid.
        </Text>
        <Text ml="$2" mt="$3" fontSize="$8" color={textBlack}>
          Some of the <Text style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>conditions</Text> have not been satisfied:
        </Text>
        <YStack ml="$4" mt="$5">
          {failedConditions.map((condition, index) => (
            <Text key={index} fontSize="$7" color={textBlack} >
              · {condition}
            </Text>
          ))}
        </YStack>
        <Text ml="$2" mt="$8" fontSize="$7" color={textBlack} style={{ opacity: 0.7 }}>
          <Text style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>Check again</Text> your eligibility, if you are sure to be eligible to this verification please contact Proof of Passport support.
        </Text>
        <XStack f={1} />
      </YStack>
    </YStack>
  );
};

export default WrongProofScreen;