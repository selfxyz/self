// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import type { PassportData } from '@selfxyz/common/types/passport';
import type { KycData } from '@selfxyz/common/utils/types';
import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import EmptyIdCard from '@/components/homescreen/EmptyIdCard';
import ExpiredIdCard from '@/components/homescreen/ExpiredIdCard';
import IdCardLayout from '@/components/homescreen/IdCard';
import PendingIdCard from '@/components/homescreen/PendingIdCard';
import UnregisteredIdCard from '@/components/homescreen/UnregisteredIdCard';

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

/**
 * Build a valid 88-char passport MRZ (2x44 TD3 format).
 * Check digits are placeholder values — only visual rendering matters here.
 */
function buildPassportMRZ(opts: {
  issuingState: string;
  surname: string;
  givenNames: string;
  passportNo: string;
  nationality: string;
  dob: string; // YYMMDD
  sex: string;
  expiry: string; // YYMMDD
}): string {
  const nameField = `${opts.surname}<<${opts.givenNames}`;
  const line1 = `P<${opts.issuingState}${nameField}`.padEnd(44, '<');
  const line2 =
    opts.passportNo.padEnd(9, '<') +
    '1' + // check digit
    opts.nationality +
    opts.dob +
    '1' + // check digit
    opts.sex +
    opts.expiry +
    '1' + // check digit
    '<<<<<<<<<<<<<<' + // optional data (14)
    '0' + // check digit
    '4'; // overall check
  return line1 + line2;
}

/**
 * Build a base64-encoded serializedApplicantInfo string that
 * `deserializeApplicantInfo` can parse. Field layout matches
 * common/src/utils/kyc/constants.ts.
 */
function buildMockSerializedApplicantInfo(opts: {
  country: string;
  idType: string;
  idNumber: string;
  fullName: string;
  dob: string; // YYYYMMDD
}): string {
  const pad = (s: string, len: number) => s.padEnd(len, '\0');
  const data =
    pad(opts.country, 3) + // KYC_COUNTRY_LENGTH
    pad(opts.idType, 27) + // KYC_ID_TYPE_LENGTH
    pad(opts.idNumber, 32) + // KYC_ID_NUMBER_LENGTH
    pad('20200101', 8) + // issuanceDate
    pad('20290101', 8) + // expiryDate
    pad(opts.fullName, 64) + // KYC_FULL_NAME_LENGTH
    pad(opts.dob, 8) + // KYC_DOB_LENGTH
    pad('', 32) + // photoHash
    pad('', 12) + // phoneNumber
    pad('F', 1) + // gender
    pad('', 100); // address + padding
  return Buffer.from(data).toString('base64');
}

// --- Mock passport documents ---

const MOCK_REAL_PASSPORT_USA: PassportData = {
  documentType: 'passport',
  documentCategory: 'passport',
  mock: false,
  mrz: buildPassportMRZ({
    issuingState: 'USA',
    surname: 'SMITH',
    givenNames: 'JOHN',
    passportNo: 'AB1234567',
    nationality: 'USA',
    dob: '950101',
    sex: 'M',
    expiry: '301231',
  }),
  dg2Hash: [1, 2, 3], // triggers HI-SECURITY badge
  dsc: '',
  eContent: [],
  signedAttr: [],
  encryptedDigest: [],
};

const MOCK_REAL_PASSPORT_GBR: PassportData = {
  documentType: 'passport',
  documentCategory: 'passport',
  mock: false,
  mrz: buildPassportMRZ({
    issuingState: 'GBR',
    surname: 'JOHNSON',
    givenNames: 'SARAH',
    passportNo: 'CD9876543',
    nationality: 'GBR',
    dob: '000115',
    sex: 'F',
    expiry: '310701',
  }),
  dsc: '',
  eContent: [],
  signedAttr: [],
  encryptedDigest: [], // no dg2Hash → LOW-SECURITY
};

const MOCK_DEV_PASSPORT: PassportData = {
  documentType: 'mock_passport',
  documentCategory: 'passport',
  mock: true,
  mrz: buildPassportMRZ({
    issuingState: 'USA',
    surname: 'DEVELOPER',
    givenNames: 'MOCK',
    passportNo: 'DEV000001',
    nationality: 'USA',
    dob: '900601',
    sex: 'M',
    expiry: '351231',
  }),
  dsc: '',
  eContent: [],
  signedAttr: [],
  encryptedDigest: [],
};

// --- Mock KYC documents ---

const MOCK_KYC_DRIVERS_LICENSE: KycData = {
  documentType: 'drivers_licence',
  documentCategory: 'kyc',
  mock: false,
  serializedApplicantInfo: buildMockSerializedApplicantInfo({
    country: 'USA',
    idType: 'drivers_licence',
    idNumber: 'DL123456789',
    fullName: 'Jane Smith',
    dob: '19950515',
  }),
  signature: '',
  pubkey: [],
};

const MOCK_KYC_NATIONAL_ID: KycData = {
  documentType: 'drivers_licence',
  documentCategory: 'kyc',
  mock: false,
  serializedApplicantInfo: buildMockSerializedApplicantInfo({
    country: 'DEU',
    idType: 'NATIONAL ID',
    idNumber: 'NID987654321',
    fullName: 'Hans Mueller',
    dob: '19880312',
  }),
  signature: '',
  pubkey: [],
};

// ---------------------------------------------------------------------------
// Section label component
// ---------------------------------------------------------------------------

const SectionLabel: React.FC<{ children: string }> = ({ children }) => (
  <Text
    fontFamily={dinot}
    fontSize={13}
    fontWeight="600"
    color="#999"
    letterSpacing={1}
    textTransform="uppercase"
    paddingLeft={4}
    marginTop={12}
  >
    {children}
  </Text>
);

const CardLabel: React.FC<{ children: string }> = ({ children }) => (
  <Text fontFamily={dinot} fontSize={12} color="#666" paddingLeft={4}>
    {children}
  </Text>
);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const noop = () => Alert.alert('Dev', 'Button pressed');

const DevCardScreen: React.FC = () => {
  const [expanded, setExpanded] = useState(true);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <YStack padding={16} gap={8}>
        {/* Toggle */}
        <XStack gap={8}>
          <YStack
            backgroundColor={expanded ? black : white}
            borderRadius={8}
            paddingVertical={8}
            paddingHorizontal={16}
            onPress={() => setExpanded(true)}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text
              fontFamily={dinot}
              fontSize={14}
              color={expanded ? white : black}
            >
              Expanded
            </Text>
          </YStack>
          <YStack
            backgroundColor={!expanded ? black : white}
            borderRadius={8}
            paddingVertical={8}
            paddingHorizontal={16}
            onPress={() => setExpanded(false)}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text
              fontFamily={dinot}
              fontSize={14}
              color={!expanded ? white : black}
            >
              Collapsed
            </Text>
          </YStack>
        </XStack>

        {/* ---- State cards ---- */}
        <SectionLabel>State Cards</SectionLabel>

        <CardLabel>EmptyIdCard</CardLabel>
        <EmptyIdCard onRegisterPress={noop} />

        <CardLabel>PendingIdCard</CardLabel>
        <PendingIdCard onClick={noop} />

        <CardLabel>ExpiredIdCard</CardLabel>
        <ExpiredIdCard />

        <CardLabel>UnregisteredIdCard</CardLabel>
        <UnregisteredIdCard onRegisterPress={noop} />

        {/* ---- Passport cards ---- */}
        <SectionLabel>Passport Cards</SectionLabel>

        <CardLabel>Real US Passport (HI-SECURITY)</CardLabel>
        <IdCardLayout
          idDocument={MOCK_REAL_PASSPORT_USA}
          selected={expanded}
          hidden={true}
        />

        <CardLabel>Real GBR Passport (LOW-SECURITY)</CardLabel>
        <IdCardLayout
          idDocument={MOCK_REAL_PASSPORT_GBR}
          selected={expanded}
          hidden={true}
        />

        <CardLabel>Dev Passport (mock)</CardLabel>
        <IdCardLayout
          idDocument={MOCK_DEV_PASSPORT}
          selected={expanded}
          hidden={true}
        />

        <CardLabel>Real US Passport — revealed</CardLabel>
        <IdCardLayout
          idDocument={MOCK_REAL_PASSPORT_USA}
          selected={true}
          hidden={false}
        />

        {/* ---- KYC cards ---- */}
        <SectionLabel>KYC Cards</SectionLabel>

        <CardLabel>KYC Drivers License (USA)</CardLabel>
        <IdCardLayout
          idDocument={MOCK_KYC_DRIVERS_LICENSE}
          selected={expanded}
          hidden={true}
        />

        <CardLabel>KYC National ID (DEU)</CardLabel>
        <IdCardLayout
          idDocument={MOCK_KYC_NATIONAL_ID}
          selected={expanded}
          hidden={true}
        />
      </YStack>
    </ScrollView>
  );
};

export default DevCardScreen;
