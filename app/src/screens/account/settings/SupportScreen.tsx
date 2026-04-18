// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { Button, ScrollView, YStack } from 'tamagui';

import { BodyText } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate100,
  slate200,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import useOpenSupportForm from '@/hooks/useOpenSupportForm';
import {
  copySupportUuid,
  getSupportUuid,
  regenerateSupportUuid,
} from '@/services/supportUuid';
import { useSettingStore } from '@/stores/settingStore';

const SupportScreen: React.FC = () => {
  const supportUuid = useSettingStore(state => state.supportUuid);
  const openSupportForm = useOpenSupportForm();

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
    <ScrollView flex={1} backgroundColor={slate100}>
      <YStack padding={20} gap={20}>
        <Button
          backgroundColor={black}
          borderRadius={12}
          onPress={openSupportForm}
        >
          <BodyText style={{ color: white }}>Send feedback</BodyText>
        </Button>

        <YStack gap={8}>
          <BodyText style={{ color: slate500, fontSize: 13 }}>
            Share the diagnostic ID below when contacting support so we can
            locate your logs.
          </BodyText>

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

          <Button
            backgroundColor={white}
            borderColor={slate200}
            borderWidth={1}
            borderRadius={12}
            onPress={handleCopy}
          >
            <BodyText style={{ color: black }}>Copy diagnostic ID</BodyText>
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
      </YStack>
    </ScrollView>
  );
};

export default SupportScreen;
