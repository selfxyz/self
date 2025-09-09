// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import getCountryISO2 from 'country-iso-3-to-2';
import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import * as CountryFlags from 'react-native-svg-circle-country-flags';
import { XStack, YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';

import { countryCodes } from '@selfxyz/common/constants';
import type { DocumentCategory } from '@selfxyz/common/types';
import {
  hasAnyValidRegisteredDocument,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import { PassportEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { SecondaryButton } from '@/components/buttons/SecondaryButton';
import { BodyText } from '@/components/typography/BodyText';
import { Title } from '@/components/typography/Title';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import analytics from '@/utils/analytics';
import { black, slate500, white } from '@/utils/colors';
import { sendCountrySupportNotification } from '@/utils/email';
import { notificationError } from '@/utils/haptic';

const { flush: flushAnalytics } = analytics();

type CountryFlagComponent = React.ComponentType<{
  width: number;
  height: number;
}>;
type CountryFlagsRecord = Record<string, CountryFlagComponent>;

type UnsupportedDocumentScreenRouteProp = RouteProp<
  {
    UnsupportedDocument: {
      countryCode: string | null;
      documentCategory: DocumentCategory | null;
    };
  },
  'UnsupportedDocument'
>;

interface UnsupportedDocumentScreenProps {
  route: UnsupportedDocumentScreenRouteProp;
}

const UnsupportedDocumentScreen: React.FC<UnsupportedDocumentScreenProps> = ({
  route,
}) => {
  const selfClient = useSelfClient();
  const navigateToLaunch = useHapticNavigation('Launch');
  const navigateToHome = useHapticNavigation('Home');

  const { countryName, country2AlphaCode, documentTypeText } = useMemo(() => {
    try {
      const countryCode = route.params?.countryCode;
      if (countryCode) {
        // Handle Germany corner case where country code is "D<<" instead of "DEU"
        let normalizedCountryCode = countryCode;
        if (countryCode === 'D<<') {
          normalizedCountryCode = 'DEU';
        }

        const iso2 = getCountryISO2(normalizedCountryCode);
        const extractedCode = iso2
          ? iso2.charAt(0).toUpperCase() + iso2.charAt(1).toLowerCase()
          : 'Unknown';
        const name =
          countryCodes[normalizedCountryCode as keyof typeof countryCodes];
        const docType =
          route.params?.documentCategory === 'id_card'
            ? 'ID Cards'
            : 'Passports';
        return {
          countryName: name,
          country2AlphaCode: extractedCode,
          documentTypeText: docType,
        };
      }
    } catch (error) {
      console.error('Error extracting country from passport data:', error);
    }
    const docType =
      route.params?.documentCategory === 'id_card' ? 'ID Cards' : 'Passports';
    return {
      countryName: 'Unknown',
      country2AlphaCode: 'Unknown',
      documentTypeText: docType,
    };
  }, [route.params?.documentCategory, route.params?.countryCode]);

  // Get country flag component dynamically
  const getCountryFlag = (code: string) => {
    try {
      const FlagComponent = (CountryFlags as unknown as CountryFlagsRecord)[
        code.toUpperCase()
      ];
      if (FlagComponent) {
        return FlagComponent;
      }
    } catch (error) {
      console.error('Error getting country flag:', error);
      return null;
    }
  };

  const CountryFlagComponent = getCountryFlag(country2AlphaCode);

  const onDismiss = async () => {
    const hasValidDocument = await hasAnyValidRegisteredDocument(selfClient);
    if (hasValidDocument) {
      navigateToHome();
    } else {
      navigateToLaunch();
    }
  };

  const onNotifyMe = async () => {
    try {
      await sendCountrySupportNotification({
        countryName,
        countryCode:
          country2AlphaCode !== 'Unknown' ? country2AlphaCode : undefined,
        documentCategory: route.params?.documentCategory ?? '',
      });
    } catch (error) {
      console.error('Failed to open email client:', error);
    }
  };

  useEffect(() => {
    notificationError();
    // error screen, flush analytics
    flushAnalytics();
  }, []);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={white}>
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          marginTop={100}
        >
          <XStack
            justifyContent="center"
            alignItems="center"
            marginBottom={20}
            gap={12}
          >
            {CountryFlagComponent && (
              <View style={{ alignItems: 'center' }}>
                <CountryFlagComponent width={60} height={60} />
              </View>
            )}
          </XStack>
          <Title
            fontSize={32}
            textAlign="center"
            color={black}
            marginBottom={16}
          >
            Coming Soon
          </Title>
          <BodyText
            fontSize={17}
            textAlign="center"
            color={black}
            marginBottom={10}
            paddingHorizontal={10}
          >
            We're working to roll out support for {documentTypeText} in{' '}
            {countryName}.
          </BodyText>
          <BodyText
            fontSize={17}
            textAlign="center"
            color={slate500}
            marginBottom={40}
            paddingHorizontal={10}
          >
            Sign up for live updates.
          </BodyText>
        </YStack>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        gap={16}
        backgroundColor={white}
        paddingHorizontal={20}
        paddingVertical={20}
      >
        <PrimaryButton
          onPress={onNotifyMe}
          trackEvent={PassportEvents.NOTIFY_UNSUPPORTED_PASSPORT}
        >
          Sign up for updates
        </PrimaryButton>
        <SecondaryButton
          trackEvent={PassportEvents.DISMISS_UNSUPPORTED_PASSPORT}
          onPress={onDismiss}
        >
          Dismiss
        </SecondaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default UnsupportedDocumentScreen;
