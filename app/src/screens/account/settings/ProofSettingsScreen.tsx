// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { ScrollView, YStack } from 'tamagui';

import {
  black,
  blue600,
  slate200,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { useSettingStore } from '@/stores/settingStore';

const ProofSettingsScreen: React.FC = () => {
  const {
    skipDocumentSelector,
    setSkipDocumentSelector,
    skipDocumentSelectorIfSingle,
    setSkipDocumentSelectorIfSingle,
  } = useSettingStore();

  return (
    <YStack flex={1} backgroundColor={white}>
      <ScrollView>
        <YStack padding={20} gap={20}>
          <Text style={styles.sectionTitle}>Document Selection</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>
                Always skip document selection
              </Text>
              <Text style={styles.settingDescription}>
                Go directly to proof generation using your previously selected
                or first available document
              </Text>
            </View>
            <Switch
              value={skipDocumentSelector}
              onValueChange={setSkipDocumentSelector}
              trackColor={{ false: slate200, true: blue600 }}
              thumbColor={white}
              testID="skip-document-selector-toggle"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>
                Skip when only one document
              </Text>
              <Text style={styles.settingDescription}>
                Automatically select your document when you only have one valid
                ID available
              </Text>
            </View>
            <Switch
              value={skipDocumentSelectorIfSingle}
              onValueChange={setSkipDocumentSelectorIfSingle}
              trackColor={{ false: slate200, true: blue600 }}
              thumbColor={white}
              disabled={skipDocumentSelector}
              testID="skip-document-selector-if-single-toggle"
            />
          </View>

          {skipDocumentSelector && (
            <Text style={styles.infoText}>
              Document selection is always skipped. The &quot;Skip when only one
              document&quot; setting has no effect.
            </Text>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontFamily: dinot,
    fontWeight: '600',
    color: slate500,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
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
  divider: {
    height: 1,
    backgroundColor: slate200,
  },
  infoText: {
    fontSize: 13,
    fontFamily: dinot,
    fontStyle: 'italic',
    color: slate500,
    paddingHorizontal: 4,
  },
});

export { ProofSettingsScreen };
