// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useMemo } from 'react';
import { XStack, YStack } from 'tamagui';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { countryCodes } from '@selfxyz/common/constants';
import {
  BodyText,
  PrimaryButton,
  RoundFlag,
  SecondaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { PassportEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import useHapticNavigation from '@/hooks/useHapticNavigation';
import { notificationError } from '@/integrations/haptics';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { SharedRoutesParamList } from '@/navigation/types';
import { flush as flushAnalytics } from '@/services/analytics';
import { sendCountrySupportNotification } from '@/services/email';

type ComingSoonScreenProps = NativeStackScreenProps<
  SharedRoutesParamList,
  'ComingSoon'
>;

const ComingSoonScreen: React.FC<ComingSoonScreenProps> = ({ route }) => {
  const navigateToHome = useHapticNavigation('Home');

  const { countryName, countryCode, documentTypeText } = useMemo(() => {
    try {
      const routeCountryCode = route.params?.countryCode;
      if (routeCountryCode) {
        // Handle Germany corner case where country code is "D<<" instead of "DEU"
        const normalizedCountryCode =
          routeCountryCode === 'D<<' ? 'DEU' : routeCountryCode;
        const name =
          countryCodes[normalizedCountryCode as keyof typeof countryCodes];

        let docType = '';
        if (route.params?.documentCategory === 'id_card') {
          docType = 'ID Cards';
        } else if (route.params?.documentCategory === 'passport') {
          docType = 'Passports';
        }

        return {
          countryName: name,
          countryCode: normalizedCountryCode,
          documentTypeText: docType,
        };
      }
    } catch (error) {
      console.error('Error extracting country from passport data:', error);
    }

    let docType = '';
    if (route.params?.documentCategory === 'id_card') {
      docType = 'ID Cards';
    } else if (route.params?.documentCategory === 'passport') {
      docType = 'Passports';
    }

    return {
      countryName: 'Unknown',
      countryCode: 'Unknown',
      documentTypeText: docType,
    };
  }, [route.params?.documentCategory, route.params?.countryCode]);

  const onDismiss = async () => {
    navigateToHome();
  };

  const onNotifyMe = async () => {
    try {
      await sendCountrySupportNotification({
        countryName,
        countryCode: countryCode !== 'Unknown' ? countryCode : '',
        documentCategory: route.params?.documentCategory,
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
            {countryCode !== 'Unknown' && (
              <RoundFlag countryCode={countryCode} size={60} />
            )}
          </XStack>
          <Title
            style={{
              fontSize: 32,
              textAlign: 'center',
              color: black,
              marginBottom: 16,
            }}
          >
            Coming Soon
          </Title>
          <BodyText
            style={{
              fontSize: 17,
              textAlign: 'center',
              color: black,
              marginBottom: 10,
              paddingHorizontal: 10,
            }}
          >
            {documentTypeText
              ? `We're working to roll out support for ${documentTypeText} in ${countryName}.`
              : `We're working to roll out support in ${countryName}.`}
          </BodyText>
          <BodyText
            style={{
              fontSize: 17,
              textAlign: 'center',
              color: slate500,
              marginBottom: 40,
              paddingHorizontal: 10,
            }}
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
          trackEvent={PassportEvents.NOTIFY_COMING_SOON}
        >
          Sign up for updates
        </PrimaryButton>
        <SecondaryButton
          trackEvent={PassportEvents.DISMISS_COMING_SOON}
          onPress={onDismiss}
        >
          Dismiss
        </SecondaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default ComingSoonScreen;
