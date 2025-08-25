// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { Button, Text, YStack } from 'tamagui';

import type { ScreenProps } from '../../types/ui';

export const QRCodeScreen = ({ onSuccess, onFailure }: ScreenProps) => (
  <YStack space="$4" padding="$4">
    <Text fontSize="$6" fontWeight="bold">
      QR Code Scanner
    </Text>
    <Button onPress={onSuccess}>Simulate Success</Button>
    <Button variant="outlined" onPress={() => onFailure(new Error('QR scan failed'))}>
      Simulate Failure
    </Button>
  </YStack>
);
