// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { ScrollView, Text, YStack } from 'tamagui';

import type { PassportData } from '@selfxyz/common/types/passport';
import type { KycData } from '@selfxyz/common/utils/types';
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

// Dev fixtures — only fields used by the card renderer are meaningful;
// the rest are stubs to satisfy the type contract.
const STUB_CRYPTO = {
  dsc: '',
  eContent: [] as number[],
  signedAttr: [] as number[],
  encryptedDigest: [] as number[],
};

const REAL_PASSPORT: PassportData = {
  documentType: 'passport',
  documentCategory: 'passport',
  mock: false,
  mrz: PASSPORT_MRZ,
  dg2Hash: [1, 2, 3],
  ...STUB_CRYPTO,
};

const REAL_ID_CARD: PassportData = {
  documentType: 'id_card',
  documentCategory: 'id_card',
  mock: false,
  mrz: ID_CARD_MRZ,
  dg2Hash: [1, 2, 3],
  ...STUB_CRYPTO,
};

const DEV_PASSPORT: PassportData = {
  ...REAL_PASSPORT,
  mock: true,
};

const KYC_DOCUMENT: KycData = {
  documentType: 'id_card',
  documentCategory: 'kyc',
  mock: false,
  serializedApplicantInfo: 'invalid-base64-for-dev-preview',
  signature: '',
  pubkey: [],
};

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
          idDocument={REAL_PASSPORT}
          selected={true}
          hidden={false}
        />
      </CardSection>

      <CardSection title="Passport · Collapsed">
        <IdCardLayout
          idDocument={REAL_PASSPORT}
          selected={false}
          hidden={false}
        />
      </CardSection>

      <CardSection title="ID card · Expanded">
        <IdCardLayout
          idDocument={REAL_ID_CARD}
          selected={true}
          hidden={false}
        />
      </CardSection>

      <CardSection title="ID card · Collapsed">
        <IdCardLayout
          idDocument={REAL_ID_CARD}
          selected={false}
          hidden={false}
        />
      </CardSection>

      <CardSection title="Dev passport · Expanded">
        <IdCardLayout
          idDocument={DEV_PASSPORT}
          selected={true}
          hidden={false}
        />
      </CardSection>

      <CardSection title="Dev passport · Collapsed">
        <IdCardLayout
          idDocument={DEV_PASSPORT}
          selected={false}
          hidden={false}
        />
      </CardSection>

      <CardSection title="KYC card · Expanded">
        <IdCardLayout
          idDocument={KYC_DOCUMENT}
          selected={true}
          hidden={false}
        />
      </CardSection>

      <CardSection title="KYC card · Collapsed">
        <IdCardLayout
          idDocument={KYC_DOCUMENT}
          selected={false}
          hidden={false}
        />
      </CardSection>
    </ScrollView>
  );
};

export default DevCardShowcaseScreen;
