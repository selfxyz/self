import { QrCode } from '@tamagui/lucide-icons';
import React from 'react';
import { Text, XStack, YStack } from 'tamagui';

import CustomButton from '../components/CustomButton';
import useUserStore from '../stores/userStore';
import { bgGreen, textBlack } from '../utils/colors';
import { scanQRCode } from '../utils/qrCode';

const WrongProofScreen: React.FC = () => {
  const { proofVerificationResult } = useUserStore();

  const formatFieldName = (field: string) => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const fieldsToCheck = [
    'scope',
    'merkle_root_commitment',
    'merkle_root_csca',
    'attestation_id',
    'current_date',
    'issuing_state',
    'name',
    'passport_number',
    'nationality',
    'date_of_birth',
    'gender',
    'expiry_date',
    'older_than',
    'owner_of',
    'blinded_dsc_commitment',
    'proof',
    'dscProof',
    'dsc',
    'pubKey',
    'ofac',
    'forbidden_countries_list',
  ];

  const failedConditions = [];
  for (const field of fieldsToCheck) {
    console.log(
      `Checking field ${field}: ${JSON.stringify(
        (proofVerificationResult as any)[field],
      )}`,
    );
    if ((proofVerificationResult as any)[field] === false) {
      failedConditions.push(formatFieldName(field));
    }
  }

  console.log('Failed conditions:', JSON.stringify(failedConditions));

  return (
    <YStack f={1}>
      <YStack f={1} mt="$4">
        <Text ml="$1" fontSize={34} color={textBlack}>
          <Text
            style={{
              textDecorationLine: 'underline',
              textDecorationColor: bgGreen,
            }}
          >
            Oops
          </Text>
          , the proof is not valid.
        </Text>
        {(proofVerificationResult as any).error ? (
          <Text ml="$2" mt="$3" fontSize="$8" color={textBlack}>
            Error: {(proofVerificationResult as any).error}
          </Text>
        ) : (
          <>
            <Text ml="$2" mt="$3" fontSize="$8" color={textBlack}>
              Some of the <Text>conditions</Text> have not been satisfied:
            </Text>
            <YStack ml="$4" mt="$5">
              {failedConditions.map((condition, index) => (
                <Text key={index} fontSize="$7" color={textBlack}>
                  ·{' '}
                  <Text
                    key={index}
                    style={{
                      textDecorationLine: 'underline',
                      textDecorationColor: bgGreen,
                    }}
                  >
                    {condition}
                  </Text>
                </Text>
              ))}
            </YStack>
          </>
        )}
        <Text
          ml="$2"
          mt="$8"
          fontSize="$7"
          color={textBlack}
          style={{ opacity: 0.7 }}
        >
          <Text
            style={{
              textDecorationLine: 'underline',
              textDecorationColor: bgGreen,
            }}
          >
            Check again
          </Text>{' '}
          your eligibility, if you are sure to be eligible to this verification
          please contact OpenPassport support.
        </Text>
        <XStack f={1} />
        <CustomButton
          Icon={<QrCode size={18} color={textBlack} />}
          text="Scan another QR code"
          onPress={() => {
            scanQRCode();
          }}
        />
      </YStack>
    </YStack>
  );
};

export default WrongProofScreen;
