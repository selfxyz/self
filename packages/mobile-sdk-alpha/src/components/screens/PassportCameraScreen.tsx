// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { Button, Text, YStack } from 'tamagui';

import type { PassportCameraProps } from '../../types/ui';

// Simple placeholder component - this would be replaced with actual camera UI
export const PassportCameraScreen = ({ onMRZDetected }: PassportCameraProps) => (
  <YStack space="$4" padding="$4">
    <Text fontSize="$6" fontWeight="bold">
      Passport Camera
    </Text>
    <Button
      onPress={() =>
        onMRZDetected({
          passportNumber: 'L898902C3',
          dateOfBirth: '740812',
          dateOfExpiry: '120415',
          issuingCountry: 'UTO',
          documentType: 'P',
          validation: {
            format: true,
            passportNumberChecksum: true,
            dateOfBirthChecksum: true,
            dateOfExpiryChecksum: true,
            compositeChecksum: true,
            overall: true,
          },
        })
      }
    >
      Simulate MRZ Detection
    </Button>
  </YStack>
);
