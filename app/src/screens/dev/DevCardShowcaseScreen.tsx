// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { ScrollView, Text, YStack } from 'tamagui';

import {
  black,
  slate100,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import IdCardLayout from '@/components/homescreen/IdCard';

const PASSPORT_MRZ =
  'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C36UTO7408122F3001019ZE184226B<<<<<10';

const ID_CARD_MRZ =
  'I<UTOD231458907<<<<<<<<<<<<<<<7408122F3001019UTO<<<<<<<<<<<6MUSTERFRAU<<ISOLDE<<<<<<<<<<';

const REAL_PASSPORT = {
  documentType: 'p',
  documentCategory: 'passport',
  mrz: PASSPORT_MRZ,
  dg2Hash: [1, 2, 3],
} as const;

const REAL_ID_CARD = {
  documentType: 'i',
  documentCategory: 'id_card',
  mrz: ID_CARD_MRZ,
  dg2Hash: [1, 2, 3],
} as const;

const DEV_PASSPORT = {
  ...REAL_PASSPORT,
  mock: true,
} as const;

const KYC_DOCUMENT = {
  documentType: 'i',
  documentCategory: 'id_card',
  serializedApplicantInfo: 'invalid-base64-for-dev-preview',
  idNumber: '1234567890',
} as const;

const CardSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <YStack gap={8}>
    <Text
      color={white}
      fontFamily={dinot}
      fontSize={16}
      textTransform="uppercase"
      letterSpacing={0.8}
    >
      {title}
    </Text>
    {children}
  </YStack>
);

const DevCardShowcaseScreen: React.FC = () => {
  return (
    <ScrollView
      backgroundColor={black}
      flex={1}
      contentContainerStyle={{ padding: 16, gap: 20 }}
    >
      <Text color={slate100} fontFamily={dinot} fontSize={14}>
        Use this screen to verify card header/logo behavior on small devices
        (for example iPhone SE).
      </Text>

      <CardSection title="Passport · Expanded">
        <IdCardLayout
          idDocument={REAL_PASSPORT as never}
          selected={true}
          hidden={false}
        />
      </CardSection>

      <CardSection title="Passport · Collapsed">
        <IdCardLayout
          idDocument={REAL_PASSPORT as never}
          selected={false}
          hidden={false}
        />
      </CardSection>

      <CardSection title="ID card · Expanded">
        <IdCardLayout
          idDocument={REAL_ID_CARD as never}
          selected={true}
          hidden={false}
        />
      </CardSection>

      <CardSection title="ID card · Collapsed">
        <IdCardLayout
          idDocument={REAL_ID_CARD as never}
          selected={false}
          hidden={false}
        />
      </CardSection>

      <CardSection title="Dev passport · Expanded">
        <IdCardLayout
          idDocument={DEV_PASSPORT as never}
          selected={true}
          hidden={false}
        />
      </CardSection>

      <CardSection title="Dev passport · Collapsed">
        <IdCardLayout
          idDocument={DEV_PASSPORT as never}
          selected={false}
          hidden={false}
        />
      </CardSection>

      <CardSection title="KYC card · Expanded">
        <IdCardLayout
          idDocument={KYC_DOCUMENT as never}
          selected={true}
          hidden={false}
        />
      </CardSection>

      <CardSection title="KYC card · Collapsed">
        <IdCardLayout
          idDocument={KYC_DOCUMENT as never}
          selected={false}
          hidden={false}
        />
      </CardSection>
    </ScrollView>
  );
};

export default DevCardShowcaseScreen;
