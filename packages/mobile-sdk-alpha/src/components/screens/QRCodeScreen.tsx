// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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
