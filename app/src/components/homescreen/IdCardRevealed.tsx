// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Dimensions } from 'react-native';
import { Separator, Text, XStack, YStack } from 'tamagui';

import type { AadhaarData } from '@selfxyz/common';
import { commonNames } from '@selfxyz/common/constants';
import type { PassportData } from '@selfxyz/common/types/passport';
import { isAadhaarDocument, isMRZDocument } from '@selfxyz/common/utils/types';
import {
  black,
  separatorColor,
  slate100,
  slate400,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot, plexMono } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import AadhaarIcon from '@selfxyz/mobile-sdk-alpha/svgs/icons/aadhaar.svg';
import EPassport from '@selfxyz/mobile-sdk-alpha/svgs/icons/epassport.svg';

import LogoGray from '@/assets/images/logo_gray.svg';
import IdAttribute from '@/components/homescreen/IdAttribute';
import { SvgXml } from '@/components/homescreen/SvgXmlWrapper';
import {
  formatDateFromYYMMDD,
  getDocumentAttributes,
  getNameAndSurname,
} from '@/utils/documentAttributes';

const logoSvg = `<svg width="47" height="46" viewBox="0 0 47 46" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.7814 13.2168C12.7814 12.7057 13.1992 12.2969 13.7214 12.2969H30.0017L42.5676 0H11.2408L0 11.0001V29.0973H12.7814V13.2104V13.2168Z" fill="white"/>
<path d="M34.2186 16.8515V32.3552C34.2186 32.8663 33.8008 33.2751 33.2786 33.2751H17.4357L4.43236 46H35.7592L47 34.9999V16.8579H34.2186V16.8515Z" fill="white"/>
<path d="M28.9703 17.6525H18.0362V28.3539H28.9703V17.6525Z" fill="#00FFB6"/>
</svg>`;

/**
 * Resolve a 3-letter country code to its full country name.
 * Falls back to the code itself if no mapping exists.
 */
const getCountryName = (code: string): string => {
  if (!code) return '';
  const cleaned = code.toUpperCase().replace(/</g, '').trim();
  if (!cleaned) return '';
  return (commonNames as Record<string, string>)[cleaned] || cleaned;
};

const TEST_DATA_SUBTITLE = 'Sample test data. Not a valid document.';
const TEST_DATA_AUTHORITY = 'Self test issuer';
const TEST_DATA_FOOTER = 'SAMPLE - NOT A VALID DOCUMENT';

interface IdCardRevealedProps {
  idDocument: PassportData | AadhaarData;
}

const IdCardRevealed: FC<IdCardRevealedProps> = ({ idDocument }) => {
  const { width: screenWidth } = Dimensions.get('window');
  const revealedWidth = screenWidth * 0.95 - 16;
  const revealedHeight = revealedWidth * 0.645;
  const revealedBorderRadius = revealedWidth * 0.04;
  const revealedPadding = revealedWidth * 0.035;
  const revealedFontSize = {
    large: revealedWidth * 0.045,
    small: revealedWidth * 0.028,
    xsmall: revealedWidth * 0.022,
  };
  const imageSize = {
    width: revealedWidth * 0.2,
    height: revealedWidth * 0.29,
  };
  const contentLeftOffset = imageSize.width + revealedPadding;
  const docAttributes = getDocumentAttributes(idDocument);
  const nameData = getNameAndSurname(docAttributes.nameSlice);
  const isTestData = Boolean(idDocument.mock);
  const isPassport =
    isMRZDocument(idDocument) && idDocument.documentCategory === 'passport';
  const isAadhaar = isAadhaarDocument(idDocument);
  const documentLabel = isPassport
    ? 'Passport'
    : isAadhaar
      ? 'Aadhaar'
      : 'ID Card';
  const verifiedLabel = isPassport
    ? 'Biometric Passport'
    : isAadhaar
      ? 'Aadhaar Document'
      : 'Biometric ID Card';

  return (
    <YStack width="100%" alignItems="center" justifyContent="center">
      <YStack
        width={revealedWidth}
        height={revealedHeight}
        backgroundColor={white}
        borderRadius={revealedBorderRadius}
        borderWidth={0.75}
        borderColor={separatorColor}
        padding={revealedPadding}
        shadowColor={black}
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.1}
        shadowRadius={4}
        elevation={4}
        marginBottom={8}
        justifyContent="center"
      >
        {/* Header Section */}
        <XStack>
          <XStack alignItems="center">
            {isAadhaarDocument(idDocument) ? (
              <AadhaarIcon
                width={revealedFontSize.large * 3}
                height={revealedFontSize.large * 3 * 0.617}
              />
            ) : (
              <EPassport
                width={revealedFontSize.large * 3}
                height={revealedFontSize.large * 3 * 0.617}
              />
            )}
            <YStack marginLeft={imageSize.width - revealedFontSize.large * 3}>
              <Text
                fontWeight="bold"
                fontFamily={dinot}
                fontSize={revealedFontSize.large * 1.4}
                color="black"
              >
                {isTestData ? `Test ${documentLabel}` : documentLabel}
              </Text>
              <Text
                fontSize={revealedFontSize.small}
                color={slate400}
                fontFamily={dinot}
              >
                {isTestData ? TEST_DATA_SUBTITLE : `Verified ${verifiedLabel}`}
              </Text>
            </YStack>
          </XStack>
          <XStack flex={1} justifyContent="flex-end">
            {isTestData && (
              <YStack
                marginTop={revealedPadding / 4}
                borderRadius={100}
                paddingHorizontal={revealedPadding / 2}
                alignSelf="flex-start"
                backgroundColor={black}
                paddingVertical={revealedPadding / 8}
              >
                <Text
                  fontSize={revealedFontSize.xsmall}
                  color={white}
                  fontFamily={dinot}
                  fontWeight="bold"
                  letterSpacing={revealedFontSize.xsmall * 0.15}
                >
                  TEST DATA
                </Text>
              </YStack>
            )}
          </XStack>
        </XStack>

        <Separator
          backgroundColor={separatorColor}
          height={1}
          width={revealedWidth - 1}
          marginLeft={-revealedPadding}
          marginTop={revealedPadding}
        />

        {/* Main Content Section */}
        <XStack height="60%" paddingVertical={revealedPadding}>
          {/* Person Image Placeholder */}
          <YStack
            width={imageSize.width}
            height={imageSize.height}
            backgroundColor="#F5F5F5"
            borderRadius={revealedBorderRadius * 0.5}
            justifyContent="center"
            alignItems="center"
            marginRight={revealedPadding}
          >
            <SvgXml
              xml={logoSvg}
              width={imageSize.width * 0.6}
              height={imageSize.height * 0.6}
            />
          </YStack>

          {/* ID Attributes Grid */}
          <YStack
            flex={1}
            justifyContent="space-between"
            height={imageSize.height}
          >
            <XStack flex={1} gap={revealedPadding * 0.3}>
              <YStack flex={1}>
                <IdAttribute
                  name="TYPE"
                  value={
                    isMRZDocument(idDocument) &&
                    idDocument.documentCategory === 'passport'
                      ? 'PASSPORT'
                      : isAadhaarDocument(idDocument)
                        ? 'AADHAAR'
                        : 'ID CARD'
                  }
                />
              </YStack>
              <YStack flex={1}>
                <IdAttribute
                  name="CODE"
                  value={idDocument.mock ? 'SELF DEV' : 'SELF ID'}
                />
              </YStack>
              <YStack flex={1}>
                <IdAttribute name="DOC NO." value={docAttributes.passNoSlice} />
              </YStack>
            </XStack>
            <XStack flex={1} gap={revealedPadding * 0.3}>
              {isAadhaarDocument(idDocument) ? (
                <>
                  <YStack flex={2}>
                    <IdAttribute
                      name="NAME"
                      value={[...nameData.surname, ...nameData.names].join(' ')}
                    />
                  </YStack>
                  <YStack flex={1}>
                    <IdAttribute name="SEX" value={docAttributes.sexSlice} />
                  </YStack>
                </>
              ) : (
                <>
                  <YStack flex={1}>
                    <IdAttribute
                      name="SURNAME"
                      value={nameData.surname.join(' ')}
                    />
                  </YStack>
                  <YStack flex={1}>
                    <IdAttribute name="NAME" value={nameData.names.join(' ')} />
                  </YStack>
                  <YStack flex={1}>
                    <IdAttribute name="SEX" value={docAttributes.sexSlice} />
                  </YStack>
                </>
              )}
            </XStack>
            <XStack flex={1} gap={revealedPadding * 0.3}>
              <YStack flex={1}>
                <IdAttribute
                  name="NATIONALITY"
                  value={getCountryName(docAttributes.nationalitySlice)}
                />
              </YStack>
              <YStack flex={1}>
                <IdAttribute
                  name="DOB"
                  value={formatDateFromYYMMDD(docAttributes.dobSlice, true)}
                />
              </YStack>
              <YStack flex={1}>
                <IdAttribute
                  name="EXPIRY DATE"
                  value={formatDateFromYYMMDD(docAttributes.expiryDateSlice)}
                />
              </YStack>
            </XStack>
            <XStack flex={1} gap={revealedPadding * 0.3}>
              <YStack flex={1}>
                <IdAttribute
                  name="AUTHORITY"
                  value={
                    isTestData
                      ? TEST_DATA_AUTHORITY
                      : getCountryName(docAttributes.issuingStateSlice)
                  }
                />
              </YStack>
              <YStack flex={1} />
              <YStack flex={1} />
            </XStack>
          </YStack>
        </XStack>

        {isTestData && (
          <XStack
            alignItems="center"
            justifyContent="center"
            backgroundColor={slate100}
            borderRadius={revealedBorderRadius / 3}
            paddingHorizontal={revealedPadding / 2}
            paddingVertical={revealedPadding / 4}
            minHeight={revealedFontSize.xsmall * 2.5}
          >
            <Text
              fontSize={revealedFontSize.xsmall}
              letterSpacing={revealedFontSize.xsmall * 0.3}
              fontFamily={plexMono}
              color={slate400}
            >
              {TEST_DATA_FOOTER}
            </Text>
          </XStack>
        )}

        {/* Footer Section - MRZ */}
        {!isTestData && isMRZDocument(idDocument) && idDocument.mrz && (
          <XStack
            alignItems="center"
            backgroundColor={slate100}
            borderRadius={revealedBorderRadius / 3}
            paddingHorizontal={revealedPadding / 2}
            paddingVertical={revealedPadding / 4}
          >
            <XStack width={contentLeftOffset} alignItems="center">
              <LogoGray
                width={revealedFontSize.large}
                height={revealedFontSize.large}
              />
            </XStack>
            <YStack marginLeft={-revealedPadding / 2}>
              {idDocument.documentCategory === 'passport' ? (
                <>
                  <Text
                    fontSize={revealedFontSize.xsmall}
                    letterSpacing={revealedFontSize.xsmall * 0.1}
                    fontFamily={plexMono}
                    color={slate400}
                  >
                    {idDocument.mrz.slice(0, 44)}
                  </Text>
                  <Text
                    fontSize={revealedFontSize.xsmall}
                    letterSpacing={revealedFontSize.xsmall * 0.1}
                    fontFamily={plexMono}
                    color={slate400}
                  >
                    {idDocument.mrz.slice(44, 88)}
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    fontSize={revealedFontSize.xsmall}
                    letterSpacing={revealedFontSize.xsmall * 0.44}
                    fontFamily={plexMono}
                    color={slate400}
                  >
                    {idDocument.mrz.slice(0, 30)}
                  </Text>
                  <Text
                    fontSize={revealedFontSize.xsmall}
                    letterSpacing={revealedFontSize.xsmall * 0.44}
                    fontFamily={plexMono}
                    color={slate400}
                  >
                    {idDocument.mrz.slice(30, 60)}
                  </Text>
                  <Text
                    fontSize={revealedFontSize.xsmall}
                    letterSpacing={revealedFontSize.xsmall * 0.44}
                    fontFamily={plexMono}
                    color={slate400}
                  >
                    {idDocument.mrz.slice(60, 90)}
                  </Text>
                </>
              )}
            </YStack>
          </XStack>
        )}

        {/* Footer Section - Empty placeholder for Aadhaar */}
        {!isTestData && isAadhaar && (
          <XStack
            alignItems="center"
            backgroundColor={slate100}
            borderRadius={revealedBorderRadius / 3}
            paddingHorizontal={revealedPadding / 2}
            paddingVertical={revealedPadding / 4}
            minHeight={revealedFontSize.xsmall * 2.5}
          >
            <XStack width={contentLeftOffset} alignItems="center">
              <LogoGray
                width={revealedFontSize.large}
                height={revealedFontSize.large}
              />
            </XStack>
          </XStack>
        )}
      </YStack>
    </YStack>
  );
};

export default IdCardRevealed;
