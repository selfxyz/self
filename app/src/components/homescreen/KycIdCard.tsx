// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Dimensions, Image } from 'react-native';
import { Separator, Text, XStack, YStack } from 'tamagui';

import { deserializeApplicantInfo } from '@selfxyz/common';
import { commonNames } from '@selfxyz/common/constants/countries';
import type { KycData } from '@selfxyz/common/utils/types';
import { RoundFlag } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  separatorColor,
  slate100,
  slate400,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import CardBackgroundId1 from '@/assets/images/card_background_id1.png';
import LogoGray from '@/assets/images/logo_gray.svg';
import SelfLogoPending from '@/assets/images/self_logo_pending.svg';
import CardBottomContent from '@/components/homescreen/CardBottomContent';
import CardHeader from '@/components/homescreen/CardHeader';
import { cardStyles } from '@/components/homescreen/cardStyles';
import IdAttribute from '@/components/homescreen/IdAttribute';
import { useCardDimensions } from '@/hooks/useCardDimensions';
import {
  getCountryAdjective,
  getCountryDemonym,
} from '@/utils/countryDemonyms';

interface KycIdCardProps {
  idDocument: KycData;
  selected: boolean;
  hidden: boolean;
}

/**
 * Maps KYC idType to display title.
 * idType values: "drivers_licence", "passport", "NATIONAL ID", etc.
 */
function getKycDocTitle(idType: string): string {
  const normalized = idType
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .trim();
  if (normalized.includes('driver')) return 'DRIVERS LICENSE';
  if (normalized.includes('passport')) return 'PASSPORT';
  if (normalized.includes('national')) return 'NATIONAL ID';
  if (normalized.includes('residence')) return 'RESIDENCE PERMIT';
  return 'ID CARD';
}

/**
 * Format YYYYMMDD to DD/MM/YYYY for display.
 */
function formatKycDate(date: string): string {
  if (date.length !== 8) return date;
  return `${date.slice(6, 8)}/${date.slice(4, 6)}/${date.slice(0, 4)}`;
}

const KycIdCard: FC<KycIdCardProps> = ({ idDocument, selected, hidden }) => {
  // Extract KYC fields from serialized applicant info with error handling
  let country = '';
  let idType = '';
  let idNumber = '';
  let fullName = '';
  let dob = '';
  let gender = '';
  let expiryDate = '';
  let issuanceDate = '';

  try {
    const applicantInfo = deserializeApplicantInfo(
      idDocument.serializedApplicantInfo,
    );
    country = applicantInfo.country || '';
    idType = applicantInfo.idType || '';
    idNumber = applicantInfo.idNumber || '';
    fullName = applicantInfo.fullName || '';
    dob = applicantInfo.dob || '';
    gender = applicantInfo.gender || '';
    expiryDate = applicantInfo.expiryDate || '';
    issuanceDate = applicantInfo.issuanceDate || '';
  } catch (error) {
    console.error(
      '[KycIdCard] Failed to deserialize applicant info, using fallback values:',
      error,
    );
  }

  const docTitle = getKycDocTitle(idType);
  const countryAdj = getCountryAdjective(country, commonNames);

  const {
    cardWidth,
    cardHeight,
    borderRadius,
    headerHeight,
    figmaPadding,
    logoSize,
    headerGap,
    fontSize,
  } = useCardDimensions(selected);
  const padding = cardWidth * 0.04;

  // Get truncated ID for display (e.g., "0xD123..345")
  const getTruncatedId = (): string => {
    if (idNumber && idNumber.length > 10) {
      return `0x${idNumber.slice(0, 4)}..${idNumber.slice(-3)}`;
    }
    return idNumber ? `0x${idNumber}` : '';
  };

  const truncatedId = getTruncatedId();

  // Header title (e.g., "DRIVERS LICENSE")
  const headerTitle = docTitle;

  // Subtitle text (e.g., "VERIFIED US DRIVERS LICENSE")
  const subtitleText = `VERIFIED ${countryAdj} ${docTitle}`;

  // Bottom label (e.g., "US DRIVERS LICENSE")
  const bottomLabel = `${countryAdj} ${docTitle}`;

  // Revealed data view
  if (!hidden && selected) {
    const { width: screenWidth } = Dimensions.get('window');
    const revealedWidth = screenWidth * 0.95 - 16;
    const revealedHeight = revealedWidth * 0.645;
    const revealedBorderRadius = revealedWidth * 0.04;
    const revealedPadding = revealedWidth * 0.035;
    const revealedFontSize = {
      large: revealedWidth * 0.045,
      small: revealedWidth * 0.028,
    };
    const imageSize = {
      width: revealedWidth * 0.2,
      height: revealedWidth * 0.29,
    };
    const contentLeftOffset = imageSize.width + revealedPadding;
    const countryName = getCountryDemonym(country);

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
          {/* Header */}
          <XStack alignItems="center">
            <RoundFlag
              countryCode={country}
              size={revealedFontSize.large * 2}
            />
            <YStack marginLeft={revealedPadding}>
              <Text
                fontWeight="bold"
                fontFamily={dinot}
                fontSize={revealedFontSize.large * 1.4}
                color="black"
              >
                {docTitle}
              </Text>
              <Text
                fontSize={revealedFontSize.small}
                color={slate400}
                fontFamily={dinot}
              >
                Verified {countryName} {docTitle}
              </Text>
            </YStack>
          </XStack>

          <Separator
            backgroundColor={separatorColor}
            height={1}
            width={revealedWidth - 1}
            marginLeft={-revealedPadding}
            marginTop={revealedPadding}
          />

          {/* Attributes Grid */}
          <XStack height="60%" paddingVertical={revealedPadding}>
            <YStack
              width={imageSize.width}
              height={imageSize.height}
              backgroundColor={slate100}
              borderRadius={revealedBorderRadius * 0.5}
              justifyContent="center"
              alignItems="center"
              marginRight={revealedPadding}
            >
              <LogoGray
                width={imageSize.width * 0.5}
                height={imageSize.height * 0.5}
              />
            </YStack>

            <YStack
              flex={1}
              justifyContent="space-between"
              height={imageSize.height}
            >
              <XStack flex={1} gap={revealedPadding * 0.3}>
                <YStack flex={1}>
                  <IdAttribute name="TYPE" value={docTitle} />
                </YStack>
                <YStack flex={1}>
                  <IdAttribute name="CODE" value="SELF ID" />
                </YStack>
                <YStack flex={1}>
                  <IdAttribute name="DOC NO." value={idNumber} />
                </YStack>
              </XStack>
              <XStack flex={1} gap={revealedPadding * 0.3}>
                <YStack flex={2}>
                  <IdAttribute name="NAME" value={fullName} />
                </YStack>
                <YStack flex={1}>
                  <IdAttribute name="SEX" value={gender} />
                </YStack>
              </XStack>
              <XStack flex={1} gap={revealedPadding * 0.3}>
                <YStack flex={1}>
                  <IdAttribute name="NATIONALITY" value={countryName} />
                </YStack>
                <YStack flex={1}>
                  <IdAttribute name="DOB" value={formatKycDate(dob)} />
                </YStack>
                <YStack flex={1}>
                  <IdAttribute
                    name="EXPIRY DATE"
                    value={formatKycDate(expiryDate)}
                  />
                </YStack>
              </XStack>
              <XStack flex={1} gap={revealedPadding * 0.3}>
                <YStack flex={1}>
                  <IdAttribute
                    name="ISSUE DATE"
                    value={formatKycDate(issuanceDate)}
                  />
                </YStack>
                <YStack flex={1} />
                <YStack flex={1} />
              </XStack>
            </YStack>
          </XStack>

          {/* Footer */}
          <XStack
            alignItems="center"
            backgroundColor={slate100}
            borderRadius={revealedBorderRadius / 3}
            paddingHorizontal={revealedPadding / 2}
            paddingVertical={revealedPadding / 4}
            minHeight={revealedFontSize.large * 1.5}
          >
            <XStack width={contentLeftOffset} alignItems="center">
              <LogoGray
                width={revealedFontSize.large}
                height={revealedFontSize.large}
              />
            </XStack>
          </XStack>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack width="100%" alignItems="center" justifyContent="center">
      <YStack
        width={cardWidth}
        height={cardHeight}
        borderRadius={borderRadius}
        overflow="hidden"
        backgroundColor={black}
        shadowColor={black}
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.25}
        shadowRadius={14}
        elevation={8}
        marginBottom={8}
        alignItems="stretch"
      >
        {/* Header Section - Dark gradient (same as IdCard) */}
        <CardHeader
          variant="gradient"
          title={headerTitle}
          subtitle={subtitleText}
          headerHeight={headerHeight}
          figmaPadding={figmaPadding}
          headerGap={headerGap}
          fontSize={fontSize}
          logo={<RoundFlag countryCode={country} size={logoSize} />}
          rightElement={<SelfLogoPending width={logoSize} height={logoSize} />}
        />

        {/* Body Section - Colorful wave pattern (same as IdCard real documents) */}
        {selected && (
          <YStack style={cardStyles.body}>
            {/* Pre-composited background image (colorful gradient + chrome wave) */}
            <Image
              source={CardBackgroundId1}
              style={cardStyles.backgroundImage}
              resizeMode="cover"
            />

            {/* Bottom content: Left text + Right badge */}
            <CardBottomContent
              truncatedId={truncatedId}
              bottomLabel={bottomLabel}
              badges={[
                {
                  text: 'STANDARD',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  textColor: white,
                },
              ]}
              padding={padding}
              fontSize={fontSize}
            />
          </YStack>
        )}
      </YStack>
    </YStack>
  );
};

export default KycIdCard;
