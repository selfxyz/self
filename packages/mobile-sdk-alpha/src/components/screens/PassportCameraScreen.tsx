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
        onMRZDetected({ documentNumber: 'test', birthDate: 'test', expiryDate: 'test', countryCode: 'test' })
      }
    >
      Simulate MRZ Detection
    </Button>
  </YStack>
);
