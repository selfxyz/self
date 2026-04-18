// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { Button, YStack } from 'tamagui';

import { BodyText } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate100,
  slate200,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import {
  copySupportUuid,
  getSupportUuid,
  regenerateSupportUuid,
} from '@/services/supportUuid';
import { useSettingStore } from '@/stores/settingStore';

const SupportUuidScreen: React.FC = () => {
  const supportUuid = useSettingStore(state => state.supportUuid);

  useEffect(() => {
    if (!supportUuid) getSupportUuid();
  }, [supportUuid]);

  const handleCopy = useCallback(() => {
    copySupportUuid();
    Alert.alert('Copied', 'Diagnostic ID copied to clipboard.');
  }, []);

  const handleRegenerate = useCallback(() => {
    Alert.alert(
      'Regenerate diagnostic ID?',
      'This will immediately replace the current ID for future support diagnostics.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: () => {
            regenerateSupportUuid();
            Alert.alert('Updated', 'Diagnostic ID regenerated successfully.');
          },
        },
      ],
    );
  }, []);

  return (
    <YStack flex={1} backgroundColor={slate100} padding={20} gap={16}>
      <YStack
        borderWidth={1}
        borderColor={slate200}
        borderRadius={12}
        backgroundColor={white}
        padding={16}
        gap={8}
      >
        <BodyText style={{ color: black, fontSize: 16 }}>
          Diagnostic ID
        </BodyText>
        <BodyText style={{ color: slate500, fontSize: 14 }}>
          {supportUuid}
        </BodyText>
      </YStack>

      <Button backgroundColor={black} borderRadius={12} onPress={handleCopy}>
        <BodyText style={{ color: white }}>Copy</BodyText>
      </Button>

      <Button
        backgroundColor={white}
        borderColor={slate200}
        borderWidth={1}
        borderRadius={12}
        onPress={handleRegenerate}
      >
        <BodyText style={{ color: black }}>Regenerate</BodyText>
      </Button>
    </YStack>
  );
};

export default SupportUuidScreen;
