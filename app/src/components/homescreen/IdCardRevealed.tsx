// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Dimensions } from 'react-native';
import { Separator, Text, XStack, YStack } from 'tamagui';

import type { AadhaarData } from '@selfxyz/common';
import type { PassportData } from '@selfxyz/common/types/passport';
import { isAadhaarDocument, isMRZDocument } from '@selfxyz/common/utils/types';
import {
  black,
  separatorColor,
  slate100,
  slate300,
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
                {isMRZDocument(idDocument) &&
                idDocument.documentCategory === 'passport'
                  ? 'Passport'
                  : isAadhaarDocument(idDocument)
                    ? 'Aadhaar'
                    : 'ID Card'}
              </Text>
              <Text
                fontSize={revealedFontSize.small}
                color={slate400}
                fontFamily={dinot}
              >
                Verified{' '}
                {isMRZDocument(idDocument) &&
                idDocument.documentCategory === 'passport'
                  ? 'Biometric Passport'
                  : isAadhaarDocument(idDocument)
                    ? 'Aadhaar Document'
                    : 'Biometric ID Card'}
              </Text>
            </YStack>
          </XStack>
          <XStack flex={1} justifyContent="flex-end">
            {idDocument.mock && (
              <YStack
                marginTop={revealedPadding / 4}
                borderWidth={1}
                borderColor={slate300}
                borderRadius={100}
                paddingHorizontal={revealedPadding / 2}
                alignSelf="flex-start"
                backgroundColor={slate100}
                paddingVertical={revealedPadding / 8}
              >
                <Text
                  fontSize={revealedFontSize.xsmall}
                  color={slate400}
                  fontFamily={dinot}
                  letterSpacing={revealedFontSize.xsmall * 0.15}
                >
                  DEVELOPER
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
                  value={docAttributes.nationalitySlice}
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
                  value={docAttributes.issuingStateSlice}
                />
              </YStack>
              <YStack flex={1} />
              <YStack flex={1} />
            </XStack>
          </YStack>
        </XStack>

        {/* Footer Section - MRZ */}
        {isMRZDocument(idDocument) && idDocument.mrz && (
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
        {isAadhaarDocument(idDocument) && (
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
