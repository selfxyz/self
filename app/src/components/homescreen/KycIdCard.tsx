// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Image, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import { deserializeApplicantInfo } from '@selfxyz/common';
import { commonNames } from '@selfxyz/common/constants/countries';
import type { KycData } from '@selfxyz/common/utils/types';
import { RoundFlag } from '@selfxyz/mobile-sdk-alpha/components';
import { white } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot, plexMono } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import CardBackgroundId1 from '@/assets/images/card_background_id1.png';
import SelfLogoPending from '@/assets/images/self_logo_pending.svg';
import { cardStyles } from '@/components/homescreen/cardStyles';
import { useCardDimensions } from '@/hooks/useCardDimensions';

interface KycIdCardProps {
  idDocument: KycData;
  selected: boolean;
  hidden: boolean;
}

/**
 * Maps KYC idType to display title.
 * idType values from Sumsub: "drivers_licence", "passport", "NATIONAL ID", etc.
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
 * Derives a demonym-like adjective from the country code.
 * Falls back to the country code if no mapping found.
 */
function getCountryAdjective(countryCode: string): string {
  const name = commonNames[countryCode as keyof typeof commonNames];
  if (!name) return countryCode;

  const demonyms: Record<string, string> = {
    USA: 'US',
    GBR: 'UK',
    CAN: 'CANADIAN',
    AUS: 'AUSTRALIAN',
    IND: 'INDIAN',
    DEU: 'GERMAN',
    FRA: 'FRENCH',
    JPN: 'JAPANESE',
    KOR: 'KOREAN',
    BRA: 'BRAZILIAN',
    MEX: 'MEXICAN',
    ITA: 'ITALIAN',
    ESP: 'SPANISH',
    NLD: 'DUTCH',
    PRT: 'PORTUGUESE',
    CHN: 'CHINESE',
    RUS: 'RUSSIAN',
    KEN: 'KENYAN',
    NGA: 'NIGERIAN',
    ZAF: 'SOUTH AFRICAN',
    SGP: 'SINGAPOREAN',
    MYS: 'MALAYSIAN',
    PHL: 'PHILIPPINE',
    IDN: 'INDONESIAN',
    THA: 'THAI',
    VNM: 'VIETNAMESE',
    ARE: 'UAE',
    SAU: 'SAUDI',
    EGY: 'EGYPTIAN',
    TUR: 'TURKISH',
    POL: 'POLISH',
    SWE: 'SWEDISH',
    NOR: 'NORWEGIAN',
    DNK: 'DANISH',
    FIN: 'FINNISH',
    CHE: 'SWISS',
    AUT: 'AUSTRIAN',
    BEL: 'BELGIAN',
    IRL: 'IRISH',
    NZL: 'NEW ZEALAND',
    ARG: 'ARGENTINE',
    COL: 'COLOMBIAN',
    PER: 'PERUVIAN',
    CHL: 'CHILEAN',
  };

  return demonyms[countryCode] || name.toUpperCase();
}

/**
 * KYC document card - matches IdCard design exactly but shows "STANDARD" badge.
 * Used for documents verified through Sumsub KYC flow (drivers license, etc.).
 */
const KycIdCard: FC<KycIdCardProps> = ({
  idDocument,
  selected,
  hidden: _hidden,
}) => {
  // Extract KYC fields from serialized applicant info with error handling
  let country = '';
  let idType = '';
  let idNumber = '';

  try {
    const applicantInfo = deserializeApplicantInfo(
      idDocument.serializedApplicantInfo,
    );
    country = applicantInfo.country || '';
    idType = applicantInfo.idType || '';
    idNumber = applicantInfo.idNumber || '';
  } catch (error) {
    console.error(
      '[KycIdCard] Failed to deserialize applicant info, using fallback values:',
      error,
    );
    // Fallback to safe defaults - component will render generic "ID CARD" display
  }

  const docTitle = getKycDocTitle(idType);
  const countryAdj = getCountryAdjective(country);

  const {
    cardWidth,
    cardHeight,
    borderRadius,
    scale,
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

  return (
    <YStack width="100%" alignItems="center" justifyContent="center">
      <YStack
        width={cardWidth}
        height={cardHeight}
        borderRadius={borderRadius}
        overflow="hidden"
        backgroundColor="#000000"
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.25}
        shadowRadius={14}
        elevation={8}
        marginBottom={8 * scale}
        alignItems="stretch"
      >
        {/* Header Section - Dark gradient (same as IdCard) */}
        <View style={{ width: '100%', height: headerHeight }}>
          <LinearGradient
            colors={['#000000', '#343434']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flex: 1,
              paddingHorizontal: figmaPadding,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Logo + Text */}
            <XStack alignItems="center" gap={headerGap} flex={1}>
              {/* Country flag */}
              <RoundFlag countryCode={country} size={logoSize} />

              {/* Text container */}
              <YStack gap={2 * scale}>
                <Text
                  fontFamily={dinot}
                  fontSize={fontSize.header}
                  fontWeight="500"
                  color={white}
                  textTransform="uppercase"
                  lineHeight={fontSize.header * 1.1}
                >
                  {headerTitle}
                </Text>
                <Text
                  fontFamily={dinot}
                  fontSize={fontSize.subtitle}
                  color="#9193A2"
                  letterSpacing={0.7}
                  textTransform="uppercase"
                >
                  {subtitleText}
                </Text>
              </YStack>
            </XStack>

            {/* Self logo on right */}
            <SelfLogoPending
              width={logoSize}
              height={logoSize}
              style={{ flexShrink: 0 }}
            />
          </LinearGradient>
        </View>

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
            <XStack
              position="absolute"
              bottom={padding}
              left={padding}
              right={padding}
              justifyContent="space-between"
              alignItems="flex-end"
            >
              {/* Bottom Left: ID + Document Label */}
              <YStack gap={4 * scale}>
                {truncatedId ? (
                  <Text
                    fontFamily={plexMono}
                    fontSize={fontSize.bottomId}
                    color={white}
                  >
                    {truncatedId}
                  </Text>
                ) : null}
                <Text
                  fontFamily={dinot}
                  fontSize={fontSize.bottomLabel}
                  fontWeight="500"
                  color={white}
                  textTransform="uppercase"
                  letterSpacing={0.6}
                >
                  {bottomLabel}
                </Text>
              </YStack>

              {/* STANDARD Badge - KYC documents always show STANDARD */}
              <YStack
                backgroundColor="rgba(0, 0, 0, 0.5)"
                borderRadius={30 * scale}
                paddingHorizontal={padding * 0.6}
                paddingVertical={padding * 0.3}
              >
                <Text
                  fontFamily={dinot}
                  fontSize={fontSize.badge}
                  fontWeight="500"
                  color={white}
                  textTransform="uppercase"
                  letterSpacing={0.6}
                >
                  STANDARD
                </Text>
              </YStack>
            </XStack>
          </YStack>
        )}
      </YStack>
    </YStack>
  );
};

export default KycIdCard;
