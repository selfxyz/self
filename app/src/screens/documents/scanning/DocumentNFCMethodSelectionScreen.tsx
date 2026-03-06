// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { Platform, ScrollView } from 'react-native';
import { Input, Switch, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  BodyText,
  ButtonsContainer,
  Description,
  PrimaryButton,
  SecondaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { RootStackParamList } from '@/navigation';
import { useSettingStore } from '@/stores/settingStore';

type NFCParams = {
  skipPACE?: boolean;
  canNumber?: string;
  useCan?: boolean;
  skipCA?: boolean;
  extendedMode?: boolean;
  usePacePolling?: boolean;
};

const NFC_METHODS = [
  {
    key: 'standard',
    label: 'Standard Scan',
    description: 'Use the default NFC scan method (MRZ-based authentication).',
    platform: ['ios'],
    params: {},
  },
  {
    key: 'skipReselect',
    label: 'Skip Re-select',
    description: 'Skip the re-select step after the NFC scan.',
    platform: ['android'],
    params: { skipReselect: true },
  },
  {
    key: 'usePacePolling',
    label: 'Use PACE Polling',
    description: 'To be used with certain ID cards.',
    platform: ['ios'],
    params: { usePacePolling: true },
  },
  {
    key: 'can',
    label: 'CAN Authentication',
    description:
      'Use Card Access Number (CAN) for authentication. Enter your CAN below.',
    platform: ['ios', 'android'],
    params: { useCan: true },
  },
  {
    key: 'extendedMode',
    label: 'Extended Mode',
    description:
      'Use extended mode for authentication. This increases the response buffer size during active authentication.',
    platform: ['ios'],
    params: { extendedMode: true },
  },
  {
    key: 'mrzCorrection',
    label: 'Edit MRZ',
    description:
      'Edit the MRZ fields manually. This allows to correct the MRZ if it is incorrect.',
    platform: ['ios', 'android'],
    params: {},
  },

  // we have these options, but its not recommended to use them in production.
  // We can enable this during development.
  // {
  //   key: 'skipCA',
  //   label: 'Skip CA',
  //   description:
  //     'Skip Chip Authentication (CA). Chip authentication is like AA, that prevents clonned passports',
  //   platform: ['ios'],
  //   params: { skipCA: true },
  // },
];

const DocumentNFCMethodSelectionScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedMethod, setSelectedMethod] = useState('standard');
  const [canValue, setCanValue] = useState('');
  const [error, setError] = useState('');
  const [skipPACE, setSkipPACE] = useState(false);

  const selfClient = useSelfClient();
  const { useMRZStore } = selfClient;
  const { update, passportNumber, dateOfBirth, dateOfExpiry } = useMRZStore();

  const loggingSeverity = useSettingStore(state => state.loggingSeverity);
  const setLoggingSeverity = useSettingStore(state => state.setLoggingSeverity);
  const isDebugMode = loggingSeverity === 'debug';

  const handleSelect = (key: string) => {
    setSelectedMethod(key);
    setError('');
  };

  const onPassportNumberChange = (text: string) => {
    update({ passportNumber: text });
  };

  const onDateOfBirthChange = (text: string) => {
    update({ dateOfBirth: text });
  };

  const onDateOfExpiryChange = (text: string) => {
    update({ dateOfExpiry: text });
  };

  const handleProceed = () => {
    const method = NFC_METHODS.find(m => m.key === selectedMethod);
    if (!method) return;
    if (selectedMethod === 'can' && !canValue) {
      setError('Please enter your CAN number.');
      return;
    }

    const params: NFCParams = {
      ...method.params,
    };
    if (selectedMethod === 'can') {
      params.canNumber = canValue;
    }

    if (skipPACE) {
      params.skipPACE = true;
    }
    // Type assertion needed because static navigation doesn't infer optional params
    navigation.navigate('DocumentNFCScan', params as never);
  };

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.TopSection backgroundColor={white}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack paddingTop={20} gap={20}>
            <Title>Choose NFC Scan Method</Title>

            <XStack
              alignItems="center"
              justifyContent="space-between"
              paddingVertical="$3"
              paddingHorizontal="$2"
              borderWidth={1}
              borderColor="#ccc"
              borderRadius={10}
              backgroundColor="#fff"
            >
              <Description>Skip PACE</Description>
              <Switch
                size="$4"
                checked={skipPACE}
                onCheckedChange={setSkipPACE}
                backgroundColor={skipPACE ? '$green7Light' : '$gray4'}
                style={{ minWidth: 48, minHeight: 36 }}
              >
                <Switch.Thumb animation="quick" backgroundColor="$white" />
              </Switch>
            </XStack>

            <XStack
              alignItems="center"
              justifyContent="space-between"
              paddingVertical="$3"
              paddingHorizontal="$2"
              borderWidth={1}
              borderColor="#ccc"
              borderRadius={10}
              backgroundColor="#fff"
            >
              <Description>Debug Logging</Description>
              <Switch
                size="$4"
                checked={isDebugMode}
                onCheckedChange={checked => {
                  setLoggingSeverity(checked ? 'debug' : 'warn');
                }}
                backgroundColor={isDebugMode ? '$green7Light' : '$gray4'}
                style={{ minWidth: 48, minHeight: 36 }}
              >
                <Switch.Thumb animation="quick" backgroundColor="$white" />
              </Switch>
            </XStack>

            {NFC_METHODS.filter(method =>
              method.platform.includes(Platform.OS),
            ).map(method => (
              <YStack
                key={method.key}
                borderWidth={selectedMethod === method.key ? 2 : 1}
                borderColor={selectedMethod === method.key ? '#007AFF' : '#ccc'}
                borderRadius={10}
                padding={16}
                onPress={() => handleSelect(method.key)}
                backgroundColor={
                  selectedMethod === method.key ? '#F0F8FF' : '#fff'
                }
                pressStyle={{ backgroundColor: '#F0F8FF' }}
              >
                <Title>{method.label}</Title>
                <Description>{method.description}</Description>
                {method.key === 'can' && selectedMethod === 'can' && (
                  <YStack marginTop={12} gap={8}>
                    <Input
                      placeholder="Enter CAN number"
                      value={canValue}
                      onChangeText={setCanValue}
                      keyboardType="number-pad"
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={6}
                    />
                    {error ? (
                      <Description style={{ color: 'red' }}>
                        {error}
                      </Description>
                    ) : null}
                  </YStack>
                )}
                {method.key === 'mrzCorrection' &&
                  selectedMethod === 'mrzCorrection' && (
                    <YStack marginTop={12} gap={8}>
                      <Input
                        placeholder="Enter Passport/ID Number"
                        value={passportNumber}
                        onChangeText={onPassportNumberChange}
                      />

                      <BodyText>Birth Date (YYMMDD)</BodyText>
                      <Input
                        placeholder="YYMMDD"
                        value={dateOfBirth}
                        onChangeText={onDateOfBirthChange}
                        keyboardType="numeric"
                        maxLength={6}
                      />

                      <BodyText>Date of Expiry (YYMMDD)</BodyText>
                      <Input
                        placeholder="YYMMDD"
                        value={dateOfExpiry}
                        onChangeText={onDateOfExpiryChange}
                        keyboardType="numeric"
                        maxLength={6}
                      />
                    </YStack>
                  )}
              </YStack>
            ))}
          </YStack>
        </ScrollView>
      </ExpandableBottomLayout.TopSection>

      <ExpandableBottomLayout.BottomSection backgroundColor={white}>
        <ButtonsContainer>
          <PrimaryButton onPress={handleProceed}>Proceed</PrimaryButton>
          <SecondaryButton onPress={() => navigation.goBack()}>
            Cancel
          </SecondaryButton>
        </ButtonsContainer>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default DocumentNFCMethodSelectionScreen;
