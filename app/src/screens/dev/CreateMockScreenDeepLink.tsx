// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { flag } from 'country-emoji';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { countryCodes } from '@selfxyz/common/constants';
import { getCountryISO2 } from '@selfxyz/common/constants/countries';
import type { IdDocInput } from '@selfxyz/common/utils';
import { genMockIdDocAndInitDataParsing } from '@selfxyz/common/utils/passports';
import {
  BodyText,
  ButtonsContainer,
  Description,
  PrimaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { MockDataEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  borderColor,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import type { RootStackParamList } from '@/navigation';
import { storePassportData } from '@/providers/passportDataProvider';
import useUserStore from '@/stores/userStore';
import { extraYPadding } from '@/utils/styleUtils';

const CreateMockScreenDeepLink: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [selectedCountry, setSelectedCountry] = useState('USA');

  const {
    deepLinkName,
    deepLinkSurname,
    deepLinkNationality,
    deepLinkBirthDate,
    deepLinkGender,
  } = useUserStore(state => ({
    deepLinkName: state.deepLinkName,
    deepLinkSurname: state.deepLinkSurname,
    deepLinkNationality: state.deepLinkNationality,
    deepLinkBirthDate: state.deepLinkBirthDate,
    deepLinkGender: state.deepLinkGender,
  }));

  const handleGenerate = useCallback(async () => {
    const storeState = useUserStore.getState();
    const idDocInput: Partial<IdDocInput> = {
      idType: 'mock_passport',
      firstName: storeState.deepLinkName,
      lastName: storeState.deepLinkSurname,
      birthDate: storeState.deepLinkBirthDate,
      sex: storeState.deepLinkGender as 'M' | 'F',
      nationality: storeState.deepLinkNationality,
    };
    const passportData = genMockIdDocAndInitDataParsing(idDocInput);
    await storePassportData(passportData);
    navigation.navigate('ConfirmBelonging', {});
    useUserStore.getState().clearDeepLinkUserDetails();
  }, [navigation]);

  useEffect(() => {
    if (deepLinkNationality) {
      setSelectedCountry(deepLinkNationality);
    }
  }, [deepLinkNationality]);

  useEffect(() => {
    if (
      deepLinkName &&
      deepLinkSurname &&
      deepLinkNationality &&
      deepLinkBirthDate
    ) {
      setTimeout(() => {
        handleGenerate();
      }, 0);
    }
  }, [
    deepLinkName,
    deepLinkSurname,
    deepLinkNationality,
    deepLinkBirthDate,
    handleGenerate,
  ]);

  const { top, bottom } = useSafeAreaInsets();
  return (
    <YStack
      flex={1}
      backgroundColor={white}
      paddingTop={top}
      paddingBottom={bottom + extraYPadding}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack paddingHorizontal="$4" paddingBottom="$4" gap="$5">
          <YStack alignItems="center" marginBottom={'$5'} marginTop={'$14'}>
            <Title>Onboard your Developer ID</Title>
          </YStack>
          <XStack alignItems="center" justifyContent="space-between">
            <BodyText>Name</BodyText>
            <XStack
              alignItems="center"
              gap="$2"
              padding="$2"
              paddingHorizontal="$3"
              backgroundColor="$gray2"
              borderColor={borderColor}
              borderWidth={1}
              borderRadius="$4"
            >
              <Text fontSize="$4">{deepLinkName}</Text>
            </XStack>
          </XStack>
          <XStack alignItems="center" justifyContent="space-between">
            <BodyText>Surname</BodyText>
            <XStack
              alignItems="center"
              gap="$2"
              padding="$2"
              paddingHorizontal="$3"
              backgroundColor="$gray2"
              borderColor={borderColor}
              borderWidth={1}
              borderRadius="$4"
            >
              <Text fontSize="$4">{deepLinkSurname}</Text>
            </XStack>
          </XStack>
          <XStack alignItems="center" justifyContent="space-between">
            <BodyText>Birth Date (YYMMDD)</BodyText>
            <XStack
              alignItems="center"
              gap="$2"
              padding="$2"
              paddingHorizontal="$3"
              backgroundColor="$gray2"
              borderColor={borderColor}
              borderWidth={1}
              borderRadius="$4"
            >
              <Text fontSize="$4">{deepLinkBirthDate}</Text>
            </XStack>
          </XStack>

          <XStack alignItems="center" justifyContent="space-between">
            <BodyText>Gender</BodyText>
            <XStack
              alignItems="center"
              gap="$2"
              padding="$2"
              paddingHorizontal="$3"
              backgroundColor="$gray2"
              borderColor={borderColor}
              borderWidth={1}
              borderRadius="$4"
            >
              <Text fontSize="$4">{deepLinkGender?.toUpperCase()}</Text>
            </XStack>
          </XStack>

          <XStack alignItems="center" justifyContent="space-between">
            <BodyText>Nationality</BodyText>
            <XStack
              alignItems="center"
              gap="$2"
              padding="$2"
              paddingHorizontal="$3"
              backgroundColor="$gray2"
              borderColor={borderColor}
              borderWidth={1}
              borderRadius="$4"
            >
              <Text fontSize="$4">
                {countryCodes[
                  selectedCountry.toUpperCase() as keyof typeof countryCodes
                ] || selectedCountry}{' '}
                {getCountryISO2(selectedCountry)
                  ? flag(getCountryISO2(selectedCountry))
                  : ''}
              </Text>
            </XStack>
          </XStack>
        </YStack>
      </ScrollView>

      <YStack paddingHorizontal="$4" paddingBottom="$4">
        <ButtonsContainer>
          <PrimaryButton
            trackEvent={MockDataEvents.CREATE_DEEP_LINK}
            disabled={true}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color={black} style={{ marginRight: 8 }} />
              <Description style={{ color: black, fontWeight: 'bold' }}>
                Onboarding your Developer ID
              </Description>
            </View>
          </PrimaryButton>
        </ButtonsContainer>
      </YStack>
    </YStack>
  );
};

export default CreateMockScreenDeepLink;
