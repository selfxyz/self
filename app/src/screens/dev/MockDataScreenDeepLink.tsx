import { useNavigation } from '@react-navigation/native';
import { countryCodes } from '@selfxyz/common';
import { genMockIdDoc, IdDocInput } from '@selfxyz/common';
import { flag } from 'country-emoji';
import getCountryISO2 from 'country-iso-3-to-2';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import ButtonsContainer from '../../components/ButtonsContainer';
import { BodyText } from '../../components/typography/BodyText';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import { MockDataEvents } from '../../consts/analytics';
import { storePassportData } from '../../providers/passportDataProvider';
import useUserStore from '../../stores/userStore';
import { black, borderColor, white } from '../../utils/colors';

const MockDataScreenDeepLink: React.FC = () => {
  const navigation = useNavigation();

  const [selectedCountry, setSelectedCountry] = useState('USA');

  const {
    deepLinkName,
    deepLinkSurname,
    deepLinkNationality,
    deepLinkBirthDate,
  } = useUserStore(state => ({
    deepLinkName: state.deepLinkName,
    deepLinkSurname: state.deepLinkSurname,
    deepLinkNationality: state.deepLinkNationality,
    deepLinkBirthDate: state.deepLinkBirthDate,
  }));

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
  }, [deepLinkName, deepLinkSurname, deepLinkNationality, deepLinkBirthDate]);

  const handleGenerate = useCallback(async () => {
    const storeState = useUserStore.getState();
    const idDocInput: Partial<IdDocInput> = {
      idType: 'mock_passport',
      firstName: storeState.deepLinkName,
      lastName: storeState.deepLinkSurname,
      birthDate: storeState.deepLinkBirthDate,
    };
    const passportData = genMockIdDoc(idDocInput);
    await storePassportData(passportData);
    navigation.navigate('ConfirmBelongingScreen', {});
    useUserStore.getState().clearDeepLinkUserDetails();
  }, [navigation]);

  const { top, bottom } = useSafeAreaInsets();
  return (
    <YStack f={1} bg={white} pt={top} pb={bottom}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack px="$4" pb="$4" gap="$5">
          <YStack ai="center" mb={'$5'} mt={'$14'}>
            <Title>Onboard your Developer ID</Title>
          </YStack>
          <XStack ai="center" jc="space-between">
            <BodyText>Name</BodyText>
            <XStack
              ai="center"
              gap="$2"
              p="$2"
              px="$3"
              bg="$gray2"
              borderColor={borderColor}
              borderWidth={1}
              borderRadius="$4"
            >
              <Text fontSize="$4">{deepLinkName}</Text>
            </XStack>
          </XStack>
          <XStack ai="center" jc="space-between">
            <BodyText>Surname</BodyText>
            <XStack
              ai="center"
              gap="$2"
              p="$2"
              px="$3"
              bg="$gray2"
              borderColor={borderColor}
              borderWidth={1}
              borderRadius="$4"
            >
              <Text fontSize="$4">{deepLinkSurname}</Text>
            </XStack>
          </XStack>
          <XStack ai="center" jc="space-between">
            <BodyText>Birth Date (YYMMDD)</BodyText>
            <XStack
              ai="center"
              gap="$2"
              p="$2"
              px="$3"
              bg="$gray2"
              borderColor={borderColor}
              borderWidth={1}
              borderRadius="$4"
            >
              <Text fontSize="$4">{deepLinkBirthDate}</Text>
            </XStack>
          </XStack>

          <XStack ai="center" jc="space-between">
            <BodyText>Nationality</BodyText>
            <XStack
              ai="center"
              gap="$2"
              p="$2"
              px="$3"
              bg="$gray2"
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

      <YStack px="$4" pb="$4">
        <ButtonsContainer>
          <PrimaryButton
            trackEvent={MockDataEvents.CREATE_DEEP_LINK}
            disabled={true}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color={black} style={{ marginRight: 8 }} />
              <Description color={black} fontWeight="bold">
                Onboarding your Developer ID
              </Description>
            </View>
          </PrimaryButton>
        </ButtonsContainer>
      </YStack>
    </YStack>
  );
};

export default MockDataScreenDeepLink;
