// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { Button, ScrollView, YStack } from 'tamagui';

import { BodyText } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  blue600,
  slate100,
  slate200,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import useOpenSupportForm from '@/hooks/useOpenSupportForm';
import { useSupportUuid } from '@/hooks/useSupportUuid';

const SupportScreen: React.FC = () => {
  const { isEnabled, supportUuid, copy, regenerate, setEnabled } =
    useSupportUuid();
  const openSupportForm = useOpenSupportForm();
  const supportIdText = supportUuid ?? 'Loading support ID...';

  const handleCopy = useCallback(() => {
    copy();
    Alert.alert('Copied', 'Support ID copied to clipboard.');
  }, [copy]);

  const handleRegenerate = useCallback(() => {
    Alert.alert(
      'Regenerate support ID?',
      "Use this if you've shared your ID publicly or want a fresh one for a new issue. Future support requests will use the new ID.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: () => {
            regenerate();
            Alert.alert('Updated', 'Your support ID has been replaced.');
          },
        },
      ],
    );
  }, [regenerate]);

  const handleSupportUuidToggle = useCallback(
    (enabled: boolean) => {
      setEnabled(enabled);
    },
    [setEnabled],
  );

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
            Only turn this on if a Self support agent asks for it. A support ID
            helps our team find the activity related to your report. It's not
            tied to your identity.
          </BodyText>

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <BodyText style={styles.settingLabel}>Share support ID</BodyText>
              <BodyText style={styles.settingDescription}>
                {isEnabled
                  ? 'Share the support ID below with support so we can find the activity related to your report. Turn this off to keep it out of support requests and error screens.'
                  : 'Support ID is off. Only turn it on if a Self support agent asks for it.'}
              </BodyText>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={handleSupportUuidToggle}
              trackColor={{ false: slate200, true: blue600 }}
              thumbColor={white}
              testID="support-uuid-toggle"
            />
          </View>

          {isEnabled ? (
            <>
              <YStack
                borderWidth={1}
                borderColor={slate200}
                borderRadius={12}
                backgroundColor={white}
                padding={16}
                gap={8}
              >
                <BodyText style={{ color: black, fontSize: 16 }}>
                  Support ID
                </BodyText>
                <BodyText style={{ color: slate500, fontSize: 14 }}>
                  {supportIdText}
                </BodyText>
              </YStack>

              <Button
                backgroundColor={white}
                borderColor={slate200}
                borderWidth={1}
                borderRadius={12}
                onPress={handleCopy}
              >
                <BodyText style={{ color: black }}>Copy support ID</BodyText>
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
            </>
          ) : null}
        </YStack>
      </YStack>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  settingTextContainer: {
    flex: 1,
    gap: 4,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: dinot,
    fontWeight: '500',
    color: black,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: dinot,
    color: slate500,
  },
});

export default SupportScreen;
